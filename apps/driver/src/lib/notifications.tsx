import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

/**
 * تنبيهات المستخدم (السائقة) — تقرأ `system_notifications` الموجّهة إليها (RLS:
 * target_user_id = uid)، مع عدّاد غير مقروء لحظيّ (Realtime) للجرس، وقائمة كاملة.
 */

export interface AppNotification {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string | null;
  bodyEn: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toN(r: any): AppNotification {
  return {
    id: r.id,
    type: r.type,
    titleAr: r.title_ar,
    titleEn: r.title_en,
    bodyAr: r.body_ar ?? null,
    bodyEn: r.body_en ?? null,
    entityType: r.related_entity_type ?? null,
    entityId: r.related_entity_id ?? null,
    isRead: !!r.is_read,
    createdAt: r.created_at,
  };
}

const COLS =
  'id, type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, is_read, created_at';

export async function listNotifications(): Promise<AppNotification[]> {
  const [sysRes, annRes] = await Promise.all([
    supabase
      .from('system_notifications')
      .select(COLS)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('announcements')
      .select('id, type, title, body, created_at')
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  const sysList = (sysRes.data ?? []).map(toN);
  
  // دمج الإعلانات (Announcements) كإشعارات مقروءة مبدئياً
  // في المستقبل يمكن تخزين حالة قراءتها محلياً (AsyncStorage)
  const annList: AppNotification[] = (annRes.data ?? []).map((a: any) => ({
    id: a.id,
    type: a.type,
    titleAr: a.title,
    titleEn: a.title,
    bodyAr: a.body,
    bodyEn: a.body,
    entityType: 'announcement',
    entityId: a.id,
    isRead: false, // نعرضها كغير مقروءة دائماً أو يمكن تحسينها لاحقاً
    createdAt: a.created_at,
  }));

  const all = [...sysList, ...annList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return all;
}

export async function markRead(id: string): Promise<void> {
  await supabase.from('system_notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllRead(): Promise<void> {
  await supabase.from('system_notifications').update({ is_read: true }).eq('is_read', false);
}

interface NotificationsValue {
  unread: number;
  refresh: () => void;
}

const Ctx = createContext<NotificationsValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setUnread(0);
      return;
    }
    const { count: sysCount } = await supabase
      .from('system_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
      
    const { count: annCount } = await supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent');

    setUnread((sysCount ?? 0) + (annCount ?? 0));
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`user-notifications-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_notifications' },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  return <Ctx.Provider value={{ unread, refresh }}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotifications يجب أن يُستخدم داخل <NotificationsProvider>.');
  return v;
}
