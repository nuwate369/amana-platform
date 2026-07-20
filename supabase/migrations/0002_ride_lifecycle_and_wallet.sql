-- 0002_ride_lifecycle_and_wallet.sql
--
-- ثلاثة أشياء مترابطة:
--   1) إغلاق الحلقات المفقودة في دورة الرحلة (وصول، تأكيد ركوب، إلغاء موثّق).
--   2) سجلّ زمني كامل لكل رحلة — يغذّي شاشة تفاصيل الرحلة في التطبيقين.
--   3) الدفع النقدي ومحفظة الرصيد.
--
-- مبدأ المحفظة: الرصيد **لا يهبط تحت الصفر أبدًا**. الدفع الزائد يصبح رصيدًا،
-- والدفع الناقص يُقفل الرحلة عند المبلغ المستلم فعلًا ولا يُنشئ دَينًا — لأنّ
-- الدَّين على راكبة قد لا تعود غير قابل للتحصيل، فتسجيله وعدٌ كاذب في الدفاتر.
-- الفارق يُحفظ للإحصاء فقط (لرصد سائقة تُنقص باستمرار).

-- ═══════════════════ 1) دورة حياة الرحلة ═══════════════════

-- حالتان جديدتان: وصول السائقة صار حالة صريحة بدل طابع زمني صامت،
-- و«لم تحضر» تفصل الإلغاء بعد الوصول عن الإلغاء العادي.
alter type ride_status add value if not exists 'arrived' after 'matched';
alter type ride_status add value if not exists 'no_show' after 'cancelled';

alter table public.rides
  add column if not exists accepted_at        timestamptz,
  add column if not exists started_at         timestamptz,
  add column if not exists cancelled_at       timestamptz,
  add column if not exists cancelled_by       uuid references auth.users (id) on delete set null,
  add column if not exists cancel_reason      text,
  -- تأكيد الراكبة أنّها ركبت فعلًا — شرط بدء المحاسبة.
  add column if not exists boarding_confirmed_at timestamptz,
  -- ما استلمته السائقة نقدًا فعلًا، وما طُبّق من رصيد المحفظة.
  add column if not exists cash_received      numeric(10, 2),
  add column if not exists wallet_applied     numeric(10, 2) not null default 0,
  -- فرق سالب = استلمت أقلّ من الأجرة (للإحصاء لا للمطالبة).
  add column if not exists settlement_diff    numeric(10, 2) not null default 0;

comment on column public.rides.boarding_confirmed_at is
  'وقت تأكيد الراكبة ركوبها. بدونه لا تنتقل الرحلة إلى in_progress.';
comment on column public.rides.settlement_diff is
  'المستلم ناقص المستحقّ. سالب = تنازلت السائقة عن الفارق. للإحصاء فقط.';

-- price_final كان يُقرأ في تقارير الإيرادات ولا يُكتب أبدًا، فكانت الإيرادات
-- تُجمَع أصفارًا. نملؤه من fare_total لكل رحلة مدفوعة سابقة، ثمّ نُبقيهما
-- متطابقين عبر مُشغّل.
update public.rides
set price_final = fare_total
where price_final is null and fare_total is not null;

create or replace function public.sync_ride_price_final()
returns trigger
language plpgsql
as $$
begin
  if new.fare_total is not null then
    new.price_final := new.fare_total;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_ride_price_final on public.rides;
create trigger sync_ride_price_final
  before insert or update of fare_total on public.rides
  for each row execute function public.sync_ride_price_final();

-- حذف حساب سائقة كان يترك driver_id فارغًا والحالة matched — رحلة يتيمة
-- عالقة للأبد والراكبة ترى سائقة غير موجودة. نُنهيها بدل ذلك.
create or replace function public.release_orphan_ride()
returns trigger
language plpgsql
as $$
begin
  if new.driver_id is null and old.driver_id is not null
     and new.status in ('matched', 'arrived', 'in_progress') then
    new.status := 'cancelled';
    new.cancelled_at := now();
    new.cancel_reason := 'driver_account_removed';
  end if;
  return new;
end;
$$;

drop trigger if exists release_orphan_ride on public.rides;
create trigger release_orphan_ride
  before update of driver_id on public.rides
  for each row execute function public.release_orphan_ride();

-- ═══════════════════ 2) إشعار الراكبة بكل تغيّر ═══════════════════
-- الراكبة كانت لا تعلم شيئًا ما لم تكن واقفة على شاشة المتابعة. هذا المُشغّل
-- يكتب صفًّا في system_notifications عند كل انتقال، فيصل عبر الاشتراك اللحظي
-- أينما كانت داخل التطبيق.

create or replace function public.notify_ride_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body  text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'matched' then
      v_title := 'قبلت سائقة رحلتك';
      v_body  := coalesce(new.driver_name, 'سائقتك') || ' في طريقها إليك.';
    when 'arrived' then
      v_title := 'سائقتك وصلت';
      v_body  := 'سائقتك بانتظارك في نقطة الالتقاء.';
    when 'in_progress' then
      v_title := 'بدأت رحلتك';
      v_body  := 'رحلة موفّقة — يمكنك مشاركة مسارك مع من تحبّين.';
    when 'completed' then
      v_title := 'انتهت رحلتك';
      v_body  := 'الأجرة ' || coalesce(new.fare_total, new.price_estimate, 0)::text || ' ريال.';
    when 'cancelled' then
      v_title := 'أُلغيت الرحلة';
      v_body  := coalesce(new.cancel_reason, 'أُلغيت الرحلة.');
    when 'no_show' then
      v_title := 'تعذّر إتمام الرحلة';
      v_body  := 'لم يتمّ اللقاء في نقطة الالتقاء.';
    else
      return new;
  end case;

  insert into public.system_notifications (type, title, body, target_user_id, ride_id)
  values ('ride_status', v_title, v_body, new.passenger_id, new.id);

  return new;
