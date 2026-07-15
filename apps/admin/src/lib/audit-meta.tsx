import {
  Ban, RotateCcw, Check, X, ScrollText, UserPlus, Pencil, Trash2,
  ToggleLeft, Mail, Star, type LucideIcon,
} from 'lucide-react';

/**
 * بيانات عرض أنواع حركات سجل النظام (audit_logs.action):
 * تسمية عربية + أيقونة + ألوان — مصدر واحد يُعاد استخدامه في صفحة السجل
 * ونافذة تفاصيل الموظف وأي عرض مستقبلي.
 */
export interface AuditActionMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

const DANGER = 'bg-destructive/10 text-destructive';
const SUCCESS = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
const PRIMARY = 'bg-primary/10 text-primary';
const NEUTRAL = 'bg-muted text-muted-foreground';

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  // الإشراف على المستخدمين
  ban_user:        { label: 'حظر مستخدم',        icon: Ban,        className: DANGER },
  unban_user:      { label: 'رفع حظر',            icon: RotateCcw,  className: SUCCESS },
  approve_driver:  { label: 'قبول سائقة',         icon: Check,      className: SUCCESS },
  reject_driver:   { label: 'رفض KYC',            icon: X,          className: PRIMARY },
  delete_user:     { label: 'حذف حساب',           icon: Trash2,     className: DANGER },
  // إدارة الموظفين
  invite_staff:    { label: 'دعوة موظف',          icon: UserPlus,   className: PRIMARY },
  edit_staff:      { label: 'تعديل موظف',         icon: Pencil,     className: PRIMARY },
  toggle_staff:    { label: 'تفعيل/تعطيل موظف',  icon: ToggleLeft, className: NEUTRAL },
  resend_invite:   { label: 'إعادة إرسال دعوة',   icon: Mail,       className: NEUTRAL },
  delete_staff:    { label: 'حذف موظف',           icon: Trash2,     className: DANGER },
  // أسئلة التقييم
  create_rating_question: { label: 'إضافة سؤال تقييم', icon: Star, className: SUCCESS },
  update_rating_question: { label: 'تعديل سؤال تقييم', icon: Star, className: PRIMARY },
  delete_rating_question: { label: 'حذف سؤال تقييم',   icon: Star, className: DANGER },
};

/** يعيد الميتا لأي action مع بديل آمن للمجهول. */
export function auditActionMeta(action: string): AuditActionMeta {
  return AUDIT_ACTION_META[action] ?? { label: action, icon: ScrollText, className: NEUTRAL };
}
