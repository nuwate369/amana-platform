'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات خادمية لصفحة إصدارات التطبيقات.
 *
 * الرفع يمرّ من هنا (service role) لا من المتصفّح مباشرة، حتى تبقى مفاتيح
 * التخزين خادمية بالكامل. الملفّ يُرفع إلى مستودع `app-releases` العامّ ثم
 * يُسجَّل صفّه في `app_versions`؛ التطبيقات تقارن `version_code` عند الإقلاع.
 */

const BUCKET = 'app-releases';

export type ReleaseApp = 'passenger' | 'driver';

export interface ReleaseRow {
  id: string;
  app: ReleaseApp;
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  notes: string | null;
  mandatory: boolean;
  published: boolean;
  createdAt: string;
  /** عدد التثبيتات الأولى والتحديثات المسجَّلة لهذا الإصدار. */
  installs: number;
  updates: number;
  /** آراء التطبيق ككلّ (الظاهرة/الإجمالي) — التقييم يخصّ التطبيق لا رقم البناء. */
  reviewsVisible: number;
  reviewsTotal: number;
}

export interface ReleaseInput {
  app: ReleaseApp;
  versionCode: number;
  versionName: string;
  notes: string;
  mandatory: boolean;
  published: boolean;
  /**
   * رابط تنزيل الملفّ. إمّا ناتج الرفع المباشر إلى المستودع، أو رابط خارجي
   * تلصقه الإدارة (مفيد للملفّات التي تتجاوز حدّ التخزين).
   */
  downloadUrl: string;
}

/** يقرأ كل الإصدارات المسجَّلة، الأحدث أوّلًا. */
export async function listReleases(): Promise<ReleaseRow[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('app_versions')
    .select('id, app, version_code, version_name, download_url, notes, mandatory, published, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  // عدّ الضغطات لكل (تطبيق، رقم بناء) في استعلام واحد بدل استعلام لكل صفّ.
  const { data: hits } = await db.from('app_downloads').select('app, version_code, kind');
  const tally = new Map<string, { installs: number; updates: number }>();
  for (const h of hits ?? []) {
    const key = `${h.app}:${h.version_code}`;
    const acc = tally.get(key) ?? { installs: 0, updates: 0 };
    if (h.kind === 'update') acc.updates += 1;
    else acc.installs += 1;
    tally.set(key, acc);
  }

  // الآراء تخصّ التطبيق لا الإصدار، فنعدّها مرّة واحدة لكل تطبيق.
  const { data: revs } = await db.from('app_reviews').select('app, visible');
  const reviewTally = new Map<string, { shown: number; total: number }>();
  for (const r of revs ?? []) {
    const acc = reviewTally.get(r.app as string) ?? { shown: 0, total: 0 };
    acc.total += 1;
    if (r.visible) acc.shown += 1;
    reviewTally.set(r.app as string, acc);
  }

  return data.map((r) => ({
    id: r.id as string,
    app: r.app as ReleaseApp,
    versionCode: r.version_code as number,
    versionName: r.version_name as string,
    downloadUrl: r.download_url as string,
    notes: (r.notes as string | null) ?? null,
    mandatory: Boolean(r.mandatory),
    published: Boolean(r.published),
    createdAt: r.created_at as string,
    installs: tally.get(`${r.app}:${r.version_code}`)?.installs ?? 0,
    updates: tally.get(`${r.app}:${r.version_code}`)?.updates ?? 0,
    reviewsVisible: reviewTally.get(r.app as string)?.shown ?? 0,
    reviewsTotal: reviewTally.get(r.app as string)?.total ?? 0,
  }));
}

/**
 * رقم البناء المقترح للإصدار القادم = أعلى رقم مسجَّل + 1 (أو 1 إن لم يوجد).
 *
 * لكل تطبيق تسلسله المستقلّ، فرقم بناء الراكبة لا علاقة له برقم السائقة.
 */
export async function nextVersionCode(app: ReleaseApp): Promise<{
  code: number;
  name: string;
}> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('app_versions')
    .select('version_code, version_name')
    .eq('app', app)
    .eq('platform', 'android')
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  const code = ((data?.version_code as number | undefined) ?? 0) + 1;

  // اسم الإصدار مقترح برفع الرقم الأوسط (0.2.0 ← 0.3.0)، وهو العُرف حين يتغيّر
  // الكود الأصلي — وهي الحالة الوحيدة التي تستدعي تسجيل إصدار هنا أصلًا.
  const previous = (data?.version_name as string | undefined) ?? '';
  const parts = previous.split('.').map((n) => Number.parseInt(n, 10));
  const name =
    parts.length === 3 && parts.every(Number.isFinite)
      ? `${parts[0]}.${parts[1]! + 1}.0`
      : '0.1.0';

  return { code, name };
}

