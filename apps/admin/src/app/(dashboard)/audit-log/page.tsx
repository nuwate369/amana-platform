import AuditLogClient from './AuditLogClient';
import { listAuditLog } from '@/app/actions/moderation';

// شاشة محمية ببيانات حيّة — تُعرض ديناميكياً (لا تُولَّد ساكنة وقت البناء).
export const dynamic = 'force-dynamic';

/**
 * صفحة سجل الحركات — تعرض كل الإجراءات الحسّاسة (حظر/رفع حظر/قبول/رفض KYC…)
 * مع المنفِّذ والسبب والوقت. مكوّن خادمي يغذّي العميل بالبيانات الأولية.
 */
export default async function AuditLogPage() {
  const initial = await listAuditLog();
  return <AuditLogClient initial={initial} />;
}
