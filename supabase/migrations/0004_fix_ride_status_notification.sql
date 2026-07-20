-- 0004_fix_ride_status_notification.sql
--
-- تصحيح مُشغّل إشعار تغيّر حالة الرحلة (أُضيف في 0002).
--
-- العطل: كُتب المُشغّل بأعمدة `title` و`body` و`ride_id`، بينما جدول
-- `system_notifications` ثنائي اللغة أصلًا (`title_ar/title_en/body_ar/body_en`)
-- ويربط بالكيانات عبر `related_entity_type` + `related_entity_id`. فكان كل
-- تغيّر حالة يفشل، وأوّل ما ظهر عند قبول السائقة للطلب:
--   column "title" of relation "system_notifications" does not exist
--
-- التصحيح يستعمل الأعمدة الحقيقية، ويكتب النصّ بالعربية والإنجليزية معًا
-- فيظهر الإشعار بلغة المستخدمة لا بلغة من ولّده.

-- العمود الذي أضافته 0002 زائد — الربط يتمّ عبر related_entity_id.
alter table public.system_notifications drop column if exists ride_id;

create or replace function public.notify_ride_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title_ar text;
  v_title_en text;
  v_body_ar  text;
  v_body_en  text;
  v_driver   text;
  v_fare     text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_driver := coalesce(new.driver_name, 'سائقتك');
  v_fare   := coalesce(new.fare_total, new.price_estimate, 0)::text;

  case new.status
    when 'matched' then
      v_title_ar := 'قبلت سائقة رحلتك';
      v_title_en := 'A driver accepted your ride';
      v_body_ar  := v_driver || ' في طريقها إليك.';
      v_body_en  := coalesce(new.driver_name, 'Your driver') || ' is on the way.';
    when 'arrived' then
      v_title_ar := 'سائقتك وصلت';
      v_title_en := 'Your driver has arrived';
      v_body_ar  := 'سائقتك بانتظارك في نقطة الالتقاء.';
      v_body_en  := 'Your driver is waiting at the pickup point.';
    when 'in_progress' then
      v_title_ar := 'بدأت رحلتك';
      v_title_en := 'Your ride has started';
      v_body_ar  := 'رحلة موفّقة — يمكنك مشاركة مسارك مع من تحبّين.';
      v_body_en  := 'Have a safe trip — you can share your route with loved ones.';
    when 'completed' then
      v_title_ar := 'انتهت رحلتك';
      v_title_en := 'Your ride is complete';
      v_body_ar  := 'الأجرة ' || v_fare || ' ريال.';
      v_body_en  := 'Fare: ' || v_fare || ' SAR.';
    when 'cancelled' then
      v_title_ar := 'أُلغيت الرحلة';
      v_title_en := 'Ride cancelled';
      v_body_ar  := coalesce(new.cancel_reason, 'أُلغيت الرحلة.');
      v_body_en  := coalesce(new.cancel_reason, 'The ride was cancelled.');
    when 'no_show' then
      v_title_ar := 'تعذّر إتمام الرحلة';
      v_title_en := 'Ride could not be completed';
      v_body_ar  := 'لم يتمّ اللقاء في نقطة الالتقاء.';
      v_body_en  := 'The pickup did not take place.';
    else
      return new;
  end case;

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'ride_status', v_title_ar, v_title_en, v_body_ar, v_body_en,
    'ride', new.id, new.passenger_id
  );

  return new;
exception
  when others then
    -- الإشعار خدمة مساندة: فشله يجب ألّا يمنع السائقة من قبول الطلب أو إنهائه.
    return new;
end;
$$;

drop trigger if exists notify_ride_status_change on public.rides;
create trigger notify_ride_status_change
  after update of status on public.rides
  for each row execute function public.notify_ride_status_change();
