import type { Metadata } from 'next';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getStats, listReviews } from './actions';
import DownloadClient, { type AppBundle, type PublicRelease } from './download-client';

/**
 * صفحة التنزيل العامّة — `/download`.
 *
 * لا علاقة لها بـ `/releases` داخل لوحة الإدارة: تلك محميّة بصلاحية
 * `manage_releases` وتُستخدم للرفع والإدارة. هذه صفحة عامّة بلا تسجيل دخول،
 * تعرض **أحدث إصدار منشور فقط** لكل تطبيق — فلا يرى الزائر قائمة إصدارات
 * ولا يحتار أيّها يختار.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'أمانة | تحميل التطبيق',
  description: 'حمّلي تطبيق أمانة للراكبة أو السائقة — منصّة تنقّل نسائية آمنة.',
};

/** أحدث إصدار منشور لتطبيق واحد، أو null إن لم يُنشر شيء بعد. */
async function latest(app: 'passenger' | 'driver'): Promise<PublicRelease | null> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('app_versions')
    .select('version_name, version_code, notes, created_at')
    .eq('app', app)
    .eq('platform', 'android')
    .eq('published', true)
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    app,
    versionName: data.version_name as string,
    versionCode: data.version_code as number,
    notes: (data.notes as string | null) ?? null,
    releasedAt: data.created_at as string,
  };
}

async function bundle(app: 'passenger' | 'driver'): Promise<AppBundle> {
  const [release, stats, reviews] = await Promise.all([
    latest(app),
    getStats(app),
    listReviews(app),
  ]);
  return { release, stats, reviews };
}

export default async function DownloadPage() {
  const [passenger, driver] = await Promise.all([bundle('passenger'), bundle('driver')]);
  return <DownloadClient passenger={passenger} driver={driver} />;
}
