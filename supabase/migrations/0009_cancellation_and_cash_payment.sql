-- ═══════════════════════════════════════════════════════════════════════
-- 0009 — الإلغاء من الطرفين، والدفع النقدي بتأكيد السائقة
--
-- الرحلة عقد بين طرفين، وكانت مكتوبة كأنّها من طرف واحد: السائقة تصل وتبدأ
-- وتُنهي، والراكبة تُشاهد. ثمّ الراكبة تدفع، والسائقة لا تعلم. ولا أحد منهما
-- يستطيع الانسحاب. هذه الهجرة تُكمل الطرف الناقص في الحدثين الحسّاسين:
-- الانسحاب، والمال.
--
-- لماذا في قاعدة البيانات لا في التطبيق؟ لأنّ «مَن يحقّ له الإلغاء ومتى»
-- و«مَن يؤكّد قبض النقد» قواعدُ مال. لو عاشت في التطبيق لكفى تعديلُ نسخة
-- واحدة لتجاوزها.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────── 1) الأعمدة ───────────

alter table public.rides
  -- سبب مُصنَّف لا نصّ حرّ: النصّ الحرّ لا يُحصى ولا يُحاسَب عليه.
  add column if not exists cancel_reason_code text,
  -- رسم الإلغاء المحتسب. يُسجَّل ولا يُخصم تلقائيًّا في هذه المرحلة:
  -- الخصم من رصيد فارغ يُنشئ دَينًا، وآليّة الدَّين لم تُبنَ بعد.
  add column if not exists cancellation_fee numeric(10, 2),
  -- إعلان الراكبة أنّها ستدفع نقدًا. الإعلان ليس دفعًا: المال لا يُقفل
  -- إلّا بتأكيد مَن قبضه فعلًا.
  add column if not exists cash_pending_at timestamptz;

comment on column public.rides.cancellation_fee is
  'رسم الإلغاء المحتسب بالريال. مسجَّل للمحاسبة، غير مخصوم آليًّا.';
comment on column public.rides.cash_pending_at is
  'وقت اختيار الراكبة الدفع نقدًا. الدفع لا يكتمل إلّا بتأكيد السائقة.';

-- المهلة المجانية بعد قبول السائقة. بعدها تكون السائقة قد تحرّكت فعلًا،
-- فالإلغاء يُكلّفها وقودًا ووقتًا.
-- الرسم ثابت مؤقّتًا هنا؛ ينتقل إلى وحدة التسعير حين تُبنى.
create or replace function public.cancellation_grace_seconds() returns int
  language sql immutable as $$ select 120 $$;

create or replace function public.cancellation_fee_amount() returns numeric
  language sql immutable as $$ select 5.00::numeric $$;

-- ─────────── 2) إلغاء الراكبة ───────────

create or replace function public.cancel_ride_by_passenger(
  p_ride_id uuid,
  p_reason_code text default 'passenger_changed_mind'
)
returns table (cancelled boolean, fee numeric, was_free boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_free boolean;
  v_fee  numeric(10, 2) := 0;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'ride_not_found';
  end if;

  -- التحقّق صريح لكل طرف على حدة. الصيغة المختصرة
  -- `auth.uid() not in (passenger_id, driver_id)` تُنتج NULL لا TRUE حين
  -- يكون أحد الطرفين فارغًا، فتمرّ الحراسة صامتةً.
  if v_ride.passenger_id is null or auth.uid() is null
     or auth.uid() <> v_ride.passenger_id then
    raise exception 'not_the_passenger_of_this_ride';
  end if;

  -- الرحلة الجارية لا تُلغى — الراكبة بداخل المركبة. إنهاؤها المبكّر
  -- حدثٌ آخر له تسويته المالية.
  if v_ride.status not in ('requested', 'matched', 'arrived') then
    raise exception 'ride_not_cancellable';
  end if;

  -- قبل القبول لا سائقة تخسر شيئًا، فالإلغاء مجاني دائمًا.
  v_free := v_ride.accepted_at is null
    or now() - v_ride.accepted_at <= make_interval(secs => public.cancellation_grace_seconds());

  if not v_free then
    v_fee := public.cancellation_fee_amount();
  end if;

  update public.rides
  set status             = 'cancelled',
      cancelled_at       = now(),
      cancelled_by       = auth.uid(),
      cancel_reason_code = p_reason_code,
      cancel_reason      = case
        when v_free then 'ألغت الراكبة الطلب.'
        else 'ألغت الراكبة الطلب بعد انتهاء المهلة المجانية.'
      end,
      cancellation_fee   = nullif(v_fee, 0)
  where id = p_ride_id;

  return query select true, v_fee, v_free;
end;
$$;

revoke execute on function public.cancel_ride_by_passenger(uuid, text) from public;
grant execute on function public.cancel_ride_by_passenger(uuid, text) to authenticated;

-- ─────────── 3) إلغاء السائقة ───────────

-- إلغاء السائقة بعد القبول يترك الراكبة في الشارع، فلا يكون بلا سبب مُصرَّح
-- ولا بلا أثر. الأسباب محصورة كي تُحصى في تقييم السائقة.
create or replace function public.driver_cancel_reasons() returns text[]
  language sql immutable as $$
    select array['vehicle_issue', 'emergency', 'passenger_no_show',
                 'unsafe_situation', 'wrong_location']
  $$;

