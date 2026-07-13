'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { X, AlertTriangle, ShieldCheck, UserCog } from 'lucide-react';

/**
 * حوار إجراء موحّد: تأكيد + سبب اختياري/إلزامي + عرض اسم المنفِّذ.
 * يُعاد استخدامه لحظر مستخدم ورفض KYC وأي إجراء حسّاس مشابه.
 * النمط مطابق لـ Modal في StaffClient (نفس الهوية والحركة).
 */
export interface ActionDialogProps {
  open: boolean;
  title: string;
  /** وصف قصير أعلى الحوار (نص أو JSX). */
  description?: ReactNode;
  /** اسم الهدف (يُبرز داخل الوصف الافتراضي إن لم يُمرَّر description). */
  targetName?: string | null;
  /** اسم المنفِّذ — يظهر «سيُسجَّل باسمك» للمساءلة. */
  actorName?: string | null;
  variant?: 'danger' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function ActionDialog({
  open,
  title,
  description,
  targetName,
  actorName,
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'السبب',
  reasonPlaceholder = 'اذكر السبب…',
  confirmLabel,
  loading = false,
  onConfirm,
  onClose,
}: ActionDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  // تصفير الحقل عند كل فتح
  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const reasonInvalid = requireReason && reason.trim().length < 3;
  const isDanger = variant === 'danger';

  function handleConfirm() {
    setTouched(true);
    if (reasonInvalid) return;
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              isDanger
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm font-medium ${
                isDanger ? 'text-red-800 dark:text-red-200' : 'text-emerald-800 dark:text-emerald-200'
              }`}
            >
              {description ?? (
                <>
                  هل أنت متأكد من تنفيذ هذا الإجراء على <strong>{targetName ?? 'هذا الحساب'}</strong>؟
                </>
              )}
            </p>
          </div>

          {requireReason && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{reasonLabel}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                rows={3}
                placeholder={reasonPlaceholder}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground resize-none"
              />
              {touched && reasonInvalid && (
                <p className="text-sm text-red-500">يجب ذكر السبب (٣ أحرف على الأقل).</p>
              )}
            </div>
          )}

          {actorName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
              <UserCog className="w-3.5 h-3.5 shrink-0" />
              <span>
                سيُسجَّل هذا الإجراء باسمك: <strong className="text-foreground">{actorName}</strong>
              </span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-colors disabled:opacity-70 ${
                isDanger
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                confirmLabel
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg font-medium transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
