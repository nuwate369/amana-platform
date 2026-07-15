'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Send, User, Clock, CheckCircle, Archive, Loader, Loader2, XCircle,
  AlertTriangle, HelpCircle, Lightbulb, Wrench, Lock, MessageSquare,
} from 'lucide-react';
import {
  TICKET_STATUS_LABELS, TICKET_STATUS_LABELS_EN, TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS, TICKET_CATEGORY_LABELS_EN,
  TICKET_PRIORITY_LABELS, TICKET_PRIORITY_LABELS_EN, TICKET_PRIORITY_COLORS,
  TICKET_STATUS_TRANSITIONS, STAFF_TYPE_LABELS, STAFF_TYPE_COLORS,
  type TicketStatus, type TicketCategory, type UserType,
} from '@amana/shared-types';
import { getTicket, updateTicket, sendMessage, type TicketDetail } from '@/app/actions/support';
import { notify } from '@/lib/toast';

const CATEGORY_ICON: Record<TicketCategory, React.ReactNode> = {
  complaint: <AlertTriangle className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  suggestion: <Lightbulb className="w-4 h-4" />,
  technical: <Wrench className="w-4 h-4" />,
};

const STATUS_ICON: Record<TicketStatus, React.ReactNode> = {
  open: <Clock className="w-3.5 h-3.5" />,
  in_progress: <Loader className="w-3.5 h-3.5" />,
  resolved: <CheckCircle className="w-3.5 h-3.5" />,
  closed: <Archive className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

const STATUS_BTN: Record<TicketStatus, string> = {
  open: 'bg-blue-600 hover:bg-blue-700 text-white',
  in_progress: 'bg-amber-600 hover:bg-amber-700 text-white',
  resolved: 'bg-sky-600 hover:bg-sky-700 text-white',
  closed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  cancelled: 'bg-gray-600 hover:bg-gray-700 text-white',
};

/**
 * نافذة تفاصيل تذكرة الدعم — تُفتح من القائمة دون تنقّل. تعرض المحادثة والتفاصيل
 * وتغيير الحالة والرد. تجلب بياناتها في العميل وتعيد الجلب بعد كل إجراء.
 */
export function TicketDetailModal({
  ticketId,
  userRole,
  currentUserId,
  onClose,
  onChanged,
}: {
  ticketId: string | null;
  userRole: UserType | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const canManage = userRole === 'super_admin' || userRole === 'admin' || userRole === 'support';

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    const data = await getTicket(ticketId);
    setTicket(data);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) {
      setTicket(null);
      setNewMessage('');
      setIsInternal(false);
      load();
    }
  }, [ticketId, load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  if (!ticketId) return null;

  async function handleSend() {
    if (!newMessage.trim() || !currentUserId || !userRole || !ticket) return;
    setSending(true);
    const res = await sendMessage(currentUserId, userRole, ticket.id, newMessage.trim(), isInternal);
    setSending(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    setNewMessage('');
    setIsInternal(false);
    await load();
    onChanged();
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!currentUserId || !ticket) return;
    setUpdatingStatus(true);
    const res = await updateTicket(currentUserId, ticket.id, { status: newStatus });
    setUpdatingStatus(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    notify.success(t('common.saveSuccess', 'تم الحفظ'));
    await load();
    onChanged();
  }

  async function handleAssign(assignedTo: string | null) {
    if (!currentUserId || !ticket) return;
    setUpdatingStatus(true);
    const res = await updateTicket(currentUserId, ticket.id, { assignedTo });
    setUpdatingStatus(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    await load();
    onChanged();
  }

  const availableStatuses = ticket ? TICKET_STATUS_TRANSITIONS[ticket.status] ?? [] : [];
  // تذكرة منتهية/ملغاة = عرض للقراءة فقط (لا ردّ ولا تغيير حالة ولا تخصيص).
  const readOnly = ticket ? ticket.status === 'closed' || ticket.status === 'cancelled' : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div className="min-w-0">
            {ticket?.ticketNumber && (
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                {ticket.ticketNumber}
              </span>
            )}
            <h2 className="truncate text-lg font-bold text-foreground">
              {ticket?.subject ?? t('support.details', 'تفاصيل التذكرة')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {ticket && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_STATUS_COLORS[ticket.status]}`}>
                {STATUS_ICON[ticket.status]}
                {lang === 'ar' ? TICKET_STATUS_LABELS[ticket.status] : TICKET_STATUS_LABELS_EN[ticket.status]}
              </span>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading || !ticket ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('common.loading', 'جارٍ التحميل…')}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-row">
            {/* المحادثة + الرد */}
            <div className="flex min-h-[300px] flex-1 flex-col rounded-xl border border-border bg-card">
              <div className="border-b border-border p-3">
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
                {ticket.surveyAnsweredAt && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {'★'.repeat(ticket.surveyRating ?? 0)}{'☆'.repeat(5 - (ticket.surveyRating ?? 0))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('support.surveyResult', 'تقييم العميل')}: {ticket.surveyRating}/5
                    </span>
                    {ticket.surveyComment && <span className="text-xs text-foreground">— {ticket.surveyComment}</span>}
                  </div>
                )}
              </div>

              <div className="max-h-[45vh] min-h-[160px] flex-1 space-y-3 overflow-y-auto p-4">
                {ticket.messages.map((m) => {
                  const isOwn = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{m.senderName}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STAFF_TYPE_COLORS[m.senderRole] ?? 'bg-muted text-foreground'}`}>
                            {lang === 'ar' ? (STAFF_TYPE_LABELS[m.senderRole] ?? m.senderRole) : m.senderRole}
                          </span>
                          {m.isInternal && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              <Lock className="inline h-2.5 w-2.5" /> {lang === 'ar' ? 'داخلي' : 'Internal'}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          m.isInternal
                            ? 'border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                            : isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                        </div>
                        <p className="mt-1 px-2 text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* الرد (يُخفى إن كانت التذكرة منتهية/ملغاة — عرض للقراءة فقط) */}
              <div className="border-t border-border p-3">
                {readOnly ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    {ticket.status === 'cancelled'
                      ? t('support.ticketCancelledHint', 'أُلغيت هذه التذكرة.')
                      : t('support.readOnlyClosed', 'هذه التذكرة منتهية — عرض للقراءة فقط.')}
                  </p>
                ) : (
                  <>
                    {canManage && (
                      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded border-border" />
                        <Lock className="h-3 w-3" /> {t('support.internalNote', 'ملاحظة داخلية')}
                      </label>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={t('support.replyPlaceholder', 'اكتب ردك هنا...')}
                        className="min-h-[64px] flex-1 resize-none rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="flex items-center gap-2 self-end rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {t('support.send', 'إرسال')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* الجانب: التفاصيل + الحالة */}
            <aside className="w-full shrink-0 space-y-4 lg:w-72">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t('support.details', 'تفاصيل التذكرة')}</h3>
                <div className="space-y-3 text-sm">
                  <Row label={t('support.category', 'النوع')} value={
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      {CATEGORY_ICON[ticket.category]}
                      {lang === 'ar' ? TICKET_CATEGORY_LABELS[ticket.category] : TICKET_CATEGORY_LABELS_EN[ticket.category]}
                    </span>
                  } />
                  <Row label={t('support.priority', 'الأولوية')} value={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                      {lang === 'ar' ? TICKET_PRIORITY_LABELS[ticket.priority] : TICKET_PRIORITY_LABELS_EN[ticket.priority]}
                    </span>
                  } />
                  <Row label={t('support.user', 'المستخدم')} value={
                    <div>
                      <p className="font-medium text-foreground">{ticket.userName}</p>
                      <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                    </div>
                  } />
                  <Row label={t('support.createdAt', 'تاريخ الإنشاء')} value={
                    <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                  } />
                  <Row label={t('support.updatedAt', 'آخر تحديث')} value={
                    <span className="text-xs text-muted-foreground">{new Date(ticket.updatedAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                  } />
                </div>
              </div>

              {canManage && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{t('support.updateStatus', 'تحديث الحالة')}</h3>
                  {availableStatuses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {ticket.status === 'open'
                        ? t('support.startByReplying', 'اكتب ردًّا لبدء العمل — تنتقل التذكرة تلقائيًّا إلى «قيد العمل».')
                        : t('support.noStatusChange', 'حالة نهائية — لا يمكن تغييرها.')}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableStatuses.map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          disabled={updatingStatus}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${STATUS_BTN[st]}`}
                        >
                          {lang === 'ar' ? TICKET_STATUS_LABELS[st] : TICKET_STATUS_LABELS_EN[st]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canManage && !readOnly && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{t('support.assign', 'تخصيص التذكرة')}</h3>
                  <select
                    value={ticket.assignedTo || ''}
                    onChange={(e) => handleAssign(e.target.value || null)}
                    disabled={updatingStatus}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">{t('support.unassigned', 'غير مخصصة')}</option>
                    <option value={currentUserId || ''}>{t('support.assignSelf', 'تكلي نفسي')}</option>
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t('support.statsTitle', 'الإحصائيات')}</h3>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" /> {t('support.messageCount', 'عدد الرسائل')}
                  </span>
                  <span className="text-sm font-bold text-foreground">{ticket.messages.length}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="text-end">{value}</div>
    </div>
  );
}
