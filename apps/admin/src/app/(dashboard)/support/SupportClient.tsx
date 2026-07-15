'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { TicketDetailModal } from './TicketDetailModal';
import {
  Headphones, Search, Filter, MessageSquare, Clock, User,
  AlertTriangle, HelpCircle, Lightbulb, Wrench, ChevronLeft,
  ChevronRight, BarChart3, CheckCircle, Archive, Loader2, Plus, X,
  ArrowUp, ArrowDown, Star,
} from 'lucide-react';
import {
  TICKET_PRIORITY_LABELS_EN,
  TICKET_STATUS_LABELS_EN,
  TICKET_CATEGORY_LABELS_EN,
  TICKET_STATUS_LABELS, TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_PRIORITY_COLORS,
  type TicketStatus, type TicketCategory, type TicketPriority,
} from '@amana/shared-types';
import { listTickets, createTicket, type TicketRow, type TicketStats } from '@/app/actions/support';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import type { UserType } from '@amana/shared-types';
import { createTicketSchema, translateError } from '@amana/shared-ui/validation';
import { PrimaryButton, CancelButton } from '@/components/ui/ActionButtons';

const ITEMS_PER_PAGE = 15;

const CATEGORY_ICONS: Record<TicketCategory, React.ReactNode> = {
  complaint: <AlertTriangle className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  suggestion: <Lightbulb className="w-4 h-4" />,
  technical: <Wrench className="w-4 h-4" />,
};

const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  open: <Clock className="w-3 h-3" />,
  in_progress: <Loader2 className="w-3 h-3" />,
  resolved: <CheckCircle className="w-3 h-3" />,
  closed: <Archive className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
};

type FilterStatus = TicketStatus | 'all';

