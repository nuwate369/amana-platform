import SupportClient from './SupportClient';
import { listTickets, getTicketStats } from '@/app/actions/support';

// شاشة محمية ببيانات حيّة — تُعرض ديناميكياً (لا تُولَّد ساكنة وقت البناء).
export const dynamic = 'force-dynamic';

/**
 * صفحة تذاكر الدعم الفني — تعرض جميع التذاكر مع فلترة الحالة والبحث.
 * مكوّن خادمي يغذّي SupportClient بالبيانات الأولية.
 */
export default async function SupportPage() {
  const [initialTickets, stats] = await Promise.all([
    listTickets(),
    getTicketStats(),
  ]);

  return <SupportClient initialTickets={initialTickets} stats={stats} />;
}
