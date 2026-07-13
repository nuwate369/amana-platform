import AuditLogClient from './AuditLogClient';
import { listAuditLog } from '@/app/actions/moderation';

/**
 * صفحة سجل الحركات — تعرض كل الإجراءات الحسّاسة (حظر/رفع حظر/قبول/رفض KYC…)
 * مع المنفِّذ والسبب والوقت. مكوّن خادمي يغذّي العميل بالبيانات الأولية.
 */
export default async function AuditLogPage() {
  const initial = await listAuditLog();
  return <AuditLogClient initial={initial} />;
}
