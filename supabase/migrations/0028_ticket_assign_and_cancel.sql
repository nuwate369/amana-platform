-- 0028_ticket_assign_and_cancel.sql
-- (1) قصر إلغاء العميل على حالة «جديد» فقط (قبل أن يبدأ أي موظف العمل).
-- (2) trigger موحّد على رسائل التذاكر:
--     - أول ردّ من موظف ⇒ تُخصَّص التذكرة له (إن لم تكن مخصّصة).
--     - ردّ موظف على تذكرة «جديد» ⇒ تنتقل تلقائيًّا إلى «قيد العمل».
--     - أي رسالة (موظف أو عميل) تحدّث updated_at.
-- تراكمي (idempotent). Supabase SQL Editor → Run.

-- ============================================================
-- 1) إلغاء العميل: «جديد» (open) فقط
-- ============================================================
create or replace function public.cancel_my_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set status = 'cancelled', updated_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and status = 'open';  -- لا يُلغى إلا قبل أن يبدأ أي موظف العمل
end;
$$;

-- ============================================================
-- 2) trigger موحّد عند إضافة رسالة (تخصيص + تقدّم + updated_at)
-- ============================================================
create or replace function public.on_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_staff boolean := new.sender_role in ('super_admin', 'admin', 'support');
begin
  update public.support_tickets t set
    updated_at  = now(),
    -- أول ردّ من موظف يُخصّص التذكرة له.
    assigned_to = case when v_is_staff and t.assigned_to is null then new.sender_id else t.assigned_to end,
    -- ردّ موظف على «جديد» ⇒ «قيد العمل» (لا يتقدّم بردّ العميل وحده).
    status      = case when v_is_staff and t.status = 'open' then 'in_progress' else t.status end
  where t.id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_on_ticket_message on public.ticket_messages;
create trigger trg_on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.on_ticket_message();