/**
 * يُصدر إذنًا مؤقّتًا لرفع الملفّ **من المتصفّح مباشرةً** إلى المستودع.
 *
 * لماذا لا يمرّ الملفّ عبر الخادم؟ لأنّ Server Actions محدودة بحجم بيانات صغير
 * (ميغابايت واحد افتراضيًّا)، وملفّ APK يقاس بعشرات أو مئات الميغابايت. الرفع
 * المباشر يتجاوز الخادم تمامًا، ويحافظ على مفتاح الخدمة خادميًّا لأنّ الإذن
 * المُصدَر صالح لمسار واحد ولمدّة محدودة.
 */
export async function createUploadTicket(
  app: ReleaseApp,
  versionCode: number,
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  if (!versionCode || versionCode < 1) {
    return { ok: false, error: 'رقم البناء (versionCode) غير صالح.' };
  }

  const db = getAdminSupabase();
  const path = `${app}/amana-${app}-${versionCode}.apk`;

  // نحذف أيّ ملفّ سابق بنفس المسار حتى لا يرفض الإذن الجديد الكتابة فوقه.
  await db.storage.from(BUCKET).remove([path]);

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: `تعذّر تجهيز الرفع: ${error?.message ?? 'خطأ غير معروف'}` };
  }

  return { ok: true, path, token: data.token };
}

/** الرابط العامّ لملفّ داخل المستودع بعد اكتمال رفعه. */
export async function publicUrlFor(path: string): Promise<string> {
  const db = getAdminSupabase();
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** يسجّل الإصدار بعد أن أصبح ملفّه متاحًا على رابط. */
export async function createRelease(
  input: ReleaseInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getAdminSupabase();

  if (!input.versionCode || input.versionCode < 1) {
    return { ok: false, error: 'رقم البناء (versionCode) غير صالح.' };
  }
  if (!input.versionName.trim()) {
    return { ok: false, error: 'اسم الإصدار مطلوب.' };
  }
  if (!input.downloadUrl.trim()) {
    return { ok: false, error: 'لا يوجد رابط تنزيل — ارفعي ملفًّا أو الصقي رابطًا.' };
  }

  const { error } = await db.from('app_versions').upsert(
    {
      app: input.app,
      platform: 'android',
      version_code: input.versionCode,
      version_name: input.versionName.trim(),
      download_url: input.downloadUrl.trim(),
      notes: input.notes.trim() || null,
      mandatory: input.mandatory,
      published: input.published,
    },
    { onConflict: 'app,platform,version_code' },
  );
  if (error) return { ok: false, error: `تعذّر حفظ الإصدار: ${error.message}` };

  if (input.published) await unpublishSiblings(input.app, input.versionCode);

  return { ok: true };
}

/**
 * إصدار منشور واحد لكل تطبيق.
 *
 * كانت كل الإصدارات تحمل شارة «منشور» معًا، فلا تدلّ على شيء: النظام يختار
 * أعلى رقم بناء بصمت، واللوحة تعرض ستّة صفوف متساوية. الآن النشر يُخفي ما
 * قبله، فتصبح الشارة إجابةً صادقة عن سؤال واحد: ماذا يصل المستخدمة الآن؟
 */
async function unpublishSiblings(app: ReleaseApp, keepVersionCode: number): Promise<void> {
  const db = getAdminSupabase();
  await db
    .from('app_versions')
    .update({ published: false })
    .eq('app', app)
    .eq('platform', 'android')
    .neq('version_code', keepVersionCode);
}

/** أحدث إصدار منشور لكل تطبيق — ما يصل المستخدمات فعلًا. */
export async function liveReleases(): Promise<Partial<Record<ReleaseApp, ReleaseRow>>> {
  const all = await listReleases();
  const live: Partial<Record<ReleaseApp, ReleaseRow>> = {};
  for (const r of all) {
    if (!r.published) continue;
    const current = live[r.app];
    if (!current || r.versionCode > current.versionCode) live[r.app] = r;
  }
  return live;
}

/**
 * التراجع إلى الإصدار السابق — شبكة الأمان حين يظهر عطل في المنشور.
 *
 * لا يحذف شيئًا: يُخفي الحالي ويُظهر أعلى إصدار أقدم منه. المستخدمات اللواتي
 * ثبّتن الجديد يبقى عندهنّ، لكن التنزيلات الجديدة ونافذة التحديث تعودان
 * للمستقرّ خلال ثوانٍ بدل انتظار بناء جديد.
 */
export async function rollbackRelease(
  app: ReleaseApp,
): Promise<{ ok: true; versionName: string } | { ok: false; error: string }> {
  const all = (await listReleases())
    .filter((r) => r.app === app)
    .sort((a, b) => b.versionCode - a.versionCode);

  const current = all.find((r) => r.published);
  if (!current) return { ok: false, error: 'لا يوجد إصدار منشور للتراجع عنه.' };

  const previous = all.find((r) => r.versionCode < current.versionCode);
  if (!previous) return { ok: false, error: 'لا يوجد إصدار أقدم للعودة إليه.' };

  const db = getAdminSupabase();
  const { error } = await db
    .from('app_versions')
    .update({ published: true })
    .eq('id', previous.id);
  if (error) return { ok: false, error: `تعذّر التراجع: ${error.message}` };

  await db.from('app_versions').update({ published: false }).eq('id', current.id);

  return { ok: true, versionName: previous.versionName };
}

export interface ReleaseReview {
  id: string;
  name: string;
  rating: number;
  comment: string | null;
  visible: boolean;
  createdAt: string;
}

/** آراء المستخدمات على تطبيق معيّن — تُعرض داخل نافذة تفاصيل الإصدار. */
export async function listAppReviews(app: ReleaseApp): Promise<ReleaseReview[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('app_reviews')
    .select('id, name, rating, comment, visible, created_at')
    .eq('app', app)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    visible: Boolean(r.visible),
    createdAt: r.created_at as string,
  }));
}

