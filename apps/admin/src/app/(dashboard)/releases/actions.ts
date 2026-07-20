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
  }));
}

/**
 * رقم البناء المقترح للإصدار القادم = أعلى رقم مسجَّل + 1 (أو 1 إن لم يوجد).
 *
 * لكل تطبيق تسلسله المستقلّ، فرقم بناء الراكبة لا علاقة له برقم السائقة.
 */
export async function nextVersionCode(app: ReleaseApp): Promise<number> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('app_versions')
    .select('version_code')
    .eq('app', app)
    .eq('platform', 'android')
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.version_code as number | undefined) ?? 0) + 1;
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

  return { ok: true };
}

/** ينشر إصدارًا أو يخفيه. */
export async function setReleasePublished(id: string, published: boolean): Promise<boolean> {
  const db = getAdminSupabase();
  const { error } = await db.from('app_versions').update({ published }).eq('id', id);
  return !error;
}

/** يحذف إصدارًا من السجلّ (الملفّ يبقى في المستودع). */
export async function deleteRelease(id: string): Promise<boolean> {
  const db = getAdminSupabase();
  const { error } = await db.from('app_versions').delete().eq('id', id);
  return !error;
}
