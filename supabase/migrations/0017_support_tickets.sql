-- ============================================================
-- 0017_support_tickets.sql
-- منصة أمانة — نظام التذاكر والدعم الفني
--
-- support_tickets: تذاكر الدعم الفني من الركاب/السائقين
-- ticket_messages: رسائل المحادثة داخل كل تذكرة
--
-- معايير:
--   - الحد الأقصى 10 تذاكر مفتوحة في نفس الوقت
--   - الأولوية: عالية (شكاوى)، متوسطة (أسئلة)، منخفضة (اقتراحات)
--   - الحالة: جديد → قيد المعالجة → مغلق
--
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) جدول التذاكر
-- ------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_role   user_role not null,
  subject     text not null,
  description text not null,
  category    text not null check (category in ('complaint', 'question', 'suggestion', 'technical')),
  priority    text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_support_tickets_user   on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_assigned on public.support_tickets (assigned_to);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) جدول الرسائل
-- ------------------------------------------------------------
create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role user_role not null,
  message     text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket on public.ticket_messages (ticket_id);

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.ticket_messages  enable row level security;

-- التذاكر: الموظفون يرون جميع التذاكر، المستخدمون يرون تذاكرهم فقط
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
    or user_id = auth.uid()
  );

-- إنشاء تذكرة: أي مستخدم مسجّل (限额 10 تذاكر مفتوحة تُتحقق في الكود)
drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert with check (user_id = auth.uid());

-- تحديث التذاكر: الموظفون فقط (لتحديث الحالة والتخصيص)
drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- الرسائل: أطراف التذكرة والموظفون
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- إرسال رسالة: أطراف التذكرة فقط (الرسائل الداخلية للموظفين فقط)
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      not is_internal
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
      )
    )
  );

-- ============================================================
-- ملاحظات:
-- - الحد الأقصى 10 تذاكر مفتوحة يُتحقق في server actions (لا يمكن فرضه بـ DB trigger بسهولة)
-- - الأولوية الافتراضية 'medium'؛ يمكن تغييرها عند الإنشاء
-- - is_internal: رسائل داخلية لا يراها المستخدم (للتنسيق بين الموظفين)
-- ============================================================

-- ------------------------------------------------------------
-- 4) إشعار عند إنشاء تذكرة جديدة
-- ------------------------------------------------------------

-- 4a) إضافة نوع الإشعار إلى notification_settings
INSERT INTO public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en, is_enabled, show_in_app, send_email, target_roles)
VALUES
  ('new_support_ticket_created', 'تذكرة دعم فني جديدة', 'New support ticket created', 'إشعار عند إنشاء تذكرة دعم فني جديدة', 'Notification when a new support ticket is created', true, true, false, ARRAY['super_admin', 'admin', 'support'])
ON CONFLICT (notification_type) DO NOTHING;

-- 4b) دالة الإشعار
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_name text;
  v_settings RECORD;
  v_category text;
  v_priority text;
BEGIN
  -- فحص الإعدادات
  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_support_ticket_created';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  -- جلب اسم صاحب التذكرة
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = new.user_id;
  v_user_name := COALESCE(v_user_name, 'مستخدم');

  -- ترجمة النوع والأولوية
  v_category := CASE new.category
    WHEN 'complaint' THEN 'شكوى'
    WHEN 'question' THEN 'سؤال'
    WHEN 'suggestion' THEN 'اقتراح'
    WHEN 'technical' THEN 'مشكلة تقنية'
    ELSE new.category
  END;

  v_priority := CASE new.priority
    WHEN 'high' THEN 'عالية'
    WHEN 'medium' THEN 'متوسطة'
    WHEN 'low' THEN 'منخفضة'
    ELSE new.priority
  END;

  -- إدراج الإشعار العام (target_user_id = null = جميع الموظفين)
  INSERT INTO public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) VALUES (
    'new_support_ticket_created',
    'تذكرة دعم جديدة: ' || new.subject,
    'New support ticket: ' || new.subject,
    v_user_name || ' أنشأ تذكرة دعم فني (' || v_category || ') بأولوية ' || v_priority || '.',
    v_user_name || ' created a support ticket (' || new.category || ') with ' || new.priority || ' priority.',
    'ticket',
    new.id,
    null
  );

  RETURN new;
END;
$$;

-- 4c) Trigger على support_tickets
DROP TRIGGER IF EXISTS trigger_new_support_ticket ON public.support_tickets;
CREATE TRIGGER trigger_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_ticket();
