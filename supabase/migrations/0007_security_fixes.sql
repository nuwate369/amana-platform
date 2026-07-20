-- 0007_security_fixes.sql
--
-- إصلاح ثغرات كشفتها مراجعة أمنية على الهجرات 0002–0005.
-- شغّل هذا الملفّ **بعد** جميع سابقاته.

-- ═══════════ 1) ثغرة: أيّ مستخدم يستطيع تسوية رحلة ليست له ═══════════
--
-- كان الفحص: `if auth.uid() not in (passenger_id, driver_id)`.
-- حين تكون `driver_id` فارغة (رحلة لم تُقبل بعد) يُنتج `NOT IN` القيمة NULL
-- لا TRUE، فلا يُرفع الاستثناء — فيستطيع أيّ مستخدم مسجَّل تسوية رحلة غريبة
-- عنه، وتطبيق رصيد محفظة صاحبتها، وتوليد رصيد لنفسه.
--
-- ومعها: لم يكن هناك أيّ فحص للحالة، فتُسوّى رحلة ملغاة أو لم تبدأ أصلًا.

create or replace function public.settle_ride(
  p_ride_id       uuid,
  p_method        text,
  p_cash_received numeric default null,
  p_use_wallet    boolean default true
)
returns table (
  fare         numeric,
  wallet_used  numeric,
  cash_taken   numeric,
  credit_added numeric,
  new_balance  numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride    public.rides%rowtype;
  v_uid     uuid := auth.uid();
  v_fare    numeric(10, 2);
  v_balance numeric(10, 2);
  v_wallet  numeric(10, 2) := 0;
  v_due     numeric(10, 2);
  v_cash    numeric(10, 2) := 0;
  v_credit  numeric(10, 2) := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_method not in ('cash', 'card') then
    raise exception 'invalid_payment_method';
  end if;

  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'ride_not_found';
  end if;

  -- فحص صريح لكل طرف على حدة — لا يعتمد على سلوك NOT IN مع NULL.
  if v_ride.passenger_id is distinct from v_uid
     and (v_ride.driver_id is null or v_ride.driver_id is distinct from v_uid) then
    raise exception 'not_a_party_to_this_ride';
  end if;

  -- لا تُسوّى إلا رحلة انتهت فعلًا.
  if v_ride.status <> 'completed' then
    raise exception 'ride_not_completed';
  end if;
  if v_ride.paid_at is not null then
    raise exception 'ride_already_settled';
  end if;

  v_fare := coalesce(v_ride.fare_total, v_ride.price_estimate, 0)::numeric(10, 2);

  if p_use_wallet then
    v_balance := public.wallet_balance(v_ride.passenger_id);
    v_wallet := least(greatest(v_balance, 0), v_fare);
  end if;
  v_due := v_fare - v_wallet;

  if p_method = 'cash' then
    -- النقد تؤكّده السائقة وحدها: هي من استلمه.
    if v_ride.driver_id is distinct from v_uid then
      raise exception 'only_driver_confirms_cash';
    end if;
    v_cash := greatest(coalesce(p_cash_received, v_due), 0)::numeric(10, 2);
    v_credit := greatest(v_cash - v_due, 0);
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

-- ═══════════ 2) ثغرة: register_download مكشوفة للعموم ═══════════
--
-- Postgres يمنح EXECUTE للدور PUBLIC تلقائيًّا عند إنشاء أيّ دالّة، و
-- `revoke ... from anon, authenticated` لا يمسّ منحة PUBLIC. فكانت الدالّة
-- قابلة للاستدعاء من أيّ زائر — وهي `security definer` — فيستطيع تلفيق
-- `p_ip_hash` وتسميم العدّاد وتجاوز الحدّ الساعي.

revoke execute on function public.register_download(text, integer, text, text, integer) from public;
revoke execute on function public.register_download(text, integer, text, text, integer) from anon, authenticated;
grant execute on function public.register_download(text, integer, text, text, integer) to service_role;

-- ═══════════ 3) صلاحية المحفظة تستثني مديري النظام ═══════════
--
-- `profiles.user_type` غير قابل للفراغ، فـ coalesce لا يصل إلى role أبدًا،
-- والمقارنة بـ 'admin' وحدها تستبعد super_admin و support. وبقيّة سياسات
-- المشروع تستعمل القائمة الثلاثية. ومع `for all` بلا `with check` كانت
-- الكتابة محجوبة حتى عمّن تنطبق عليه الشروط.

drop policy if exists wallet_tx_admin_all on public.wallet_transactions;
create policy wallet_tx_admin_all on public.wallet_transactions
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type::text in ('super_admin', 'admin', 'support')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type::text in ('super_admin', 'admin', 'support')
    )
  );

-- ═══════════ 4) إشعار وصول مكرّر ═══════════
--
-- تسجيل الوصول يحدّث `status` و`driver_arrived_at` في جملة واحدة، فيُطلق
-- المُشغّلَين معًا ويصل الإشعار مرّتين. مُشغّل الحالة هو المصدر الأساسي،
-- فيتنحّى مُشغّل الطابع الزمني حين تكون الحالة `arrived`.

create or replace function public.notify_ride_arrival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.driver_arrived_at is not null
     and old.driver_arrived_at is null
     -- الحالة `arrived` يغطّيها مُشغّل تغيّر الحالة؛ هذا احتياط للمسارات
     -- القديمة التي تسجّل الوصول دون تغيير الحالة.
     and new.status <> 'arrived' then
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
    raise warning 'notify_ride_arrival failed for ride %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- ═══════════ 5) تسجيل أسباب فشل الإشعارات ═══════════
-- الابتلاع الصامت أخفى عطل الأعمدة الخاطئة في 0002 حتى ظهر للمستخدم.

create or replace function public.notify_ride_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride    public.rides%rowtype;
  v_target  uuid;
  v_sender  text;
  v_preview text;
begin
  select * into v_ride from public.rides where id = new.ride_id;
  if not found then
    return new;
  end if;

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

  v_preview := left(new.message, 80) || case when length(new.message) > 80 then '…' else '' end;

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'ride_message', 'رسالة من ' || v_sender, 'New message',
    v_preview, v_preview, 'ride', new.ride_id, v_target
  );

  return new;
exception
  when others then
    raise warning 'notify_ride_message failed for ride %: %', new.ride_id, sqlerrm;
    return new;
end;
$$;
