-- 0006_pending_payment.sql
--
-- الرحلة المنتهية غير المدفوعة عمل غير مكتمل، لا رحلة منتهية.
--
-- العطل: بعد ضغط السائقة «إنهاء الرحلة» تُغلق شاشة المتابعة عند الراكبة،
-- ولا شيء في التطبيق يعيدها إلى الدفع. تُغلق التطبيق أو ينفد شحن جوالها
-- فتضيع الأجرة نهائيًّا — والسائقة تبقى عالقة بانتظار دفع لن يأتي.
--
-- الإصلاح: `my_active_ride` تعيد أيضًا الرحلة المكتملة التي لم يُسجَّل لها
-- `paid_at`، فتظهر في الشاشة الرئيسية كعمل معلّق مهما أُغلق التطبيق.

drop function if exists public.my_active_ride();

create or replace function public.my_active_ride()
returns table (
  id             uuid,
  status         text,
  driver_name    text,
  driver_id      uuid,
  price_estimate numeric,
  fare_total     numeric,
  arrived_at     timestamptz,
  requested_at   timestamptz,
  paid_at        timestamptz,
  needs_payment  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.status::text,
    r.driver_name,
    r.driver_id,
    r.price_estimate,
    r.fare_total,
    r.driver_arrived_at,
    r.requested_at,
    r.paid_at,
    (r.status = 'completed' and r.paid_at is null) as needs_payment
  from public.rides r
  where r.passenger_id = auth.uid()
    and (
      r.status in ('requested', 'matched', 'arrived', 'in_progress')
      -- المكتملة تبقى «نشطة» حتى تُدفع.
      or (r.status = 'completed' and r.paid_at is null)
    )
  order by r.requested_at desc
  limit 1;
$$;

grant execute on function public.my_active_ride() to authenticated;
