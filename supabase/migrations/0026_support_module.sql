-- 0026_support_module.sql
-- وحدة الدعم الفني الكاملة + رفع صورة المستخدم (avatars).
-- مكتفية بذاتها وتراكمية (idempotent): تُنشئ جداول الدعم إن لم تكن موجودة
-- (هجرة 0017 قد لا تكون طُبّقت) ثم تضيف التحسينات:
--   • ترقيم تذاكر بشري ببادئة لكل تطبيق: dri/pas/adm + YYMM + تسلسل 4 أرقام.
--   • 5 حالات: open(جديد) · in_progress(قيد العمل) · resolved(بانتظار رد العميل)
--             · closed(منتهي) · cancelled(ملغي — من العميل).
--   • حدّ 5 تذاكر غير مُغلقة (يُتحقّق في الكود أيضًا).
--   • إلغاء العميل لتذكرته + استبيان رضا (تقييم + تعليق) اختياري بعد الإغلاق.
--   • bucket «avatars» عام لرفع صورة المستخدم.
-- يُطبَّق يدويًا: Supabase SQL Editor → Run.

-- ============================================================
-- 0) دالة تحديث updated_at (إن لم توجد)
-- ============================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1) الجداول (تُنشأ إن غابت — أعمدة text لتفادي اعتماد enums)
-- ============================================================
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_role   text not null,
  subject     text not null,
  description text not null,
  category    text not null,
  priority    text not null default 'medium',
  status      text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  message     text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 2) أعمدة التحسينات (idempotent على جدول قائم أو جديد)
-- ============================================================
alter table public.support_tickets add column if not exists ticket_number      text;
alter table public.support_tickets add column if not exists survey_sent_at      timestamptz;
alter table public.support_tickets add column if not exists survey_rating       int;
alter table public.support_tickets add column if not exists survey_comment      text;
alter table public.support_tickets add column if not exists survey_answered_at  timestamptz;

create unique index if not exists idx_support_ticket_number
  on public.support_tickets (ticket_number);

-- حالات موحّدة (5) — نُسقط القيد القديم ونعيد إنشاءه شاملًا cancelled.
alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed', 'cancelled'));

-- تصنيفات التذكرة (متوافقة مع تطبيق السائقة).
alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets
  add constraint support_tickets_category_check
  check (category in ('complaint', 'question', 'suggestion', 'technical'));

alter table public.support_tickets drop constraint if exists support_tickets_priority_check;
alter table public.support_tickets
  add constraint support_tickets_priority_check
  check (priority in ('high', 'medium', 'low'));

alter table public.support_tickets drop constraint if exists support_tickets_survey_rating_check;
alter table public.support_tickets
  add constraint support_tickets_survey_rating_check
  check (survey_rating is null or survey_rating between 1 and 5);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create index if not exists idx_support_tickets_user     on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status   on public.support_tickets (status);
create index if not exists idx_ticket_messages_ticket   on public.ticket_messages (ticket_id);

-- ============================================================
-- 3) ترقيم التذاكر: <بادئة><YYMM><تسلسل 4> — dri26070001
-- ============================================================
-- عدّاد لكل (بادئة، شهر) لضمان التسلسل الذرّي (قفل صفّ المفتاح يمنع التسابق).
create table if not exists public.ticket_counters (
  prefix text not null,
  ym     text not null,
  seq    int  not null default 0,
  primary key (prefix, ym)
);

create or replace function public.assign_ticket_number()
returns trigger language plpgsql as $$
declare
  v_prefix text;
  v_ym     text := to_char(now(), 'YYMM');
  v_seq    int;
begin
  if new.ticket_number is not null then
    return new;
  end if;
  v_prefix := case new.user_role
    when 'driver'    then 'dri'
    when 'passenger' then 'pas'
    when 'admin'     then 'adm'
    else 'sup'
  end;

  insert into public.ticket_counters (prefix, ym, seq)
    values (v_prefix, v_ym, 1)
    on conflict (prefix, ym)
      do update set seq = public.ticket_counters.seq + 1
    returning seq into v_seq;

  new.ticket_number := v_prefix || v_ym || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_assign_ticket_number on public.support_tickets;
create trigger trg_assign_ticket_number
  before insert on public.support_tickets
  for each row execute function public.assign_ticket_number();

-- ============================================================
-- 4) الاستبيان: يُرسَل تلقائيًّا عند الإغلاق (status → closed)
-- ============================================================
create or replace function public.on_ticket_closed_send_survey()
returns trigger language plpgsql as $$
begin
  if new.status = 'closed'
     and old.status is distinct from 'closed'
     and new.survey_sent_at is null then
    new.survey_sent_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ticket_survey on public.support_tickets;
create trigger trg_ticket_survey
  before update on public.support_tickets
  for each row execute function public.on_ticket_closed_send_survey();

-- ============================================================
-- 5) RLS
-- ============================================================
alter table public.support_tickets enable row level security;
alter table public.ticket_messages  enable row level security;

-- التذاكر: الموظفون يرون الكل، والمستخدم يرى تذاكره فقط.
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    or user_id = auth.uid()
  );

-- الإنشاء: المستخدم لنفسه فقط (حدّ 5 مفتوحة يُتحقّق في الكود).
drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert with check (user_id = auth.uid());

-- التحديث المباشر: الموظفون فقط (إلغاء العميل واستبيانه عبر دوال SECURITY DEFINER).
drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
  );

-- الرسائل: أطراف التذكرة والموظفون (لا الداخلية للعميل).
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    or exists (select 1 from public.support_tickets t
               where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())
  );

drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      not is_internal
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    )
  );

-- ============================================================
-- 6) دوال العميل: إلغاء تذكرته + تعبئة الاستبيان (SECURITY DEFINER، مقيّدة بـ auth.uid)
-- ============================================================
create or replace function public.cancel_my_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set status = 'cancelled', updated_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and status in ('open', 'in_progress', 'resolved');
end;
$$;

create or replace function public.submit_ticket_survey(
  p_ticket_id uuid, p_rating int, p_comment text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set survey_rating = p_rating,
        survey_comment = nullif(btrim(coalesce(p_comment, '')), ''),
        survey_answered_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and survey_sent_at is not null;
end;
$$;

revoke all on function public.cancel_my_ticket(uuid) from public;
revoke all on function public.submit_ticket_survey(uuid, int, text) from public;
grant execute on function public.cancel_my_ticket(uuid) to authenticated;
grant execute on function public.submit_ticket_survey(uuid, int, text) to authenticated;

-- ============================================================
-- 7) bucket «avatars» العام لرفع صورة المستخدم
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- قراءة عامة (الصور غير حسّاسة)، والكتابة/التحديث/الحذف على مجلّد المستخدم فقط.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
