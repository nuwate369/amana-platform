'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Plus, Mail, Shield, X, Lock, Pencil, Trash2, User as UserIcon,
  RotateCcw, AlertTriangle, Eye, Phone, CheckCircle, Ban, Clock,
  MoreVertical, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import {
  inviteStaffSchema,
  translateError,
  STAFF_USER_TYPE_OPTIONS,
  type InviteStaffInput,
} from '@amana/shared-ui/validation';
import {
  STAFF_TYPE_LABELS, STAFF_TYPE_COLORS,
  USER_STATUS_LABELS, USER_STATUS_COLORS,
  type UserType, type UserStatus,
} from '@amana/shared-types';
import {
  inviteStaffUser,
  editStaffUser,
  changeUserStatus,
  resendInvite,
  deleteStaffUser,
  type StaffRow,
} from '@/app/actions/staff';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { useAuth } from '@/lib/auth';
import { PrimaryButton, DangerButton, CancelButton } from '@/components/ui/ActionButtons';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'صلاحيات كاملة على كل شيء، بما فيها إدارة الموظفين ودعوتهم.',
  admin: 'مشاهدة كل أقسام اللوحة دون أي صلاحية تعديل أو إدارة.',
  support: 'مشاهدة شاشات محددة فقط: اللوحة، السائقات، الركاب، الرحلات، التقارير.',
};

