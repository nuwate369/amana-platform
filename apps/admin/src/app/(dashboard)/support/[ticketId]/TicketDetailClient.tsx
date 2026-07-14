'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Send, User, Clock, CheckCircle, Archive,
  AlertTriangle, HelpCircle, Lightbulb, Wrench, Loader2,
  Lock, MessageSquare, Loader,
} from 'lucide-react';
import {
  TICKET_STATUS_LABELS_EN,
  TICKET_CATEGORY_LABELS_EN,
  TICKET_PRIORITY_LABELS_EN,
  TICKET_STATUS_LABELS, TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS, TICKET_CATEGORY_ICONS,
  TICKET_PRIORITY_LABELS, TICKET_PRIORITY_COLORS,
  STAFF_TYPE_LABELS, STAFF_TYPE_COLORS,
  type TicketStatus, type TicketCategory, type TicketPriority,
} from '@amana/shared-types';
import { updateTicket, sendMessage, type TicketDetail, type TicketMessage } from '@/app/actions/support';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import type { UserType } from '@amana/shared-types';

const CATEGORY_ICON_MAP: Record<TicketCategory, React.ReactNode> = {
  complaint: <AlertTriangle className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  suggestion: <Lightbulb className="w-4 h-4" />,
  technical: <Wrench className="w-4 h-4" />,
};

const STATUS_ICON_MAP: Record<TicketStatus, React.ReactNode> = {
  open: <Clock className="w-4 h-4" />,
  in_progress: <Loader className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  closed: <Archive className="w-4 h-4" />,
};

const STATUS_ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  open: { ar: 'فتح', en: 'Open' },
  in_progress: { ar: 'قيد المعالجة', en: 'In Progress' },
  resolved: { ar: 'تم الحل', en: 'Resolved' },
  closed: { ar: 'إغلاق', en: 'Closed' },
};

