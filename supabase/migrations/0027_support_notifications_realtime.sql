-- 0027_support_notifications_realtime.sql
-- (1) إشعار «تذكرة دعم جديدة» — كان في 0017 التي لم تُطبَّق، فإنشاء تذكرة لم يكن
--     يولّد إشعارًا أصلًا. (2) تفعيل البثّ الحيّ (Supabase Realtime) للجداول حتى
--     تصل الإشعارات للجرس فورًا بلا إعادة تحميل — بلا cron، ويعمل على Vercel المجاني
--     لأن الاتصال متصفّح⇄Supabase مباشرة (لا يمرّ عبر خادم Vercel).
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.

-- ============================================================
-- 1) إعداد نوع الإشعار في notification_settings
-- ============================================================
insert into public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en,
   is_enabled, show_in_app, send_email, target_roles)
values
  ('new_support_ticket_created', 'تذكرة دعم فني جديدة', 'New support ticket created',
   'إشعار عند إنشاء تذكرة دعم فني جديدة', 'Notification when a new support ticket is created',
   true, true, false, array['super_admin', 'admin', 'support'])
on conflict (notification_type) do nothing;

-- ============================================================
-- 2) دالة + trigger: إشعار الموظفين عند إنشاء تذكرة (يشمل رقم التذكرة)
-- ============================================================
create or replace function public.notify_new_support_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_name text;
  v_settings  record;
  v_category  text;
  v_priority  text;
  v_num       text := coalesce(new.ticket_number, '');
begin
  select * into v_settings from public.notification_settings
    where notification_type = 'new_support_ticket_created';
  if v_settings is null or v_settings.is_enabled = false then return new; end if;

  select full_name into v_user_name from public.profiles where id = new.user_id;
  v_user_name := coalesce(v_user_name, 'مستخدم');

  v_category := case new.category
    when 'complaint' then 'شكوى' when 'question' then 'سؤال'
    when 'suggestion' then 'اقتراح' when 'technical' then 'مشكلة تقنية'
    else new.category end;

  v_priority := case new.priority
    when 'high' then 'عالية' when 'medium' then 'متوسطة'
    when 'low' then 'منخفضة' else new.priority end;

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_support_ticket_created',
    'تذكرة دعم جديدة' || case when v_num <> '' then ' (' || v_num || ')' else '' end || ': ' || new.subject,
    'New support ticket' || case when v_num <> '' then ' (' || v_num || ')' else '' end || ': ' || new.subject,
    v_user_name || ' أنشأ تذكرة دعم فني (' || v_category || ') بأولوية ' || v_priority || '.',
    v_user_name || ' created a support ticket (' || new.category || ') with ' || new.priority || ' priority.',
    'ticket',
    new.id,
    null  -- موجّه لجميع الموظفين
  );

  return new;
end;
$$;

drop trigger if exists trigger_new_support_ticket on public.support_tickets;
create trigger trigger_new_support_ticket
  after insert on public.support_tickets
  for each row execute function public.notify_new_support_ticket();

-- ============================================================
-- 3) تفعيل البثّ الحيّ (Realtime) — إضافة الجداول لنشر supabase_realtime
--    (idempotent: لا نضيف الجدول إن كان مضافًا مسبقًا).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'system_notifications'
  ) then
    alter publication supabase_realtime add table public.system_notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end $$;

-- بيانات الصفّ الكاملة في أحداث التحديث/الحذف (الإدراج لا يحتاجها).
alter table public.system_notifications replica identity full;
alter table public.support_tickets      replica identity full;
