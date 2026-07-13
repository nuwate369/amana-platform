'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Mail, Shield, X, Lock, Pencil, Trash2, User as UserIcon,
  RotateCcw, ToggleLeft, ToggleRight, AlertTriangle, Eye, Phone,
} from 'lucide-react';
import {
  inviteStaffSchema,
  translateError,
  STAFF_USER_TYPE_OPTIONS,
  type InviteStaffInput,
} from '@amana/shared-ui/validation';
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS, type UserType } from '@amana/shared-types';
import {
  inviteStaffUser,
  editStaffUser,
  toggleStaffStatus,
  resendInvite,
  deleteStaffUser,
  type StaffRow,
} from '@/app/actions/staff';
import { ActionDialog } from '@/components/ActionDialog';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

/** وصف صلاحيات كل دور — يظهر تحت اختيار الدور في نموذج الدعوة. */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'صلاحيات كاملة على كل شيء، بما فيها إدارة الموظفين ودعوتهم.',
  admin: 'مشاهدة كل أقسام اللوحة دون أي صلاحية تعديل أو إدارة.',
  support: 'مشاهدة شاشات محددة فقط: اللوحة، السائقات، الركاب، الرحلات، التقارير.',
};

function InviteStatusBadge({ status }: { status: StaffRow['inviteStatus'] }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'قيد الانتظار' },
    active:  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'نشط' },
    inactive: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: 'معطّل' },
  };
  const s = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function StaffClient({ initialStaff }: { initialStaff: StaffRow[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [staff, setStaff] = useState(initialStaff);

  // إدارة الموظفين حقٌّ لـ super_admin فقط. متسامح قبل تطبيق الهجرة (عمود
  // user_type غير موجود بعد) حتى لا نمنع الإدارة أثناء الانتقال.
  const [canManage, setCanManage] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setCanManage(true); return; }
        setCanManage((data?.user_type as UserType) === 'super_admin');
      });
  }, [user]);

  // مزامنة الحالة المحلية مع Props من السيرفر بعد أي revalidation
  useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteForm = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { fullName: '', email: '', phone: '', userType: 'admin' },
  });
  const selectedRole = inviteForm.watch('userType');

  // Edit modal
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState('admin');

  // Toggle confirmation dialog
  const [toggleTarget, setToggleTarget] = useState<StaffRow | null>(null);

  // Details modal
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const actorName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || 'مسؤول';

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);

  // Loading states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useUnsavedChanges(inviteOpen && inviteForm.formState.isDirty, t('common.unsavedChanges'));

  function closeInvite() {
    inviteForm.reset({ fullName: '', email: '', phone: '', userType: 'admin' });
    setInviteOpen(false);
  }

  const onInvite = inviteForm.handleSubmit(async (values) => {
    const res = await inviteStaffUser(user?.id ?? null, {
      email: values.email,
      userType: values.userType,
      fullName: values.fullName,
      phone: values.phone || undefined,
    });
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success(t('common.saveSuccess'));
    closeInvite();
    router.refresh();
  });

  // ===== Edit =====
  function openEdit(m: StaffRow) {
    setEditTarget(m);
    setEditName(m.name === '—' ? '' : m.name);
    setEditPhone(m.phone ?? '');
    setEditType(m.userType);
  }

  async function submitEdit() {
    if (!editTarget) return;
    setLoadingAction('edit');
    const res = await editStaffUser(user?.id ?? null, editTarget.id, editName, editPhone, editType);
    setLoadingAction(null);
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success('تم التعديل بنجاح');
    setEditTarget(null);
    router.refresh();
  }

  // ===== Status Toggle (بعد تأكيد المستخدم في الحوار) =====
  async function confirmToggle() {
    if (!toggleTarget) return;
    const m = toggleTarget;
    setLoadingAction(`status-${m.id}`);
    const res = await toggleStaffStatus(user?.id ?? null, m.id);
    setLoadingAction(null);
    setToggleTarget(null);
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success(m.isActive ? 'تم تعطيل الحساب' : 'تم تنشيط الحساب');
    router.refresh();
  }

  // ===== Resend Invite =====
  async function handleResend(m: StaffRow) {
    setLoadingAction(`resend-${m.id}`);
    const res = await resendInvite(user?.id ?? null, m.id, m.email);
    setLoadingAction(null);
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success('تم إرسال الدعوة مجددًا');
    router.refresh();
  }

  // ===== Delete =====
  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;
    setLoadingAction('delete');

    // إزالة فورية من الواجهة (optimistic update)
    setStaff((prev) => prev.filter((m) => m.id !== targetId));
    setDeleteTarget(null);

    const res = await deleteStaffUser(user?.id ?? null, targetId);
    setLoadingAction(null);
    if (!res.success) {
      // في حالة الفشل: أعد الصف للقائمة
      notify.error(res.error || t('common.error'));
      router.refresh();
      return;
    }
    notify.success(`تم حذف "${targetName}" بنجاح`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <span>فريق العمل</span>
          </h1>
          <span className="text-muted-foreground font-light">/</span>
          <p className="text-sm text-muted-foreground pt-1">
            مديرو الدعم الفني والمشرفون
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            دعوة موظف جديد
          </button>
        )}
      </div>

      {/* جدول الموظفين */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-4 font-semibold text-muted-foreground">الاسم</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">البريد</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">الدور</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">الحالة</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">التاريخ</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {m.isProtected && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      {m.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{m.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STAFF_TYPE_COLORS[m.userType] ?? 'bg-muted text-foreground'}`}>
                      <Shield className="w-3 h-3" />
                      {STAFF_TYPE_LABELS[m.userType] ?? m.userType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <InviteStatusBadge status={m.inviteStatus} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {new Date(m.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      {/* عرض التفاصيل — متاح للجميع */}
                      <button
                        onClick={() => setDetailsId(m.id)}
                        title="عرض التفاصيل"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {m.isProtected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <Lock className="w-3.5 h-3.5" />
                          محمي
                        </span>
                      ) : !canManage ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(m)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Status Toggle */}
                          {m.inviteStatus === 'pending' ? (
                            <button
                              onClick={() => handleResend(m)}
                              disabled={loadingAction === `resend-${m.id}`}
                              title="إعادة إرسال الدعوة"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-30"
                            >
                              {loadingAction === `resend-${m.id}` ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => setToggleTarget(m)}
                              disabled={loadingAction === `status-${m.id}`}
                              title={m.isActive ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                            >
                              {loadingAction === `status-${m.id}` ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                              ) : m.isActive ? (
                                <ToggleRight className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-red-400" />
                              )}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(m)}
                            title="حذف"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    لا يوجد موظفون حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal: دعوة موظف جديد ===== */}
      {inviteOpen && (
        <Modal onClose={closeInvite} title="دعوة موظف جديد" className="max-w-2xl">
          <form onSubmit={onInvite} className="p-6 space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                  placeholder="مثال: سارة العبدالله"
                  {...inviteForm.register('fullName')}
                />
              </div>
              {inviteForm.formState.errors.fullName && (
                <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.fullName.message)}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                  placeholder="name@example.com"
                  {...inviteForm.register('email')}
                />
              </div>
              {inviteForm.formState.errors.email && (
                <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.email.message)}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                رقم الجوال <span className="text-xs text-muted-foreground">(اختياري)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-left"
                  placeholder="05xxxxxxxx"
                  {...inviteForm.register('phone')}
                />
              </div>
              {inviteForm.formState.errors.phone && (
                <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.phone.message)}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">الدور</label>
              <select
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer"
                {...inviteForm.register('userType')}
              >
                {STAFF_USER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            </div>

            {/* وصف صلاحيات الدور المختار */}
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              {ROLE_DESCRIPTIONS[selectedRole] ?? ''}
            </p>

            <div className="pt-2 flex gap-3">
              <button type="submit" disabled={inviteForm.formState.isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-full font-semibold transition-colors disabled:opacity-70">
                {inviteForm.formState.isSubmitting ? <Spinner /> : 'إرسال الدعوة'}
              </button>
              <button type="button" onClick={closeInvite}
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2.5 rounded-full font-semibold transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===== Modal: تعديل موظف ===== */}
      {editTarget && (
        <Modal onClose={() => setEditTarget(null)} title="تعديل بيانات الموظف" className="max-w-2xl">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* بطاقة تعريف الموظف (قراءة فقط) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني <span className="text-xs text-muted-foreground">(للقراءة فقط)</span></label>
                <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg flex items-center min-h-[42px]">
                  <p className="text-sm font-mono text-muted-foreground truncate" dir="ltr">{editTarget.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  رقم الجوال <span className="text-xs text-muted-foreground">(اختياري)</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-left"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الدور</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer"
                >
                  {STAFF_USER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* وصف صلاحيات الدور المختار */}
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              {ROLE_DESCRIPTIONS[editType] ?? ''}
            </p>

            <div className="pt-2 flex gap-3">
              <button
                onClick={submitEdit}
                disabled={loadingAction === 'edit'}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-full font-semibold transition-colors disabled:opacity-70"
              >
                {loadingAction === 'edit' ? <Spinner /> : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setEditTarget(null)}
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2.5 rounded-full font-semibold transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== Dialog: تأكيد الحذف ===== */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="تأكيد الحذف">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  هل أنت متأكد من حذف <span className="font-extrabold">{deleteTarget.name}</span>؟
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الحساب نهائياً من النظام.
                </p>
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={loadingAction === 'delete'}
                className="flex-1 flex items-center justify-center gap-2 bg-background border border-border hover:bg-muted text-foreground py-2.5 rounded-full font-bold transition-colors disabled:opacity-70"
              >
                {loadingAction === 'delete' ? <Spinner /> : 'نعم، حذف'}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2.5 rounded-full font-bold transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* حوار تأكيد التفعيل/التعطيل — إعادة استخدام ActionDialog */}
      <ActionDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? 'تعطيل حساب الموظف' : 'تنشيط حساب الموظف'}
        variant={toggleTarget?.isActive ? 'danger' : 'primary'}
        actorName={actorName}
        description={
          toggleTarget?.isActive ? (
            <>
              هل أنت متأكد من تعطيل حساب <strong>{toggleTarget?.name}</strong>؟
              لن يتمكن من تسجيل الدخول للوحة حتى يُعاد تنشيطه.
            </>
          ) : (
            <>
              هل تريد إعادة تنشيط حساب <strong>{toggleTarget?.name}</strong> والسماح له بالدخول للوحة؟
            </>
          )
        }
        confirmLabel={toggleTarget?.isActive ? 'نعم، تعطيل' : 'نعم، تنشيط'}
        loading={loadingAction === `status-${toggleTarget?.id}`}
        onConfirm={confirmToggle}
        onClose={() => setToggleTarget(null)}
      />

      {/* نافذة التفاصيل — نفس المكوّن المعاد استخدامه */}
      <UserDetailsModal userId={detailsId} kind="staff" onClose={() => setDetailsId(null)} />
    </div>
  );
}

// ===== مكونات مساعدة =====

function Modal({ onClose, title, children, className = "max-w-md" }: { onClose: () => void; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-card rounded-2xl shadow-xl w-full ${className} overflow-hidden animate-in fade-in zoom-in duration-200 border border-border`}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />;
}
