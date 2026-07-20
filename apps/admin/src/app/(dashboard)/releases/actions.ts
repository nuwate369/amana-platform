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
}

export interface ReleaseInput {
  app: ReleaseApp;
  versionCode: number;
  versionName: string;
  notes: string;
  mandatory: boolean;
  published: boolean;
  /** اسم الملفّ الأصلي — يُستخدم لبناء المسار داخل المستودع. */
  fileName: string;
  /** محتوى ملفّ APK مُرمَّزًا base64. */
  fileBase64: string;
}

/** يقرأ كل الإصدارات المسجَّلة، الأحدث أوّلًا. */
export async function listReleases(): Promise<ReleaseRow[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('app_versions')
    .select('id, app, version_code, version_name, download_url, notes, mandatory, published, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

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
  }));
}

/** يرفع ملفّ APK ويسجّل الإصدار. */
export async function createRelease(
  input: ReleaseInput,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const db = getAdminSupabase();

  if (!input.versionCode || input.versionCode < 1) {
    return { ok: false, error: 'رقم البناء (versionCode) غير صالح.' };
  }
  if (!input.versionName.trim()) {
    return { ok: false, error: 'اسم الإصدار مطلوب.' };
  }
  if (!input.fileBase64) {
    return { ok: false, error: 'لم يُرفَق ملفّ APK.' };
  }

  const path = `${input.app}/amana-${input.app}-${input.versionCode}.apk`;
  const bytes = Buffer.from(input.fileBase64, 'base64');

  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'application/vnd.android.package-archive',
    upsert: true,
  });
  if (upErr) return { ok: false, error: `تعذّر رفع الملفّ: ${upErr.message}` };

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: insErr } = await db.from('app_versions').upsert(
    {
      app: input.app,
      platform: 'android',
      version_code: input.versionCode,
      version_name: input.versionName.trim(),
      download_url: url,
      notes: input.notes.trim() || null,
      mandatory: input.mandatory,
      published: input.published,
    },
    { onConflict: 'app,platform,version_code' },
  );
  if (insErr) return { ok: false, error: `تعذّر حفظ الإصدار: ${insErr.message}` };

  return { ok: true, url };
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
