import { redirect } from 'next/navigation';

/**
 * الرابط المباشر لتذكرة → يُعاد توجيهه إلى القائمة مع فتح النافذة المنبثقة
 * (?highlight=<id>). وُحّد عرض التذكرة على النموذج المنبثق؛ لا صفحة مستقلّة.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  redirect(`/support?highlight=${ticketId}`);
}