create or replace function public.cancel_ride_by_driver(
  p_ride_id uuid,
  p_reason_code text
)
returns table (cancelled boolean, counted_against_driver boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride    public.rides%rowtype;
  v_counted boolean;
begin
  if p_reason_code is null or not (p_reason_code = any (public.driver_cancel_reasons())) then
    raise exception 'invalid_cancel_reason';
  end if;

  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'ride_not_found';
  end if;

  if v_ride.driver_id is null or auth.uid() is null or auth.uid() <> v_ride.driver_id then
    raise exception 'not_the_driver_of_this_ride';
  end if;

  if v_ride.status not in ('matched', 'arrived') then
    raise exception 'ride_not_cancellable';
  end if;

  -- «الراكبة لم تحضر» ليس خطأ السائقة، فلا يُحسب عليها — وله حالة خاصّة
  -- تميّزه عن الانسحاب.
  v_counted := p_reason_code <> 'passenger_no_show';

  update public.rides
  set status             = case when p_reason_code = 'passenger_no_show'
                                then 'no_show' else 'cancelled' end,
      cancelled_at       = now(),
      cancelled_by       = auth.uid(),
      cancel_reason_code = p_reason_code,
      cancel_reason      = case p_reason_code
        when 'vehicle_issue'     then 'اعتذرت السائقة لعطل في المركبة.'
        when 'emergency'         then 'اعتذرت السائقة لظرف طارئ.'
        when 'passenger_no_show' then 'لم تحضر الراكبة إلى نقطة الالتقاء.'
        when 'unsafe_situation'  then 'أُلغيت الرحلة لدواعٍ تتعلّق بالسلامة.'
        when 'wrong_location'    then 'تعذّر الوصول إلى نقطة الالتقاء.'
      end
  where id = p_ride_id;

  -- لا تحديث للتوفّر هنا: حالة السائقة تعيش في Realtime Presence لا في
  -- جدول، والتطبيق يُعيدها إلى «متاحة» بمجرّد خروجها من الرحلة.

  return query select true, v_counted;
end;
$$;

revoke execute on function public.cancel_ride_by_driver(uuid, text) from public;
grant execute on function public.cancel_ride_by_driver(uuid, text) to authenticated;

-- عدّاد إلغاءات السائقة المحسوبة عليها — مشتقّ لا مخزَّن، فلا يتباعد عن الواقع.
create or replace function public.driver_cancellation_stats(p_driver_id uuid)
returns table (cancelled_count bigint, completed_count bigint, cancel_rate numeric)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where status = 'cancelled' and cancelled_by = p_driver_id),
    count(*) filter (where status = 'completed'),
    round(
      count(*) filter (where status = 'cancelled' and cancelled_by = p_driver_id)::numeric
      / nullif(count(*) filter (where status in ('cancelled', 'completed')), 0) * 100,
      1
    )
  from public.rides
  where driver_id = p_driver_id;
$$;

grant execute on function public.driver_cancellation_stats(uuid) to authenticated;

-- ─────────── 4) الدفع النقدي بتأكيد السائقة ───────────

-- الراكبة تُعلن نيّتها الدفع نقدًا. لا مال يُقفل هنا: مَن يقبض هو مَن يؤكّد.
create or replace function public.declare_cash_payment(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'ride_not_found';
  end if;
  if v_ride.passenger_id is null or auth.uid() is null
     or auth.uid() <> v_ride.passenger_id then
    raise exception 'not_the_passenger_of_this_ride';
  end if;
  if v_ride.paid_at is not null then
    raise exception 'ride_already_settled';
  end if;
  if v_ride.status <> 'completed' then
    raise exception 'ride_not_completed';
  end if;

  update public.rides
  set payment_method = 'cash', cash_pending_at = now()
  where id = p_ride_id;

  -- السائقة لم تكن تعلم أنّ الراكبة دفعت. الآن تعلم أنّ عليها القبض.
  insert into public.system_notifications
    (target_user_id, type, title_ar, title_en, body_ar, body_en,
     related_entity_type, related_entity_id)
  values (
    v_ride.driver_id, 'ride_payment',
    'دفع نقدي بانتظارك', 'Cash payment pending',
    'اختارت الراكبة الدفع نقدًا. أكّدي استلام المبلغ.',
    'The passenger chose to pay in cash. Please confirm receipt.',
    'ride', p_ride_id
  );
exception when others then
  -- فشل الإشعار لا يُبطل إعلان الدفع.
  return;
end;
$$;

revoke execute on function public.declare_cash_payment(uuid) from public;
grant execute on function public.declare_cash_payment(uuid) to authenticated;

-- تأكيد السائقة قبضَ المبلغ — وهي وحدها من يملكه.
create or replace function public.confirm_cash_received(
  p_ride_id uuid,
  p_amount  numeric default null
)
returns table (fare numeric, wallet_used numeric, cash_taken numeric,
               credit_added numeric, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid;
begin
  select driver_id into v_driver from public.rides where id = p_ride_id;
  if v_driver is null or auth.uid() is null or auth.uid() <> v_driver then
    raise exception 'not_the_driver_of_this_ride';
  end if;

  return query select * from public.settle_ride(p_ride_id, 'cash', p_amount, true);
end;
$$;

revoke execute on function public.confirm_cash_received(uuid, numeric) from public;
grant execute on function public.confirm_cash_received(uuid, numeric) to authenticated;

-- ─────────── 5) إشعار الراكبة باكتمال الدفع ───────────

create or replace function public.notify_cash_settled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paid_at is not null and old.paid_at is null and new.payment_method = 'cash' then
    insert into public.system_notifications
      (target_user_id, type, title_ar, title_en, body_ar, body_en,
       related_entity_type, related_entity_id)
    values (
      new.passenger_id, 'ride_payment',
      'تمّ تأكيد الدفع', 'Payment confirmed',
      'أكّدت السائقة استلام المبلغ. شكرًا لك.',
      'The driver confirmed receiving the payment. Thank you.',
      'ride', new.id
    );
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists notify_cash_settled on public.rides;
create trigger notify_cash_settled
  after update of paid_at on public.rides
  for each row execute function public.notify_cash_settled();
