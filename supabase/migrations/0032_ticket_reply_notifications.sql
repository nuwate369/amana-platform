-- ============================================================
-- 0032 — تنبيهات ردود التذاكر + قراءة المستخدم لتنبيهاته
--
-- المشكلة: عند ردّ الموظف لم يكن يصل تنبيه لصاحب التذكرة (لا trigger ينشئه،
-- وجدول system_notifications للموظفين فقط). هذا الملف:
--   1) يوسّع RLS ليقرأ/يحدّث كل مستخدم تنبيهاته الخاصّة (target_user_id = uid).
--   2) يوسّع trigger رسائل التذاكر: ردّ موظف ⇒ تنبيه لصاحب التذكرة؛ ردّ العميل
--      ⇒ تنبيه عامّ للموظفين. (تُتجاهل الرسائل الداخلية.)
--   3) يضيف ticket_messages إلى بثّ Realtime (لتحديث المحادثة لحظيًّا).
-- idempotent.
-- ============================================================

-- ---- 1) RLS: المستخدم يقرأ/يحدّث تنبيهاته الخاصّة ----
drop policy if exists system_notifications_select_own on public.system_notifications;
create policy system_notifications_select_own on public.system_notifications for select to authenticated
  using (target_user_id = auth.uid());

drop policy if exists system_notifications_update_own on public.system_notifications;
create policy system_notifications_update_own on public.system_notifications for update to authenticated
  using (target_user_id = auth.uid()) with check (target_user_id = auth.uid());

-- ---- 2) trigger رسائل التذاكر (تخصيص + تقدّم + تنبيهات) ----
create or replace function public.on_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_staff boolean := new.sender_role in ('super_admin', 'admin', 'support');
  v_ticket   record;
  v_num      text;
  v_snippet  text := left(coalesce(new.message, ''), 120);
begin
  -- تخصيص أول ردّ موظف + تقدّم الحالة + updated_at (كما كان).
  update public.support_tickets t set
    updated_at  = now(),
    assigned_to = case when v_is_staff and t.assigned_to is null then new.sender_id else t.assigned_to end,
    status      = case when v_is_staff and t.status = 'open' then 'in_progress' else t.status end
  where t.id = new.ticket_id;

  -- تنبيهات — نتجاهل الرسائل الداخلية بين الموظفين.
  if new.is_internal is not true then
    select id, user_id, subject, ticket_number into v_ticket
      from public.support_tickets where id = new.ticket_id;
    v_num := coalesce(v_ticket.ticket_number, '');

    if v_is_staff then
      -- ردّ موظف ⇒ تنبيه لصاحب التذكرة.
      insert into public.system_notifications (
        type, title_ar, title_en, body_ar, body_en,
        related_entity_type, related_entity_id, target_user_id
      ) values (
        'ticket_reply',
        'ردّ جديد على تذكرتك' || case when v_num <> '' then ' (' || v_num || ')' else '' end,
        'New reply on your ticket' || case when v_num <> '' then ' (' || v_num || ')' else '' end,
        v_snippet, v_snippet,
        'ticket', v_ticket.id, v_ticket.user_id
      );
    else
      -- ردّ العميل ⇒ تنبيه عامّ للموظفين.
      insert into public.system_notifications (
        type, title_ar, title_en, body_ar, body_en,
        related_entity_type, related_entity_id, target_user_id
      ) values (
        'ticket_user_reply',
        'ردّ جديد من العميل' || case when v_num <> '' then ' (' || v_num || ')' else '' end
          || ': ' || coalesce(v_ticket.subject, ''),
        'New customer reply' || case when v_num <> '' then ' (' || v_num || ')' else '' end
          || ': ' || coalesce(v_ticket.subject, ''),
        v_snippet, v_snippet,
        'ticket', v_ticket.id, null
      );
    end if;
  end if;

  return new;
end;
$$;

-- الـ trigger موجود من 0028؛ نُعيد ربطه احتياطًا (idempotent).
drop trigger if exists trg_on_ticket_message on public.ticket_messages;
create trigger trg_on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.on_ticket_message();

-- ---- 3) Realtime لمحادثة التذاكر ----
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticket_messages'
  ) then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;
end $$;
alter table public.ticket_messages replica identity full;
