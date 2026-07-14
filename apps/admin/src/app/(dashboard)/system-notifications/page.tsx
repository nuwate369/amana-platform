'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  listSystemNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type SystemNotification,
} from '@/app/actions/notifications';

/** أنواع الإشعارات المتاحة للفلتر. */
const NOTIFICATION_TYPES = [
  'new_driver_registered',
  'new_ride_created',
  'new_staff_joined',
  'driver_document_expiring',
  'kyc_pending_review',
] as const;

type FilterRead = 'all' | 'unread' | 'read';

/** تحويل الوقت لنسيان نسبي. */
function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return t('systemNotifications.timeAgo.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('systemNotifications.timeAgo.minutes', { count: diffMin, defaultValue: `${diffMin} min ago` });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('systemNotifications.timeAgo.hours', { count: diffHr, defaultValue: `${diffHr} hr ago` });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t('systemNotifications.timeAgo.days', { count: diffDay, defaultValue: `${diffDay} days ago` });
  const diffWeek = Math.floor(diffDay / 7);
  return t('systemNotifications.timeAgo.weeks', { count: diffWeek, defaultValue: `${diffWeek} weeks ago` });
}

/** أيقونة نوع الإشعار. */
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    new_driver_registered: '🚗',
    new_ride_created: '🛣️',
    new_staff_joined: '👤',
    driver_document_expiring: '📋',
    kyc_pending_review: '⏳',
  };
  return map[type] ?? '🔔';
}

/** تسمية نوع الإشعار (ترجمة). */
function typeLabel(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    new_driver_registered: t('systemNotifications.type_new_driver'),
    new_ride_created: t('systemNotifications.type_new_ride'),
    new_staff_joined: t('systemNotifications.type_staff_joined'),
    driver_document_expiring: t('systemNotifications.type_document_expiring'),
    kyc_pending_review: t('systemNotifications.type_kyc_pending'),
  };
  return map[type] ?? type;
}

/** مسار التنقل حسب نوع السجل المرتبط. */
function entityRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const map: Record<string, string> = {
    driver: '/drivers',
    ride: '/rides',
    staff: '/staff',
    passenger: '/passengers',
  };
  const base = map[entityType];
  return base ? `${base}?highlight=${entityId}` : null;
}

export default function SystemNotificationsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterRead, setFilterRead] = useState<FilterRead>('all');
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const isRtl = i18n.language === 'ar';
  const lang = i18n.language;

  /** جلب الإشعارات. */
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const filters: {
      isRead?: boolean;
      type?: string;
      limit: number;
      offset: number;
    } = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (filterRead === 'unread') filters.isRead = false;
    if (filterRead === 'read') filters.isRead = true;
    if (filterType) filters.type = filterType;

    const result = await listSystemNotifications(user.id, filters);
    setNotifications(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [user, page, filterRead, filterType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /** Supabase Realtime: تحديث لحظي. */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('system_notifications_page_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_notifications',
        },
        (payload) => {
          const row = payload.new as SystemNotification | undefined;
          if (!row) return;
          const isForMe = row.target_user_id === null || row.target_user_id === user.id;
          if (!isForMe) return;
          // إعادة الجلب عند أي تغيير
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  /** النقر على إشعار. */
  const handleClick = async (notif: SystemNotification) => {
    if (!notif.is_read && user) {
      await markAsRead(notif.id, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    const route = entityRoute(notif.related_entity_type, notif.related_entity_id);
    if (route) router.push(route);
  };

  /** تحديد الكل كمقروء. */
  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  /** حذف إشعار. */
  const handleDelete = async (e: React.MouseEvent, notif: SystemNotification) => {
    e.stopPropagation();
    if (!user) return;
    await deleteNotification(notif.id, user.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setTotal((prev) => prev - 1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Bell className="h-6 w-6 text-primary shrink-0" />
            {t('systemNotifications.title')}
            <span className="hidden text-muted-foreground/30 md:inline">/</span>
            <span className="text-sm font-normal text-muted-foreground mt-0">{t('systemNotifications.subtitle')}</span>
          </h1>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <CheckCheck size={16} />
          {t('systemNotifications.markAllRead')}
        </button>
      </div>

      {/* الفلاتر */}
      <div className="flex flex-wrap items-center gap-3">
        {/* فلتر الحالة */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'unread', 'read'] as FilterRead[]).map((val) => (
            <button
              key={val}
              onClick={() => { setFilterRead(val); setPage(0); }}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                filterRead === val
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {val === 'all' ? t('systemNotifications.filterAll') : val === 'unread' ? t('systemNotifications.filterUnread') : t('systemNotifications.filterRead')}
            </button>
          ))}
        </div>

        {/* فلتر النوع */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">{t('systemNotifications.allTypes')}</option>
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* قائمة الإشعارات */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={48} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {filterRead !== 'all' || filterType
                ? t('systemNotifications.emptyFiltered')
                : t('systemNotifications.empty')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => {
              const route = entityRoute(notif.related_entity_type, notif.related_entity_id);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-start transition-colors hover:bg-muted/50 ${
                    !notif.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* أيقونة */}
                  <span className="mt-0.5 text-2xl shrink-0">{typeIcon(notif.type)}</span>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {typeLabel(notif.type, t)}
                          </span>
                          {!notif.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p
                          className={`text-sm leading-snug ${
                            !notif.is_read
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {lang === 'ar' ? notif.title_ar : notif.title_en}
                        </p>
                        {(lang === 'ar' ? notif.body_ar : notif.body_en) && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {lang === 'ar' ? notif.body_ar : notif.body_en}
                          </p>
                        )}
                      </div>

                      {/* الإجراءات */}
                      <div className="flex items-center gap-1 shrink-0">
                        {route && (
                          <span className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <ExternalLink size={14} />
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notif)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title={t('systemNotifications.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* الوقت */}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {timeAgo(notif.created_at, t)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