interface CreateTicketForm {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export default function SupportClient({
  initialTickets,
  stats,
}: {
  initialTickets: TicketRow[];
  stats: TicketStats;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';

  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'assignee' | 'user'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserType | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // فتح تذكرة محدّدة عند القدوم من إشعار أو رابط مباشر (?highlight=<id>).
  const searchParams = useSearchParams();
  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h) setDetailId(h);
  }, [searchParams]);

  const createForm = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', description: '', category: 'question', priority: 'medium' },
  });

  useEffect(() => { setTickets(initialTickets); }, [initialTickets]);

  // Realtime: تحديث القائمة والإحصاءات فور إنشاء/تغيير تذكرة (بلا إعادة تحميل).
  useEffect(() => {
    const channel = supabase
      .channel('support_tickets_list_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role) setUserRole(data.role as UserType);
      });
  }, [user]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          (t.ticketNumber ?? '').toLowerCase().includes(q)
      );
    }
    // الترتيب حسب المعيار والاتجاه.
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'rating') cmp = (a.surveyRating ?? -1) - (b.surveyRating ?? -1);
      else if (sortBy === 'assignee') cmp = (a.assignedName ?? '').localeCompare(b.assignedName ?? '', 'ar');
      else if (sortBy === 'user') cmp = (a.userName ?? '').localeCompare(b.userName ?? '', 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [tickets, statusFilter, search, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [statusFilter, search]);

  async function onCreateTicket(values: CreateTicketForm) {
    if (!user || !userRole) return;
    const res = await createTicket(user.id, userRole, {
      subject: values.subject,
      description: values.description,
      category: values.category,
      priority: values.priority,
    });
    if (!res.success) {
      notify.error(res.error || t('common.error'));
      return;
    }
    notify.success(t('support.ticketCreated', 'تم إنشاء التذكرة بنجاح'));
    setCreateOpen(false);
    createForm.reset();
    router.refresh();
  }

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: t('common.all', 'All'), count: stats.total },
    { key: 'open', label: t('support.status.open', 'Open'), count: stats.open },
    { key: 'in_progress', label: t('support.status.inProgress', 'In Progress'), count: stats.inProgress },
    { key: 'resolved', label: t('support.status.resolved', 'Resolved'), count: stats.resolved },
    { key: 'closed', label: t('support.status.closed', 'Closed'), count: stats.closed },
  ];

  const categoryOptions: { value: TicketCategory; labelAr: string; labelEn: string }[] = [
    { value: 'complaint', labelAr: 'شكوى', labelEn: 'Complaint' },
    { value: 'question', labelAr: 'سؤال', labelEn: 'Question' },
    { value: 'suggestion', labelAr: 'اقتراح', labelEn: 'Suggestion' },
    { value: 'technical', labelAr: 'مشكلة تقنية', labelEn: 'Technical Issue' },
  ];

  const priorityOptions: { value: TicketPriority; labelAr: string; labelEn: string }[] = [
    { value: 'high', labelAr: 'عالية', labelEn: 'High' },
    { value: 'medium', labelAr: 'متوسطة', labelEn: 'Medium' },
    { value: 'low', labelAr: 'منخفضة', labelEn: 'Low' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary shrink-0" />
            <span>{t('support.title', 'الدعم الفني')}</span>
          </h1>
          <span className="text-muted-foreground font-light">/</span>
          <p className="text-sm text-muted-foreground pt-1">
            {t('support.subtitle', 'تذاكر الدعم الفني من الركاب والسائقين')}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('support.createTicket', 'إنشاء تذكرة جديدة')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label={t('support.stats.total', 'إجمالي التذاكر')}
          value={stats.total}
          color="text-primary"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t('support.stats.open', 'جديد')}
          value={stats.open}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<Loader2 className="w-5 h-5" />}
          label={t('support.stats.inProgress', 'قيد المعالجة')}
          value={stats.inProgress}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label={t('support.stats.resolved', 'تم الحل')}
          value={stats.resolved}
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.key
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {/* قسم الترتيب */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t('support.sortBy', 'ترتيب حسب')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="py-2 px-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none text-foreground cursor-pointer"
              >
                <option value="date">{t('support.sort.date', 'التاريخ')}</option>
                <option value="rating">{t('support.sort.rating', 'التقييم')}</option>
                <option value="assignee">{t('support.sort.assignee', 'الموظف')}</option>
                <option value="user">{t('support.sort.user', 'المستخدم')}</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? t('support.sort.asc', 'تصاعدي') : t('support.sort.desc', 'تنازلي')}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('support.search', 'بحث في التذاكر...')}
                className="w-full pr-9 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.subject', 'الموضوع')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.user', 'المستخدم')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.category', 'النوع')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.priority', 'الأولوية')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.status', 'الحالة')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.sort.rating', 'التقييم')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.messages', 'الرسائل')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t('support.table.date', 'التاريخ')}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">{t('support.table.action', 'فتح')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetailId(ticket.id)} className="group block text-right">
                      {ticket.ticketNumber && (
                        <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                          {ticket.ticketNumber}
                        </span>
                      )}
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {ticket.subject}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{ticket.userName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{ticket.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {CATEGORY_ICONS[ticket.category]}
                      {lang === 'ar' ? TICKET_CATEGORY_LABELS[ticket.category] : TICKET_CATEGORY_LABELS_EN[ticket.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                      {lang === 'ar' ? TICKET_PRIORITY_LABELS[ticket.priority] : TICKET_PRIORITY_LABELS_EN[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${TICKET_STATUS_COLORS[ticket.status]}`}>
                      {STATUS_ICONS[ticket.status]}
                      {lang === 'ar' ? TICKET_STATUS_LABELS[ticket.status] : TICKET_STATUS_LABELS_EN[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ticket.surveyRating ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold text-foreground">{ticket.surveyRating}/5</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      {ticket.messageCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailId(ticket.id)}
                      title={t('support.openConversation', 'فتح المحادثة والرد')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t('support.open', 'فتح')}
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedTickets.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    {search || statusFilter !== 'all'
                      ? t('support.emptyFiltered', 'لا توجد تذاكر تطابق البحث.')
                      : t('support.empty', 'لا توجد تذاكر دعم فني حالياً.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t('support.pagination.showing', 'عرض')} {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)}{' '}
              {t('support.pagination.of', 'من')} {filteredTickets.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title={t('support.createTicket', 'إنشاء تذكرة جديدة')} className="max-w-2xl">
          <form onSubmit={createForm.handleSubmit(onCreateTicket)} className="p-6 space-y-4" noValidate>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t('support.form.subject', 'الموضوع')}</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                placeholder={t('support.form.subjectPlaceholder', 'مثال: مشكلة في الدفع')}
                {...createForm.register('subject')}
              />
              {createForm.formState.errors.subject && (
                <p className="text-sm text-red-500">{createForm.formState.errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t('support.form.description', 'الوصف')}</label>
              <textarea
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground resize-none"
                rows={4}
                placeholder={t('support.form.descriptionPlaceholder', 'اشرح المشكلة بالتفصيل...')}
                {...createForm.register('description')}
              />
              {createForm.formState.errors.description && (
                <p className="text-sm text-red-500">{createForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">{t('support.form.category', 'النوع')}</label>
                <select
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer"
                  {...createForm.register('category')}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'ar' ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">{t('support.form.priority', 'الأولوية')}</label>
                <select
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none cursor-pointer"
                  {...createForm.register('priority')}
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'ar' ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <PrimaryButton
                type="submit"
                loading={createForm.formState.isSubmitting}
                fullWidth
              >
                {t('support.form.submit', 'إنشاء التذكرة')}
              </PrimaryButton>
              <CancelButton
                type="button"
                onClick={() => setCreateOpen(false)}
                fullWidth
              />
            </div>
          </form>
        </Modal>
      )}

      {/* نافذة تفاصيل التذكرة المنبثقة (تُفتح من القائمة دون تنقّل) */}
      <TicketDetailModal
        ticketId={detailId}
        userRole={userRole}
        currentUserId={user?.id}
        onClose={() => setDetailId(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-muted ${color}`}>
          {icon}
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
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