export default function TicketDetailClient({
  ticket: initialTicket,
}: {
  ticket: TicketDetail;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState(initialTicket);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [userRole, setUserRole] = useState<UserType | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.role) setUserRole(data.role as UserType);
      });
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages]);

  const canManage = userRole === 'super_admin' || userRole === 'support';

  async function handleSend() {
    if (!newMessage.trim() || !user || !userRole) return;
    setSending(true);
    const res = await sendMessage(user.id, userRole, ticket.id, newMessage.trim(), isInternal);
    setSending(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    setNewMessage('');
    setIsInternal(false);
    router.refresh();
    notify.success(t('common.saveSuccess'));
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!user) return;
    setUpdatingStatus(true);
    const res = await updateTicket(user.id, ticket.id, { status: newStatus });
    setUpdatingStatus(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    setTicket((prev) => ({ ...prev, status: newStatus }));
    notify.success(t('common.saveSuccess'));
    router.refresh();
  }

  async function handleAssign(assignedTo: string | null) {
    if (!user) return;
    setUpdatingStatus(true);
    const res = await updateTicket(user.id, ticket.id, { assignedTo });
    setUpdatingStatus(false);
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    setTicket((prev) => ({ ...prev, assignedTo }));
    notify.success(t('common.saveSuccess'));
  }

  const statusActions: { status: TicketStatus; color: string }[] = [
    { status: 'open', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { status: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { status: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { status: 'closed', color: 'bg-gray-600 hover:bg-gray-700 text-white' },
  ];

  const availableStatuses = statusActions.filter((s) => s.status !== ticket.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/support"
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            {t('support.backToList', 'العودة للقائمة')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">{ticket.subject}</h2>
            <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
            {ticket.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} lang={lang} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              {canManage && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Lock className="w-3 h-3" />
                  {t('support.internalNote', 'ملاحظة داخلية')}
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('support.replyPlaceholder', 'اكتب ردك هنا...')}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none text-foreground resize-none min-h-[80px]"
                rows={3}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="self-end px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('support.send', 'إرسال')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('support.details', 'تفاصيل التذكرة')}</h3>
            <div className="space-y-3">
              <DetailRow
                label={t('support.status', 'الحالة')}
                value={
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${TICKET_STATUS_COLORS[ticket.status]}`}>
                    {STATUS_ICON_MAP[ticket.status]}
                    {lang === 'ar' ? TICKET_STATUS_LABELS[ticket.status] : TICKET_STATUS_LABELS_EN[ticket.status]}
                  </span>
                }
              />
              <DetailRow
                label={t('support.category', 'النوع')}
                value={
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    {CATEGORY_ICON_MAP[ticket.category]}
                    {lang === 'ar' ? TICKET_CATEGORY_LABELS[ticket.category] : TICKET_CATEGORY_LABELS_EN[ticket.category]}
                  </span>
                }
              />
              <DetailRow
                label={t('support.priority', 'الأولوية')}
                value={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                    {lang === 'ar' ? TICKET_PRIORITY_LABELS[ticket.priority] : TICKET_PRIORITY_LABELS_EN[ticket.priority]}
                  </span>
                }
              />
              <DetailRow
                label={t('support.user', 'المستخدم')}
                value={
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{ticket.userName}</p>
                    <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                  </div>
                }
              />
              <DetailRow
                label={t('support.userRole', 'دور المستخدم')}
                value={
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STAFF_TYPE_COLORS[ticket.userRole] ?? 'bg-muted text-foreground'}`}>
                    {lang === 'ar' ? (STAFF_TYPE_LABELS[ticket.userRole] ?? ticket.userRole) : ticket.userRole}
                  </span>
                }
              />
              <DetailRow
                label={t('support.createdAt', 'تاريخ الإنشاء')}
                value={
                  <span className="text-xs text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                }
              />
              <DetailRow
                label={t('support.updatedAt', 'آخر تحديث')}
                value={
                  <span className="text-xs text-muted-foreground">
                    {new Date(ticket.updatedAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                }
              />
            </div>
          </div>

          {canManage && (
            <div className="bg-card border border-border rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('support.updateStatus', 'تحديث الحالة')}</h3>
              <div className="flex flex-wrap gap-2">
                {availableStatuses.map((s) => (
                  <button
                    key={s.status}
                    onClick={() => handleStatusChange(s.status)}
                    disabled={updatingStatus}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${s.color}`}
                  >
                    {lang === 'ar' ? STATUS_ACTION_LABELS[s.status].ar : STATUS_ACTION_LABELS[s.status].en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="bg-card border border-border rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('support.assign', 'تخصيص التذكرة')}</h3>
              <select
                value={ticket.assignedTo || ''}
                onChange={(e) => handleAssign(e.target.value || null)}
                disabled={updatingStatus}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none text-foreground disabled:opacity-50"
              >
                <option value="">{t('support.unassigned', 'غير مخصصة')}</option>
                <option value={user?.id || ''}>{t('support.assignSelf', 'تكلي نفسي')}</option>
              </select>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('support.stats', 'الإحصائيات')}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('support.messageCount', 'عدد الرسائل')}</span>
                <span className="text-sm font-bold text-foreground">{ticket.messages.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('support.internalCount', 'ملاحظات داخلية')}</span>
                <span className="text-sm font-bold text-foreground">
                  {ticket.messages.filter((m) => m.isInternal).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  lang,
}: {
  message: TicketMessage;
  isOwn: boolean;
  lang: string;
}) {
  const roleLabel = lang === 'ar' ? (STAFF_TYPE_LABELS[message.senderRole] ?? message.senderRole) : message.senderRole;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-1' : 'order-2'}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwn && (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs font-medium text-foreground">{message.senderName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STAFF_TYPE_COLORS[message.senderRole] ?? 'bg-muted text-foreground'}`}>
            {roleLabel}
          </span>
          {message.isInternal && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Lock className="w-2.5 h-2.5 inline" /> {lang === 'ar' ? 'داخلي' : 'Internal'}
            </span>
          )}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 ${
          message.isInternal
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            : isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-2">
          {new Date(message.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-end">{value}</div>
    </div>
  );
}
