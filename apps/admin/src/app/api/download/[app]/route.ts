import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * رابط تنزيل ثابت لأحدث إصدار منشور من كلّ تطبيق.
 *
 * صفحة الهبوط تشير إلى `/api/download/passenger` و`/api/download/driver`، فلا
 * تحتاج تعديلًا عند كل إصدار: هذا المسار يقرأ أحدث صفّ منشور من `app_versions`
 * ويعيد التوجيه إلى ملفّه في مستودع التخزين.
 */

export const dynamic = 'force-dynamic';

const APPS = new Set(['passenger', 'driver']);

export async function GET(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;

  if (!APPS.has(app)) {
    return NextResponse.json({ error: 'unknown app' }, { status: 404 });
  }

  const db = getAdminSupabase();
  const { data, error } = await db
    .from('app_versions')
    .select('download_url, version_code')
    .eq('app', app)
    .eq('platform', 'android')
    .eq('published', true)
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.download_url) {
    // لا يوجد إصدار منشور بعد — نُعيد الزائر لصفحة الهبوط بعلامة توضيحية.
    return NextResponse.redirect(new URL('/?download=soon', _req.url), 302);
  }

  // نسجّل الضغطة قبل إعادة التوجيه. `k=update` تأتي من نافذة التحديث داخل
  // التطبيق، وأيّ شيء آخر يُحتسب تثبيتًا أوّل. الفشل هنا لا يمنع التنزيل.
  const kind = new URL(_req.url).searchParams.get('k') === 'update' ? 'update' : 'install';
  await db
    .from('app_downloads')
    .insert({ app, version_code: data.version_code as number, kind })
    .then(undefined, () => undefined);

  return NextResponse.redirect(data.download_url as string, 302);
}
