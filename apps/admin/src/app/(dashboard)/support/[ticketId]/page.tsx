import { notFound } from 'next/navigation';
import TicketDetailClient from './TicketDetailClient';
import { getTicket } from '@/app/actions/support';

/**
 * صفحة تفاصيل التذكرة — تعرض التذكرة مع المحادثة وتحديث الحالة.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);

  if (!ticket) {
    notFound();
  }

  return <TicketDetailClient ticket={ticket} />;
}
