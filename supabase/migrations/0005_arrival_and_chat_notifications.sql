-- 0005_arrival_and_chat_notifications.sql
--
-- سدّ ثلاث ثغرات جعلت الإشعارات بلا فائدة عمليًّا:
--
--  1) «وصلت» لم تكن تُنتج إشعارًا إطلاقًا، لأنّ الوصول كان يُسجَّل في عمود
--     `driver_arrived_at` فقط ولا يغيّر الحالة — ومُشغّل الإشعار يستمع لتغيّر
--     الحالة. الآن صارت `arrived` حالة صريحة (أُضيفت في 0002)، فنجعل المُشغّل
--     يلتقط تغيّر الطابع الزمني أيضًا احتياطًا لأيّ مسار قديم.
--
--  2) رسائل المحادثة لم تكن تُنتج إشعارًا للطرف الآخر إطلاقًا.
--
--  3) الراكبة لم تكن تعلم أنّ لديها رحلة جارية إن غادرت شاشة المتابعة.
--     (تُعالَج في التطبيق — هذا الملفّ يوفّر الدالّة التي يقرأ منها.)

-- ═══════════ 1) إشعار الوصول ولو لم تتغيّر الحالة ═══════════

create or replace function public.notify_ride_arrival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.driver_arrived_at is not null and old.driver_arrived_at is null then
    insert into public.system_notifications (
      type, title_ar, title_en, body_ar, body_en,
      related_entity_type, related_entity_id, target_user_id
    ) values (
      'ride_status',
      'سائقتك وصلت',
      'Your driver has arrived',
      coalesce(new.driver_name, 'سائقتك') || ' بانتظارك في نقطة الالتقاء.',
      coalesce(new.driver_name, 'Your driver') || ' is waiting at the pickup point.',
      'ride', new.id, new.passenger_id
    );
  end if;
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists notify_ride_arrival on public.rides;
create trigger notify_ride_arrival
  after update of driver_arrived_at on public.rides
  for each row execute function public.notify_ride_arrival();

-- ═══════════ 2) إشعار رسالة المحادثة ═══════════

create or replace function public.notify_ride_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride      public.rides%rowtype;
  v_target    uuid;
  v_sender    text;
  v_preview   text;
begin
  select * into v_ride from public.rides where id = new.ride_id;
  if not found then
    return new;
  end if;

  -- المستلم هو الطرف الآخر في الرحلة.
  v_target := case
    when new.sender_role = 'driver' then v_ride.passenger_id
    else v_ride.driver_id
  end;

  if v_target is null then
    return new;
  end if;

  v_sender := case
    when new.sender_role = 'driver' then coalesce(v_ride.driver_name, 'سائقتك')
    else coalesce(v_ride.passenger_name, 'راكبتك')
  end;

  -- مقتطف قصير: الإشعار دعوة لفتح المحادثة لا بديل عنها.
  v_preview := left(new.message, 80) || case when length(new.message) > 80 then '…' else '' end;

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'ride_message',
    'رسالة من ' || v_sender,
    'New message',
    v_preview,
    v_preview,
    'ride', new.ride_id, v_target
  );

  return new;
exception
  when others then
    -- فشل الإشعار يجب ألّا يمنع إرسال الرسالة نفسها.
    return new;
end;
$$;

drop trigger if exists notify_ride_message on public.ride_messages;
create trigger notify_ride_message
  after insert on public.ride_messages
  for each row execute function public.notify_ride_message();

-- ═══════════ 3) الرحلة الجارية للراكبة ═══════════
-- استعلام واحد تقرأ منه الشاشة الرئيسية، فتعرف الراكبة أنّ لديها رحلة قائمة
-- أينما كانت — ولا تستطيع طلب رحلة ثانية فوقها.

create or replace function public.my_active_ride()
returns table (
  id            uuid,
  status        text,
  driver_name   text,
  driver_id     uuid,
  price_estimate numeric,
  arrived_at    timestamptz,
  requested_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.status::text, r.driver_name, r.driver_id,
         r.price_estimate, r.driver_arrived_at, r.requested_at
  from public.rides r
  where r.passenger_id = auth.uid()
    and r.status in ('requested', 'matched', 'arrived', 'in_progress')
  order by r.requested_at desc
  limit 1;
$$;

grant execute on function public.my_active_ride() to authenticated;