function StatusBadge({ status }: { status: UserStatus }) {
  const colors = USER_STATUS_COLORS[status] ?? 'bg-muted text-foreground';
  const label = USER_STATUS_LABELS[status] ?? status;
  const icons: Record<string, React.ReactNode> = {
    pending_approval: <Clock className="w-3 h-3" />,
    pending_invite: <Clock className="w-3 h-3" />,
    active: <CheckCircle className="w-3 h-3" />,
    suspended: <Ban className="w-3 h-3" />,
    disabled: <Ban className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors}`}>
      {icons[status]}
      {label}
    </span>
  );
}

function StatusActions({
  row,
  onApprove,
  onSuspend,
  onDisable,
  onReactivate,
  onResendInvite,
  loading,
}: {
  row: StaffRow;
  onApprove: () => void;
  onSuspend: () => void;
  onDisable: () => void;
  onReactivate: () => void;
  onResendInvite: () => void;
  loading: string | null;
}) {
  const [open, setOpen] = useState(false);
  const actions: { label: string; icon: React.ReactNode; onClick: () => void; color?: string; disabled?: boolean }[] = [];

  if (row.status === 'pending_approval') {
    actions.push({ label: 'موافقة وتفعيل', icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, onClick: () => { onApprove(); setOpen(false); } });
    actions.push({ label: 'رفض وتعطيل', icon: <ShieldAlert className="w-4 h-4 text-red-500" />, onClick: () => { onDisable(); setOpen(false); }, color: 'text-red-600 dark:text-red-400' });
  } else if (row.status === 'pending_invite') {
    actions.push({ label: 'إعادة إرسال الدعوة', icon: <RotateCcw className="w-4 h-4 text-blue-500" />, onClick: () => { onResendInvite(); setOpen(false); }, disabled: loading === `resend-${row.id}` });
  } else if (row.status === 'active') {
    actions.push({ label: 'تعليق مؤقت', icon: <Ban className="w-4 h-4 text-orange-500" />, onClick: () => { onSuspend(); setOpen(false); }, color: 'text-orange-600 dark:text-orange-400' });
    actions.push({ label: 'تعطيل', icon: <Ban className="w-4 h-4 text-red-500" />, onClick: () => { onDisable(); setOpen(false); }, color: 'text-red-600 dark:text-red-400' });
  } else if (row.status === 'suspended') {
    actions.push({ label: 'إعادة تنشيط', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, onClick: () => { onReactivate(); setOpen(false); } });
    actions.push({ label: 'تعطيل', icon: <Ban className="w-4 h-4 text-red-500" />, onClick: () => { onDisable(); setOpen(false); }, color: 'text-red-600 dark:text-red-400' });
  } else if (row.status === 'disabled') {
    actions.push({ label: 'إعادة تنشيط', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, onClick: () => { onReactivate(); setOpen(false); } });
  }

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="إجراءات">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-1 z-50 w-52 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
            {actions.map((a, i) => (
              <button key={i} onClick={a.onClick} disabled={a.disabled}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 ${a.color ?? 'text-foreground'}`}>
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StaffClient({ initialStaff }: { initialStaff: StaffRow[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [staff, setStaff] = useState(initialStaff);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('user_type').eq('id', user.id).single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setCanManage(true); return; }
        setCanManage((data?.user_type as UserType) === 'super_admin');
      });
  }, [user]);

  useEffect(() => { setStaff(initialStaff); }, [initialStaff]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteForm = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { fullName: '', email: '', phone: '', userType: 'admin' },
  });
  const selectedRole = inviteForm.watch('userType');

  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState('admin');

  const [statusDialogTarget, setStatusDialogTarget] = useState<StaffRow | null>(null);
  const [statusDialogAction, setStatusDialogAction] = useState<'approve' | 'suspend' | 'disable' | 'reactivate' | null>(null);

  const [detailsId, setDetailsId] = useState<string | null>(null);

  // فتح تفاصيل موظف محدد عند القدوم من إشعار (?highlight=<id>).
  const searchParams = useSearchParams();
  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h) setDetailsId(h);
  }, [searchParams]);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const actorName = (user?.user_metadata?.full_name as string | undefined) || user?.email || 'مسؤول';

  useUnsavedChanges(inviteOpen && inviteForm.formState.isDirty, t('common.unsavedChanges'));

  function closeInvite() {
    inviteForm.reset({ fullName: '', email: '', phone: '', userType: 'admin' });
    setInviteOpen(false);
  }

  const onInvite = inviteForm.handleSubmit(async (values) => {
    const res = await inviteStaffUser(user?.id ?? null, {
      email: values.email, userType: values.userType, fullName: values.fullName, phone: values.phone || undefined,
    });
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success(t('common.saveSuccess'));
    closeInvite();
    router.refresh();
  });

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

  function openStatusDialog(target: StaffRow, action: 'approve' | 'suspend' | 'disable' | 'reactivate') {
    setStatusDialogTarget(target);
    setStatusDialogAction(action);
  }

  async function confirmStatusChange() {
    if (!statusDialogTarget || !statusDialogAction) return;
    setLoadingAction(`status-${statusDialogTarget.id}`);
    const statusMap: Record<string, UserStatus> = { approve: 'active', suspend: 'suspended', disable: 'disabled', reactivate: 'active' };
    const res = await changeUserStatus(user?.id ?? null, statusDialogTarget.id, statusMap[statusDialogAction]);
    setLoadingAction(null);
    setStatusDialogTarget(null);
    setStatusDialogAction(null);
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    const messages: Record<string, string> = { approve: 'تمت الموافقة وتفعيل الحساب', suspend: 'تم تعليق الحساب مؤقتاً', disable: 'تم تعطيل الحساب', reactivate: 'تم إعادة تنشيط الحساب' };
    notify.success(messages[statusDialogAction]);
    router.refresh();
  }

  async function handleResend(m: StaffRow) {
    setLoadingAction(`resend-${m.id}`);
    const res = await resendInvite(user?.id ?? null, m.id, m.email);
    setLoadingAction(null);
    if (!res.success) { notify.error(res.error || t('common.error')); return; }
    notify.success('تم إرسال الدعوة مجددًا');
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;
    setLoadingAction('delete');
    setStaff((prev) => prev.filter((m) => m.id !== targetId));
    setDeleteTarget(null);
    const res = await deleteStaffUser(user?.id ?? null, targetId);
    setLoadingAction(null);
    if (!res.success) { notify.error(res.error || t('common.error')); router.refresh(); return; }
    notify.success(`تم حذف "${targetName}" بنجاح`);
    router.refresh();
  }

  const statusDialogTitle: Record<string, string> = { approve: 'موافقة وتفعيل الحساب', suspend: 'تعليق الحساب مؤقتاً', disable: 'تعطيل الحساب', reactivate: 'إعادة تنشيط الحساب' };
  const statusDialogContent: Record<string, React.ReactNode> = {
    approve: <>هل تريد الموافقة على حساب <strong>{statusDialogTarget?.name}</strong> وتفعيله؟</>,
    suspend: <>هل تريد تعليق حساب <strong>{statusDialogTarget?.name}</strong> مؤقتاً؟ لن يتمكن من تسجيل الدخول حتى يُعاد تنشيطه.</>,
    disable: <>هل تريد تعطيل حساب <strong>{statusDialogTarget?.name}</strong>؟ لن يتمكن من الوصول للنظام.</>,
    reactivate: <>هل تريد إعادة تنشيط حساب <strong>{statusDialogTarget?.name}</strong> والسماح له بالدخول؟</>,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <span>{t('staff.title', 'فريق العمل')}</span>
          </h1>
          <span className="text-muted-foreground font-light">/</span>
          <p className="text-sm text-muted-foreground pt-1">{t('staff.subtitle', 'مديرو الدعم الفني والمشرفون')}</p>
        </div>
        {canManage && (
          <button onClick={() => setInviteOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4" />
            {t('staff.invite', 'دعوة موظف جديد')}
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('staff.table.name', 'الاسم')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('staff.table.email', 'البريد')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('staff.table.role', 'الدور')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('staff.table.status', 'الحالة')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('staff.table.date', 'التاريخ')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground text-center">{t('staff.table.actions', 'الإجراءات')}</th>
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
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {new Date(m.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setDetailsId(m.id)} title="عرض التفاصيل"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
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
                          <button onClick={() => openEdit(m)} title="تعديل"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <StatusActions
                            row={m}
                            onApprove={() => openStatusDialog(m, 'approve')}
                            onSuspend={() => openStatusDialog(m, 'suspend')}
                            onDisable={() => openStatusDialog(m, 'disable')}
                            onReactivate={() => openStatusDialog(m, 'reactivate')}
                            onResendInvite={() => handleResend(m)}
                            loading={loadingAction}
                          />
                          <button onClick={() => setDeleteTarget(m)} title="حذف"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
                    {t('staff.empty', 'لا يوجد موظفون حالياً.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inviteOpen && (
        <Modal onClose={closeInvite} title={t('staff.invite', 'دعوة موظف جديد')} className="max-w-2xl">
          <form onSubmit={onInvite} className="p-6 space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><UserIcon className="w-5 h-5" /></div>
                  <input type="text" className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground" placeholder="مثال: سارة العبدالله" {...inviteForm.register('fullName')} />
                </div>
                {inviteForm.formState.errors.fullName && <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.fullName.message)}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Mail className="w-5 h-5" /></div>
                  <input type="email" className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground" placeholder="name@example.com" {...inviteForm.register('email')} />
                </div>
                {inviteForm.formState.errors.email && <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.email.message)}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">رقم الجوال <span className="text-xs text-muted-foreground">(اختياري)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Phone className="w-5 h-5" /></div>
                  <input type="tel" dir="ltr" className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-left" placeholder="05xxxxxxxx" {...inviteForm.register('phone')} />
                </div>
                {inviteForm.formState.errors.phone && <p className="text-sm text-red-500">{translateError(t, inviteForm.formState.errors.phone.message)}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الدور</label>
                <select className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer" {...inviteForm.register('userType')}>
                  {STAFF_USER_TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
            </div>
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              {ROLE_DESCRIPTIONS[selectedRole] ?? ''}
            </p>
            <div className="pt-2 flex gap-3">
              <PrimaryButton type="submit" loading={inviteForm.formState.isSubmitting} fullWidth>
                إرسال الدعوة
              </PrimaryButton>
              <CancelButton type="button" onClick={closeInvite} fullWidth />
            </div>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal onClose={() => setEditTarget(null)} title="تعديل بيانات الموظف" className="max-w-2xl">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني <span className="text-xs text-muted-foreground">(للقراءة فقط)</span></label>
                <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg flex items-center min-h-[42px]">
                  <p className="text-sm font-mono text-muted-foreground truncate" dir="ltr">{editTarget.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground" placeholder="أدخل الاسم الكامل" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">رقم الجوال <span className="text-xs text-muted-foreground">(اختياري)</span></label>
                <input type="tel" dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-left" placeholder="05xxxxxxxx" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الدور</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer">
                  {STAFF_USER_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              {ROLE_DESCRIPTIONS[editType] ?? ''}
            </p>
            <div className="pt-2 flex gap-3">
              <PrimaryButton type="button" onClick={submitEdit} loading={loadingAction === 'edit'} fullWidth>
                حفظ التعديلات
              </PrimaryButton>
              <CancelButton type="button" onClick={() => setEditTarget(null)} fullWidth />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="تأكيد الحذف">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  هل أنت متأكد من حذف <span className="font-extrabold">{deleteTarget.name}</span>؟
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الحساب نهائياً من النظام.</p>
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <DangerButton type="button" onClick={confirmDelete} loading={loadingAction === 'delete'} fullWidth>
                نعم، حذف
              </DangerButton>
              <CancelButton type="button" onClick={() => setDeleteTarget(null)} fullWidth />
            </div>
          </div>
        </Modal>
      )}

      {statusDialogTarget && statusDialogAction && (
        <Modal onClose={() => { setStatusDialogTarget(null); setStatusDialogAction(null); }} title={statusDialogTitle[statusDialogAction]}>
          <div className="p-6 space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              statusDialogAction === 'approve' || statusDialogAction === 'reactivate'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
            }`}>
              {statusDialogAction === 'approve' || statusDialogAction === 'reactivate'
                ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              }
              <p className={`text-sm font-bold ${
                statusDialogAction === 'approve' || statusDialogAction === 'reactivate'
                  ? 'text-emerald-800 dark:text-emerald-200'
                  : 'text-orange-800 dark:text-orange-200'
              }`}>
                {statusDialogContent[statusDialogAction]}
              </p>
            </div>
            <div className="pt-4 flex gap-3">
              {statusDialogAction === 'approve' || statusDialogAction === 'reactivate' ? (
                <PrimaryButton type="button" onClick={confirmStatusChange} loading={loadingAction === `status-${statusDialogTarget.id}`} fullWidth>
                  تأكيد
                </PrimaryButton>
              ) : (
                <DangerButton type="button" onClick={confirmStatusChange} loading={loadingAction === `status-${statusDialogTarget.id}`} fullWidth>
                  تأكيد
                </DangerButton>
              )}
              <CancelButton type="button" onClick={() => { setStatusDialogTarget(null); setStatusDialogAction(null); }} fullWidth />
            </div>
          </div>
        </Modal>
      )}

      <UserDetailsModal userId={detailsId} kind="staff" onClose={() => setDetailsId(null)} />
    </div>
  );
}

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
