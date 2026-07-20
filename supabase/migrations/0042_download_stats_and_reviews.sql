-- 0042_download_stats_and_reviews.sql
-- إحصاءات التنزيل وآراء المستخدمات على صفحة التحميل العامّة.

-- ---------------------------------------------------------------------------
-- سجلّ التنزيلات — صفّ لكل ضغطة على زرّ التحميل.
-- kind = 'install' من صفحة التحميل، و'update' من نافذة التحديث داخل التطبيق،
-- فنعرف كم منها تثبيت أوّل وكم تحديث لنسخة قائمة.
-- ---------------------------------------------------------------------------
create table if not exists public.app_downloads (
  id            bigserial primary key,
  app           text not null check (app in ('passenger', 'driver')),
  version_code  integer,
  kind          text not null default 'install' check (kind in ('install', 'update')),
  created_at    timestamptz not null default now()
);

create index if not exists app_downloads_app_idx on public.app_downloads (app, kind);
create index if not exists app_downloads_time_idx on public.app_downloads (created_at desc);

alter table public.app_downloads enable row level security;
-- لا سياسات قراءة عامّة: الكتابة والقراءة تتمّان من الخادم بمفتاح الخدمة فقط.

-- ---------------------------------------------------------------------------
-- آراء المستخدمات — تظهر على صفحة التحميل.
-- تُنشر مباشرةً (visible = true) وللإدارة إخفاؤها؛ الحجم المتوقّع صغير
-- ومراجعة كل تعليق قبل نشره تعطّل التفاعل بلا داعٍ في هذه المرحلة.
-- ---------------------------------------------------------------------------
create table if not exists public.app_reviews (
  id          uuid primary key default gen_random_uuid(),
  app         text not null check (app in ('passenger', 'driver')),
  name        text not null check (char_length(trim(name)) between 2 and 60),
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 600),
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists app_reviews_public_idx
  on public.app_reviews (app, visible, created_at desc);

alter table public.app_reviews enable row level security;

-- الزوّار يقرؤون الآراء الظاهرة فقط. الكتابة تمرّ عبر الخادم (تحقّق + تنظيف).
drop policy if exists app_reviews_public_read on public.app_reviews;
create policy app_reviews_public_read on public.app_reviews
  for select to anon, authenticated
  using (visible = true);

drop policy if exists app_reviews_admin_all on public.app_reviews;
create policy app_reviews_admin_all on public.app_reviews
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- ملخّص عامّ يُعرض على صفحة التحميل: عدد التثبيتات والتحديثات ومتوسّط التقييم.
-- ---------------------------------------------------------------------------
create or replace function public.app_public_stats(p_app text)
returns table (
  installs      bigint,
  updates       bigint,
  reviews_count bigint,
  rating_avg    numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.app_downloads d
      where d.app = p_app and d.kind = 'install'),
    (select count(*) from public.app_downloads d
      where d.app = p_app and d.kind = 'update'),
    (select count(*) from public.app_reviews r
      where r.app = p_app and r.visible),
    (select round(avg(r.rating)::numeric, 1) from public.app_reviews r
      where r.app = p_app and r.visible);
$$;

grant execute on function public.app_public_stats(text) to anon, authenticated;
