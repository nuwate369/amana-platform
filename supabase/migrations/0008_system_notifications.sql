-- ============================================================
-- 0008_system_notifications.sql
-- نظام الإشعارات الداخلي لفريق الإدارة
-- ============================================================

-- ===== 1. جدول system_notifications =====

create table if not exists public.system_notifications (
  id                 uuid primary key default gen_random_uuid(),
  type               text        not null,
  title_ar           text        not null,
  title_en           text        not null,
  body_ar            text,
  body_en            text,
  related_entity_type text,
  related_entity_id  uuid,
  target_user_id     uuid references public.profiles(id) on delete cascade,
  is_read            boolean     not null default false,
  created_at         timestamptz not null default now()
);

-- فهرس لتسريع جلب الإشعارات غير المقروءة لكل مستخدم
create index if not exists idx_system_notifications_lookup
  on public.system_notifications (target_user_id, is_read, created_at desc);

-- فهرس إضافي للإشعارات العامة (target_user_id IS NULL)
create index if not exists idx_system_notifications_global
  on public.system_notifications (is_read, created_at desc)
  where target_user_id is null;

-- تفعيل RLS
alter table public.system_notifications enable row level security;

-- ===== 2. سياسات RLS =====

-- قراءة: فقط الموظفون (platform_staff) يقرأون
-- كل موظف يرى: إشعاراته الخاصة + الإشعارات العامة (target_user_id = NULL)
drop policy if exists system_notifications_select_staff on public.system_notifications;
create policy system_notifications_select_staff
  on public.system_notifications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  );

-- تحديث is_read: فقط صاحب الإشعار (أو أي موظف إذا كان عاماً)
drop policy if exists system_notifications_update_read on public.system_notifications;
create policy system_notifications_update_read
  on public.system_notifications for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- حذف: فقط صاحب الإشعار (للقائمة العامة: أي موظف)
drop policy if exists system_notifications_delete_staff on public.system_notifications;
create policy system_notifications_delete_staff
  on public.system_notifications for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  );

-- الإدراج: فقط عبر service_role أو Triggers (لا يسمح لأي مستخدم عادي)
-- لا يوجد INSERT policy — يعني فقط service_role يمكنه الإدراج

-- ===== 3. دالة مساعدة: التحقق من نوع المستخدم =====

create or replace function public.is_staff_user(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and user_type in ('super_admin', 'admin', 'support')
  );
$$;

-- ===== 4. Triggers التلقائية =====

-- 4a. عند إدراج سائقة جديدة (pending) → إشعار عام
create or replace function public.notify_new_driver_registered()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_driver_registered',
    'تم تسجيل سائقة جديدة: ' || v_name,
    'New driver registered: ' || v_name,
    'سائقة جديدة (' || v_name || ') قامت بالتسجيل وحالتها: معلّق.',
    'A new driver (' || v_name || ') has registered. Status: pending.',
    'driver',
    new.id,
    null
  );
  return new;
end;
$$;

drop trigger if exists trigger_new_driver_registered on public.drivers;
create trigger trigger_new_driver_registered
  after insert on public.drivers
  for each row execute function public.notify_new_driver_registered();

-- 4b. عند إنشاء رحلة جديدة → إشعار عام (قابل للتعطيل لاحقاً)
create or replace function public.notify_new_ride_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_passenger_name text;
begin
  select full_name into v_passenger_name from public.profiles where id = new.passenger_id;
  v_passenger_name := coalesce(v_passenger_name, 'ركّابة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_ride_created',
    'رحلة جديدة: ' || v_passenger_name,
    'New ride: ' || v_passenger_name,
    'رحلة جديدة طلبها ' || v_passenger_name || ' من ' || coalesce(new.pickup_address, 'موقع غير محدد') || ' إلى ' || coalesce(new.dropoff_address, 'موقع غير محدد') || '.',
    'New ride requested by ' || v_passenger_name || ' from ' || coalesce(new.pickup_address, 'unknown') || ' to ' || coalesce(new.dropoff_address, 'unknown') || '.',
    'ride',
    new.id,
    null
  );
  return new;
end;
$$;

drop trigger if exists trigger_new_ride_created on public.rides;
create trigger trigger_new_ride_created
  after insert on public.rides
  for each row execute function public.notify_new_ride_created();

-- 4c. عند قبول دعوة موظف جديد وتفعيل حسابه → إشعار عام
create or replace function public.notify_new_staff_joined()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  -- فقط عند إنشاء حساب موظف جديد (ليس راكبة أو سائقة)
  if new.user_type in ('super_admin', 'admin', 'support') then
    select full_name into v_name from public.profiles where id = new.id;
    v_name := coalesce(v_name, 'موظف جديد');

    insert into public.system_notifications (
      type, title_ar, title_en, body_ar, body_en,
      related_entity_type, related_entity_id, target_user_id
    ) values (
      'new_staff_joined',
      'انضم موظف جديد: ' || v_name,
      'New staff joined: ' || v_name,
      'الموظف ' || v_name || ' (' || new.user_type || ') انضم لفريق الإدارة.',
      'Staff member ' || v_name || ' (' || new.user_type || ') has joined the admin team.',
      'staff',
      new.id,
      null
    );
  end if;
  return new;
end;
$$;

-- نستخدم AFTER INSERT على auth.users مع فحص نوع المستخدم
-- لكن trigger على profiles أكثر موثوقية لأنه يحتوي user_type
drop trigger if exists trigger_new_staff_joined on public.profiles;
create trigger trigger_new_staff_joined
  after insert on public.profiles
  for each row execute function public.notify_new_staff_joined();

-- 4d. عند اقتراب انتهاء صلاحية مستند KYC ( إن وُجد حقل تاريخ الانتهاء)
-- ملاحظة: لا يوجد حقل تاريخ انتهاء في جدول drivers الحالي
-- سندعمه عند إضافة الحقل لاحقاً via function يدوية
-- يمكنك استدعاء add_document_expiring_notification() يدوياً أو عبر Cron

create or replace function public.add_document_expiring_notification(
  p_driver_id uuid,
  p_days_left int default 7
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = p_driver_id;
  v_name := coalesce(v_name, 'سائقة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'driver_document_expiring',
    'مستندات السائقة ' || v_name || ' تنتهي خلال ' || p_days_left || ' يوم',
    'Driver documents expiring in ' || p_days_left || ' days: ' || v_name,
    'تنبيه: مستندات KYC للسائقة ' || v_name || ' ستنتهي الصلاحية خلال ' || p_days_left || ' يوم. يرجى المتابعة.',
    'Warning: KYC documents for driver ' || v_name || ' will expire in ' || p_days_left || ' days. Please follow up.',
    'driver',
    p_driver_id,
    null
  );
end;
$$;
