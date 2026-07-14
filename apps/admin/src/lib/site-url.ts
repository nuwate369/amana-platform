import { headers } from 'next/headers';

/**
 * يحدّد رابط الموقع الأساسي (origin) لاستخدامه في روابط إعادة التوجيه
 * (دعوات الموظفين، إعادة تعيين كلمة المرور…). الأولوية:
 *   1) NEXT_PUBLIC_SITE_URL إن ضُبط صراحةً.
 *   2) اشتقاقه من ترويسات الطلب الفعلي (host/proto) — يعمل تلقائياً على أي نطاق
 *      نُشِر عليه (مثل https://amana.nuwate.com) دون الحاجة لضبط متغيّر بيئة.
 *   3) fallback محلي للتطوير.
 *
 * يجب استدعاؤها داخل Server Action / سياق طلب (تستخدم headers()).
 */
export async function getSiteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, '');

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // خارج سياق الطلب — نتجاهل ونستخدم الـfallback.
  }

  return 'http://localhost:3002';
}
