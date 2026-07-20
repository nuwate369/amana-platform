-- 0041_app_versions.sql
-- إصدارات التطبيقات المحمولة + مستودع ملفّات APK.
--
-- يقرأ التطبيق صفَّه عند الإقلاع ويقارن versionCode المحلّي بأحدث إصدار منشور.
-- إن كان أقدم تظهر نافذة «تحديث متاح» مع رابط التنزيل. التحديثات الخفيفة (JS)
-- تصل عبر EAS Update تلقائيًّا ولا تمرّ من هنا إطلاقًا — هذا الجدول للبناء الأصلي فقط.

create table if not exists public.app_versions (
  id            uuid primary key default gen_random_uuid(),
  app           text not null check (app in ('passenger', 'driver')),
  platform      text not null default 'android' check (platform in ('android', 'ios')),
  version_code  integer not null check (version_code > 0),
  version_name  text    not null,
  download_url  text    not null,
  notes         text,
  mandatory     boolean not null default false,
  published     boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (app, platform, version_code)
);

create index if not exists app_versions_lookup_idx
  on public.app_versions (app, platform, published, version_code desc);

alter table public.app_versions enable row level security;

-- أيّ مستخدم مسجَّل يقرأ الإصدارات المنشورة فقط.
drop policy if exists app_versions_select_published on public.app_versions;
create policy app_versions_select_published on public.app_versions
  for select to authenticated
  using (published = true);

-- الإدارة وحدها تكتب.
drop policy if exists app_versions_admin_all on public.app_versions;
create policy app_versions_admin_all on public.app_versions
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
-- مستودع ملفّات التطبيقات — عامّ للقراءة حتى يعمل رابط التنزيل في صفحة الهبوط
-- ومن داخل التطبيق دون مصادقة.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = true;

drop policy if exists app_releases_public_read on storage.objects;
create policy app_releases_public_read on storage.objects
  for select to public
  using (bucket_id = 'app-releases');

drop policy if exists app_releases_admin_write on storage.objects;
create policy app_releases_admin_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'app-releases'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  )
  with check (
    bucket_id = 'app-releases'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- دالّة عامّة لجلب أحدث إصدار — تُستدعى من صفحة الهبوط دون تسجيل دخول.
-- ---------------------------------------------------------------------------
create or replace function public.latest_app_version(p_app text, p_platform text default 'android')
returns table (
  version_code integer,
  version_name text,
  download_url text,
  notes        text,
  mandatory    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select v.version_code, v.version_name, v.download_url, v.notes, v.mandatory
  from public.app_versions v
  where v.app = p_app
    and v.platform = p_platform
    and v.published = true
  order by v.version_code desc
  limit 1;
$$;

grant execute on function public.latest_app_version(text, text) to anon, authenticated;