/** إظهار رأي أو إخفاؤه عن صفحة التحميل العامّة. */
export async function setReviewVisible(id: string, visible: boolean): Promise<boolean> {
  const db = getAdminSupabase();
  const { error } = await db.from('app_reviews').update({ visible }).eq('id', id);
  return !error;
}

/** تعديل بيانات إصدار مسجَّل (دون رفع ملفّ جديد بالضرورة). */
export async function updateRelease(
  id: string,
  patch: Omit<ReleaseInput, 'app'> & { app: ReleaseApp },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!patch.versionName.trim()) return { ok: false, error: 'اسم الإصدار مطلوب.' };
  if (!patch.downloadUrl.trim()) return { ok: false, error: 'رابط التنزيل مطلوب.' };

  const db = getAdminSupabase();
  const { error } = await db
    .from('app_versions')
    .update({
      app: patch.app,
      version_code: patch.versionCode,
      version_name: patch.versionName.trim(),
      download_url: patch.downloadUrl.trim(),
      notes: patch.notes.trim() || null,
      mandatory: patch.mandatory,
      published: patch.published,
    })
    .eq('id', id);

  if (error) return { ok: false, error: `تعذّر حفظ التعديل: ${error.message}` };

  if (patch.published) await unpublishSiblings(patch.app, patch.versionCode);

  return { ok: true };
}

/** ينشر إصدارًا أو يخفيه. */
export async function setReleasePublished(id: string, published: boolean): Promise<boolean> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('app_versions')
    .update({ published })
    .eq('id', id)
    .select('app, version_code')
    .maybeSingle();
  if (error) return false;

  if (published && data) {
    await unpublishSiblings(data.app as ReleaseApp, data.version_code as number);
  }
  return true;
}

/** يحذف إصدارًا من السجلّ (الملفّ يبقى في المستودع). */
export async function deleteRelease(id: string): Promise<boolean> {
  const db = getAdminSupabase();
  const { error } = await db.from('app_versions').delete().eq('id', id);
  return !error;
}
