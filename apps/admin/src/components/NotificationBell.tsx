'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  getRecentNotifications,
  getUnreadCount,
  markAsRead,
  type SystemNotification,
} from '@/app/actions/notifications';

/** تحويل الوقت لنسيان نسبي (منذ X دقائق/ساعات/أيام). */
function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return t('systemNotifications.timeAgo.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('systemNotifications.timeAgo.minutes', { count: diffMin, defaultValue: `${diffMin} minutes ago` });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('systemNotifications.timeAgo.hours', { count: diffHr, defaultValue: `${diffHr} hours ago` });
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

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  /** جلب عدد غير المقروءة. */
  const refreshUnread = useCallback(async () => {
    if (!user) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  }, [user]);

  /** جلب آخر الإشعارات. */
  const refreshList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getRecentNotifications(user.id, 10);
    setNotifications(data);
    setLoading(false);
  }, [user]);

  /** تحميل أولي. */
  useEffect(() => {
    refreshUnread();
    refreshList();
  }, [refreshUnread, refreshList]);

  /** Supabase Realtime: الاشتراك في التغييرات اللحظية. */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('system_notifications_realtime')
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

          // تحقق مما إذا كان الإشعار موجهاً للمستخدم الحالي أو عاماً
          const isForMe = row.target_user_id === null || row.target_user_id === user.id;
          if (!isForMe) return;

          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [row, ...prev].slice(0, 10));
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === row.id ? row : n))
            );
            refreshUnread();
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== row.id));
            refreshUnread();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUnread]);

  /** إغلاق القائمة عند الضغط خارجها. */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** النقر على إشعار. */
  const handleNotificationClick = async (notif: SystemNotification) => {
    // تحديد كمقروء
    if (!notif.is_read && user) {
      await markAsRead(notif.id, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // التنقل للسجل المرتبط
    const route = entityRoute(notif.related_entity_type, notif.related_entity_id);
    if (route) {
      setOpen(false);
      router.push(route);
    }
  };

  const lang = i18n.language;
  const getText = (notif: SystemNotification) =>
    lang === 'ar' ? notif.title_ar : notif.title_en;

  return (
    <div className="relative">
      {/* زر الجرس */}
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700 transition-colors"
        aria-label={t('systemNotifications.bell')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div
          dir="rtl"
          ref={dropdownRef}
          className="absolute end-0 top-full mt-2 z-50 w-80 md:w-96 max-w-[calc(100vw-1rem)] rounded-xl bg-white dark:bg-brand-800 border border-brand-200 dark:border-brand-700 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden"
        >
          {/* رأس القائمة */}
          <div className="flex items-center justify-between border-b border-brand-100 dark:border-brand-700 px-4 py-3">
            <h3 className="text-sm font-bold text-brand-800 dark:text-brand-100">
              {t('systemNotifications.title')}
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {unreadCount}
              </span>
            )}
          </div>

          {/* قائمة الإشعارات */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-brand-400">
                {t('common.loading')}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-brand-400">
                {t('systemNotifications.noNotifications')}
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-brand-50 dark:hover:bg-brand-700/50 border-b border-brand-50 dark:border-brand-700/50 last:border-0 ${
                    !notif.is_read ? 'bg-accent-500/5 dark:bg-accent-500/10' : ''
                  }`}
                >
                  {/* أيقونة النوع */}
                  <span className="mt-0.5 text-lg shrink-0">{typeIcon(notif.type)}</span>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-snug ${
                          !notif.is_read
                            ? 'font-semibold text-brand-900 dark:text-brand-50'
                            : 'text-brand-600 dark:text-brand-300'
                        }`}
                      >
                        {getText(notif)}
                      </p>
                      {!notif.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-brand-400 dark:text-brand-500">
                      {timeAgo(notif.created_at, t)}
                    </p>
                  </div>

                  {/* رمز التنقل */}
                  {entityRoute(notif.related_entity_type, notif.related_entity_id) && (
                    <ExternalLink size={12} className="mt-1 shrink-0 text-brand-300 dark:text-brand-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* ذيل القائمة */}
          <div className="border-t border-brand-100 dark:border-brand-700 px-4 py-2.5">
            <Link
              href="/system-notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-700 py-2 text-xs font-semibold text-brand-600 dark:text-brand-200 transition-colors hover:bg-brand-100 dark:hover:bg-brand-600"
            >
              {t('systemNotifications.viewAll')}
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
