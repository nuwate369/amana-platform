-- ============================================================
-- 0021_fix_self_notifications.sql
-- ضبط الإشعارات: لا يرى المستخدم إشعارًا متعلّقًا به هو شخصيًا.
--
-- المشكلة: إشعارات مثل "انضم موظف جديد" / "سائقة جديدة" عامة
-- (target_user_id = null) وتُخزّن related_entity_id = معرّف الشخص المعنيّ.
-- سياسة RLS الحالية تعرض كل الإشعارات العامة لكل الموظفين، فيرى الموظف
-- الجديد إشعارًا عن انضمامه هو.
--
-- الحل: إضافة شرط (related_entity_id <> auth.uid()) لسياسة القراءة، فلا
-- يُعرض لأي مستخدم إشعار موضوعه هو نفسه (يبقى ظاهرًا لبقية الموظفين).
--
-- idempotent. Supabase SQL Editor → Run.
-- ============================================================

drop policy if exists system_notifications_select_staff on public.system_notifications;
create policy system_notifications_select_staff
  on public.system_notifications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin','admin','support')
    )
    and (target_user_id = auth.uid() or target_user_id is null)
    -- لا تُظهر للمستخدم إشعارًا متعلّقًا به شخصيًا (انضمامه/تسجيله)
    and (related_entity_id is null or related_entity_id is distinct from auth.uid())
  );

-- ملاحظة: هذا فلتر قراءة (read-time) — الإشعارات الحالية «انضم موظف جديد»
-- ستختفي فورًا عن الموظف المعنيّ بها دون حذف، وتبقى ظاهرة لبقية الموظفين.
