import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * رابط تنزيل ثابت لأحدث إصدار منشور من كلّ تطبيق.
 *
 * صفحة الهبوط وصفحة التحميل تشيران إلى `/api/download/passenger` و`/driver`،
 * فلا تحتاجان تعديلًا عند كل إصدار: هذا المسار يقرأ أحدث صفّ منشور من
 * `app_versions` ويعيد التوجيه إلى ملفّه.
 *
 * المسار مفتوح بلا مصادقة عمدًا (التنزيل يسبق التسجيل)، لذا يمرّ كل طلب على
 * `register_download` التي تحسم أمرين: هل تجاوز هذا الزائر الحدّ الساعي؟ وهل
 * تُحتسب ضغطته تثبيتًا جديدًا أم تكرارًا؟ التفاصيل في الهجرة 0003.
 */

export const dynamic = 'force-dynamic';

const APPS = new Set(['passenger', 'driver']);

/**
 * بصمة الزائر — SHA-256 لعنوان IP مع ملح خادمي.
 *
 * لا نخزّن العنوان الأصلي: البصمة تكفي للتمييز بين الزوّار ولا تُعرّف بأحد.
 * والملح ضروري لأنّ فضاء IPv4 صغير بما يكفي لعكس تجزئة بلا ملح.
 */
function visitorHash(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip');
  if (!ip) return null;

  const salt = process.env.DOWNLOAD_IP_SALT ?? 'amana-download-salt';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

export async function GET(req: Request, { params }: { params: Promise<{ app: string }> }) {
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
    return NextResponse.redirect(new URL('/?download=soon', req.url), 302);
  }

  const kind = new URL(req.url).searchParams.get('k') === 'update' ? 'update' : 'install';

  const { data: decision } = await db.rpc('register_download', {
    p_app: app,
    p_version_code: data.version_code as number,
    p_kind: kind,
    p_ip_hash: visitorHash(req),
  });

  const verdict = (Array.isArray(decision) ? decision[0] : decision) as
    | { allowed: boolean; counted: boolean }
    | undefined;

  // تجاوز الحدّ: نردّ 429 مع مهلة بدل إعادة التوجيه، فيتوقّف الآلي ويفهم البشري.
  if (verdict && verdict.allowed === false) {
    return NextResponse.json(
      { error: 'too_many_requests', message: 'محاولات تنزيل كثيرة — أعيدي المحاولة بعد قليل.' },
      { status: 429, headers: { 'Retry-After': '600' } },
    );
  }

  return NextResponse.redirect(data.download_url as string, 302);
}