end;
$$;

-- ride_id قد لا يكون موجودًا في الجدول — نضيفه بأمان قبل تركيب المُشغّل.
alter table public.system_notifications
  add column if not exists ride_id uuid references public.rides (id) on delete cascade;

drop trigger if exists notify_ride_status_change on public.rides;
create trigger notify_ride_status_change
  after update of status on public.rides
  for each row execute function public.notify_ride_status_change();

-- ═══════════════════ 3) المحفظة ═══════════════════

create table if not exists public.wallet_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- موجب = إضافة رصيد، سالب = استخدامه. المجموع لا يهبط تحت الصفر.
  amount      numeric(10, 2) not null,
  kind        text not null check (kind in ('overpay_credit', 'ride_discount', 'admin_adjustment')),
  ride_id     uuid references public.rides (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists wallet_tx_user_idx
  on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

drop policy if exists wallet_tx_select_own on public.wallet_transactions;
create policy wallet_tx_select_own on public.wallet_transactions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists wallet_tx_admin_all on public.wallet_transactions;
create policy wallet_tx_admin_all on public.wallet_transactions
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- الرصيد محسوب من الحركات لا مكتوبًا في عمود — فلا يمكن أن يختلّ،
-- وكل ريال فيه قابل للتتبّع إلى رحلته.
create or replace function public.wallet_balance(p_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric(10, 2)
  from public.wallet_transactions
  where user_id = p_user;
$$;

grant execute on function public.wallet_balance(uuid) to authenticated;

-- ═══════════════════ 4) تسوية الرحلة ═══════════════════
-- دالّة واحدة تُقفل الجانب المالي ذرّيًّا: تطبّق الرصيد، تسجّل المستلم،
-- وتُضيف الفائض إلى المحفظة. تُستدعى من تطبيق السائقة عند الدفع النقدي،
-- ومن تطبيق الراكبة عند الدفع بالبطاقة (بلا نقد).

create or replace function public.settle_ride(
  p_ride_id       uuid,
  p_method        text,                       -- 'cash' | 'card'
  p_cash_received numeric default null,       -- ما استلمته السائقة نقدًا
  p_use_wallet    boolean default true
)
returns table (
  fare            numeric,
  wallet_used     numeric,
  cash_taken      numeric,
  credit_added    numeric,
  new_balance     numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride    public.rides%rowtype;
  v_fare    numeric(10, 2);
  v_balance numeric(10, 2);
  v_wallet  numeric(10, 2) := 0;
  v_due     numeric(10, 2);
  v_cash    numeric(10, 2) := 0;
  v_credit  numeric(10, 2) := 0;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'ride_not_found';
  end if;
  if v_ride.paid_at is not null then
    raise exception 'ride_already_settled';
  end if;
  if auth.uid() not in (v_ride.passenger_id, v_ride.driver_id) then
    raise exception 'not_a_party_to_this_ride';
  end if;

  v_fare := coalesce(v_ride.fare_total, v_ride.price_estimate, 0)::numeric(10, 2);

  -- الرصيد يُطبَّق أوّلًا فيقلّ المطلوب نقدًا.
  if p_use_wallet then
    v_balance := public.wallet_balance(v_ride.passenger_id);
    v_wallet := least(greatest(v_balance, 0), v_fare);
  end if;
  v_due := v_fare - v_wallet;

  if p_method = 'cash' then
    v_cash := coalesce(p_cash_received, v_due)::numeric(10, 2);
    -- الفائض فقط يصير رصيدًا؛ النقص يُقفل عنده ولا يُنشئ دَينًا.
    v_credit := greatest(v_cash - v_due, 0);
  else
    v_cash := 0;
    v_credit := 0;
  end if;

  if v_wallet > 0 then
    insert into public.wallet_transactions (user_id, amount, kind, ride_id, note)
    values (v_ride.passenger_id, -v_wallet, 'ride_discount', p_ride_id, 'خصم من الرصيد');
  end if;

  if v_credit > 0 then
    insert into public.wallet_transactions (user_id, amount, kind, ride_id, note)
    values (v_ride.passenger_id, v_credit, 'overpay_credit', p_ride_id, 'فرق دفع نقدي');
  end if;

  update public.rides
  set paid_at         = now(),
      payment_method  = p_method,
      fare_total      = v_fare,
      cash_received   = case when p_method = 'cash' then v_cash else null end,
      wallet_applied  = v_wallet,
      settlement_diff = case when p_method = 'cash' then v_cash - v_due else 0 end
  where id = p_ride_id;

  return query
  select v_fare, v_wallet, v_cash, v_credit, public.wallet_balance(v_ride.passenger_id);
end;
$$;

grant execute on function public.settle_ride(uuid, text, numeric, boolean) to authenticated;
