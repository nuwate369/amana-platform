import StaffClient from './StaffClient';
import { listStaff } from '@/app/actions/staff';

/**
 * صفحة فريق العمل — تعرض الموظفين بـ user_type IN (super_admin, admin, support).
 * مكوّن خادمي يغذّي StaffClient بالبيانات الأولية.
 */
export default async function StaffPage() {
  const initialStaff = await listStaff();
  return <StaffClient initialStaff={initialStaff} />;
}
