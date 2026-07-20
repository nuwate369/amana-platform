-- 0003_download_rate_limit.sql
--
-- حماية مسار التنزيل من التكرار الآلي، وتنظيف إحصاءاته.
--
-- المشكلة: `/api/download/<app>` مفتوح بلا مصادقة (وهذا مقصود — التنزيل قبل
-- التسجيل). بلا ضابط يستطيع بوت أو ضغطة متكرّرة أن يولّد آلاف الصفوف، فيفسد
-- عدّاد التثبيت ويحمّل الخادم بلا فائدة.
--
-- المبدأ: **لا نمنع التنزيل أبدًا إلا عند حدّ سخيف**. الضبط يقع على العدّ لا
-- على الخدمة — لأنّ منع تنزيل مشروع أسوأ بكثير من رقم إحصائي منتفخ.

alter table public.app_downloads
  -- بصمة الزائر: SHA-256 لعنوان IP مع ملح خادمي. لا نخزّن العنوان نفسه —
  -- يكفي للتمييز بين الزوّار ولا يُعرّف بأحد، توافقًا مع نظام حماية البيانات.
  add column if not exists ip_hash text;

create index if not exists app_downloads_ip_recent_idx
  on public.app_downloads (ip_hash, created_at desc)
  where ip_hash is not null;

comment on column public.app_downloads.ip_hash is
  'SHA-256(ip + salt) — لكشف التكرار وحساب الحدّ فقط. لا يُخزَّن العنوان الأصلي.';

-- ---------------------------------------------------------------------------
-- قرار واحد يجمع الفحصين: هل نتجاوز الحدّ؟ وهل نعدّ هذه الضغطة؟
--
-- التكرار خلال 24 ساعة لنفس (الزائر · التطبيق · الإصدار) لا يُعدّ مرّة أخرى:
-- الضغطتان من الشخص نفسه على النسخة نفسها ليستا تثبيتين.
-- ---------------------------------------------------------------------------
create or replace function public.register_download(
  p_app          text,
  p_version_code integer,
  p_kind         text,
  p_ip_hash      text,
  p_hourly_cap   integer default 30
)
returns table (allowed boolean, counted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent  integer;
  v_dupe    boolean;
begin
  -- بلا بصمة (تعذّر تحديد الزائر) نسمح ونعدّ كالمعتاد.
  if p_ip_hash is null then
    insert into public.app_downloads (app, version_code, kind)
    values (p_app, p_version_code, p_kind);
    return query select true, true;
    return;
  end if;

  select count(*) into v_recent
  from public.app_downloads d
  where d.ip_hash = p_ip_hash
    and d.created_at > now() - interval '1 hour';

  -- حدّ مرتفع عمدًا: شبكة مكتب أو جامعة كاملة تشترك في عنوان واحد،
  -- فالحدّ يستهدف الآلة المتكرّرة لا التجمّع البشري.
  if v_recent >= p_hourly_cap then
    return query select false, false;
    return;
  end if;

  select exists (
    select 1 from public.app_downloads d
    where d.ip_hash = p_ip_hash
      and d.app = p_app
      and d.version_code is not distinct from p_version_code
      and d.created_at > now() - interval '24 hours'
  ) into v_dupe;

  -- التكرار يُسجَّل صفًّا (كي يُحتسب في الحدّ الساعي) لكن بنوع 'repeat'
  -- فلا يدخل في إحصاء التثبيت أو التحديث.
  insert into public.app_downloads (app, version_code, kind, ip_hash)
  values (p_app, p_version_code, case when v_dupe then 'repeat' else p_kind end, p_ip_hash);

  return query select true, not v_dupe;
end;
$$;

-- نوع 'repeat' يلزم إضافته للقيد القائم.
alter table public.app_downloads drop constraint if exists app_downloads_kind_check;
alter table public.app_downloads
  add constraint app_downloads_kind_check
  check (kind in ('install', 'update', 'repeat'));

revoke execute on function public.register_download(text, integer, text, text, integer) from anon, authenticated;
