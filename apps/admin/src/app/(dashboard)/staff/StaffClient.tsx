'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Users, Plus, Mail, Shield, X, Lock } from 'lucide-react';
import {
  inviteStaffSchema,
  translateError,
  STAFF_USER_TYPE_OPTIONS,
  type InviteStaffInput,
} from '@amana/shared-ui/validation';
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS } from '@amana/shared-types';
import { inviteStaffUser, type StaffRow } from '@/app/actions/staff';
import { notify } from '@/lib/toast';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

export default function StaffClient({
  initialStaff,
}: {
  initialStaff: StaffRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [staff] = useState(initialStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: '', userType: 'admin' },
  });

  useUnsavedChanges(isModalOpen && isDirty, t('common.unsavedChanges'));

  function closeModal() {
    reset({ email: '', userType: 'admin' });
    setIsModalOpen(false);
  }

  const onSubmit = handleSubmit(async (values) => {
    const res = await inviteStaffUser(values.email, values.userType);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    notify.success(t('common.saveSuccess'));
    reset({ email: '', userType: 'admin' });
    setIsModalOpen(false);
    router.refresh();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-accent-500 shrink-0" />
            <span>فريق العمل الإداري</span>
          </h1>
          <p className="text-sm text-brand-500 dark:text-brand-400 mt-1">
            الموظفون الذين يديرون لوحة أمانة — المديرون والدعم الفني
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-400 text-brand-950 px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          دعوة موظف جديد
        </button>
      </div>

      {/* جدول الموظفين */}
      <div className="bg-white dark:bg-brand-900 border border-brand-200 dark:border-brand-700 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-brand-50 dark:bg-brand-800/50 border-b border-brand-200 dark:border-brand-700">
                <th className="px-6 py-4 font-semibold text-brand-700 dark:text-brand-300">الاسم</th>
                <th className="px-6 py-4 font-semibold text-brand-700 dark:text-brand-300">البريد الإلكتروني</th>
                <th className="px-6 py-4 font-semibold text-brand-700 dark:text-brand-300">النوع</th>
                <th className="px-6 py-4 font-semibold text-brand-700 dark:text-brand-300">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-brand-100 dark:border-brand-800 hover:bg-brand-50/50 dark:hover:bg-brand-800/20 transition-colors"
                >
                  <td className="px-6 py-4 text-brand-950 dark:text-brand-100 font-medium">
                    <div className="flex items-center gap-2">
                      {member.isProtected && (
                        <Lock
                          className="w-3.5 h-3.5 text-amber-500 shrink-0"
                          aria-label="حساب محمي — لا يمكن تعديله أو حذفه"
                        />
                      )}
                      {member.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-brand-700 dark:text-brand-300 font-mono text-xs">
                    {member.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        STAFF_TYPE_COLORS[member.userType] ??
                        'bg-brand-100 text-brand-800 dark:bg-brand-800 dark:text-brand-200'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {STAFF_TYPE_LABELS[member.userType] ?? member.userType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-brand-500 dark:text-brand-400 text-xs">
                    {new Date(member.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                </tr>
              ))}

              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-brand-500">
                    لا يوجد موظفون حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal دعوة موظف جديد */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-brand-100 dark:border-brand-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-brand-900 dark:text-brand-50">دعوة موظف جديد</h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-brand-400 hover:text-brand-700 hover:bg-brand-100 dark:hover:text-brand-200 dark:hover:bg-brand-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
              {/* البريد الإلكتروني */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-brand-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    className="w-full pl-4 pr-10 py-2 bg-brand-50 dark:bg-brand-800 border border-brand-200 dark:border-brand-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:outline-none dark:text-white"
                    placeholder="name@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{translateError(t, errors.email.message)}</p>
                )}
              </div>

              {/* نوع المستخدم — قائمة منسدلة محدودة بالقيم الثلاث فقط */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  نوع الموظف
                </label>
                <select
                  className="w-full px-4 py-2 bg-brand-50 dark:bg-brand-800 border border-brand-200 dark:border-brand-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:outline-none dark:text-white appearance-none cursor-pointer"
                  {...register('userType')}
                >
                  {STAFF_USER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.userType && (
                  <p className="mt-1 text-sm text-red-500">{translateError(t, errors.userType.message)}</p>
                )}
                <p className="text-xs text-brand-400 dark:text-brand-500 mt-1">
                  لا يمكن تغيير النوع بعد إنشاء الحساب — اختر بعناية
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-400 text-brand-950 py-2 rounded-lg font-semibold transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-950/30 border-t-brand-950" />
                  ) : (
                    'إرسال الدعوة'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-brand-100 dark:bg-brand-800 hover:bg-brand-200 dark:hover:bg-brand-700 text-brand-900 dark:text-brand-50 py-2 rounded-lg font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
