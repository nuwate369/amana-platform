-- 0040_ride_messages.sql
-- محادثة الرحلة بين الراكبة والسائقة (طرفا الرحلة فقط). Realtime لتحديث فوريّ.

create table if not exists public.ride_messages (
  id          uuid primary key default gen_random_uuid(),
  ride_id     uuid not null references public.rides(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  sender_role text not null check (sender_role in ('passenger', 'driver')),
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ride_messages_ride_idx on public.ride_messages (ride_id, created_at);

alter table public.ride_messages enable row level security;
alter table public.ride_messages replica identity full;

-- القراءة: طرفا الرحلة فقط (الراكبة أو السائقة المخصّصة).
drop policy if exists ride_messages_select on public.ride_messages;
create policy ride_messages_select on public.ride_messages
  for select to authenticated using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
    )
  );

-- الإدراج: المُرسِل نفسه، وطرف في الرحلة.
drop policy if exists ride_messages_insert on public.ride_messages;
create policy ride_messages_insert on public.ride_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_id and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
    )
  );

-- Realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_messages'
  ) then
    alter publication supabase_realtime add table public.ride_messages;
  end if;
end $$;
