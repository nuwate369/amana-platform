-- 0008_push_notifications.sql
--
-- الإشعارات الفورية — أن يصل التنبيه والتطبيق مغلق.
--
-- كل ما بنيناه قبل هذا يكتب صفًّا في `system_notifications` يُرى عند فتح جرس
-- الإشعارات فقط. وهذا لا ينفع في تطبيق نقل: الراكبة تُغلق التطبيق وتنتظر،
-- فلا تعلم أنّ سائقتها وصلت.
--
-- الطريق: صفّ جديد ⇒ مُشغّل يجمع رموز أجهزة صاحبه ⇒ طلب HTTP إلى خدمة Expo
-- ⇒ Expo تسلّمه إلى Google FCM ⇒ الجوال. نستعمل `pg_net` لإرسال الطلب من
-- داخل قاعدة البيانات، فلا نحتاج نشر دالّة Edge ولا خادمًا وسيطًا.

create extension if not exists pg_net with schema extensions;

-- ═══════════ رموز الأجهزة ═══════════

create table if not exists public.device_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- رمز Expo للجهاز، مثل ExponentPushToken[xxxxxxxx].
  token       text not null unique,
  app         text not null check (app in ('passenger', 'driver')),
  platform    text not null default 'android',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

-- كل مستخدمة تدير رموز أجهزتها وحدها.
drop policy if exists device_tokens_own on public.device_push_tokens;
create policy device_tokens_own on public.device_push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

/**
 * تسجيل رمز الجهاز — تُستدعى من التطبيق بعد الحصول على الإذن.
 *
 * الرمز فريد على مستوى الجدول لا المستخدمة: الجهاز الواحد قد ينتقل بين
 * حسابين (تسجيل خروج ودخول)، فنُعيد إسناده لصاحبه الحالي بدل تكديس صفوف
 * ترسل إشعارات إلى مستخدمة غادرت الجهاز.
 */
create or replace function public.register_push_token(p_token text, p_app text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.device_push_tokens (user_id, token, app)
  values (auth.uid(), p_token, p_app)
  on conflict (token) do update
    set user_id = excluded.user_id,
        app = excluded.app,
        updated_at = now();
end;
$$;

grant execute on function public.register_push_token(text, text) to authenticated;

/** إلغاء تسجيل الجهاز عند تسجيل الخروج. */
create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.device_push_tokens
  where token = p_token and user_id = auth.uid();
$$;

grant execute on function public.unregister_push_token(text) to authenticated;

-- ═══════════ الإرسال التلقائي ═══════════

/**
 * عند إدراج إشعار موجَّه لمستخدمة، يُرسَل فورًا إلى كل أجهزتها.
 *
 * الإشعارات العامّة (target_user_id فارغ) تخصّ لوحة الإدارة ولا تُرسَل هنا.
 * الفشل يُسجَّل تحذيرًا ولا يُبطل إدراج الصفّ: الإشعار داخل التطبيق يبقى
 * قائمًا حتى لو تعذّر الإرسال الفوري.
 */
create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_messages jsonb;
begin
  if new.target_user_id is null then
    return new;
  end if;

  -- رسالة لكل جهاز، في طلب واحد — واجهة Expo تقبل مصفوفة.
  select jsonb_agg(
           jsonb_build_object(
             'to', t.token,
             'title', new.title_ar,
             'body', coalesce(new.body_ar, ''),
             'sound', 'default',
             'priority', 'high',
             'channelId', 'default',
             'data', jsonb_build_object(
               'notificationId', new.id,
               'type', new.type,
               'entityType', new.related_entity_type,
               'entityId', new.related_entity_id
             )
           )
         )
    into v_messages
  from public.device_push_tokens t
  where t.user_id = new.target_user_id;

  if v_messages is null then
    return new;  -- لا أجهزة مسجَّلة بعد.
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Accept', 'application/json'
               ),
    body    := v_messages
  );

  return new;
exception
  when others then
    raise warning 'dispatch_push_notification failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists dispatch_push_notification on public.system_notifications;
create trigger dispatch_push_notification
  after insert on public.system_notifications
  for each row execute function public.dispatch_push_notification();
