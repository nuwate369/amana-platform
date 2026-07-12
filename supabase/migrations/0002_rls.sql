-- =============================================================================
-- منصة أمانة — سياسات Row Level Security
-- 0002_rls.sql
-- Postgres 15 / Supabase — تعتمد جميع السياسات على auth.uid()
--
-- ملاحظة مهمة عن لوحة المشرفة (admin dashboard):
--   لوحة المشرفة تستخدم مفتاح service_role الذي يتجاوز RLS بالكامل
--   (service_role BYPASSES RLS)، لذلك لا حاجة لأي سياسات خاصة بدور admin هنا.
--   كل السياسات أدناه تخص الراكبة والسائقة (المستخدم العادي المصادَق).
--
-- تفعيل RLS نفسه تمّ في 0001_init.sql؛ هنا نُعرّف السياسات فقط.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — كل مستخدم يقرأ ويحدّث ملفه فقط (الإدراج يتم عبر مشغّل handle_new_user)
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- drivers — السائقة تقرأ وتُدرج وتحدّث سجلها فقط (id = auth.uid())
-- -----------------------------------------------------------------------------
drop policy if exists drivers_select_own on public.drivers;
create policy drivers_select_own
  on public.drivers
  for select
  using (id = auth.uid());

drop policy if exists drivers_insert_own on public.drivers;
create policy drivers_insert_own
  on public.drivers
  for insert
  with check (id = auth.uid());

drop policy if exists drivers_update_own on public.drivers;
create policy drivers_update_own
  on public.drivers
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- rides — سياسات الراكبة والسائقة
-- -----------------------------------------------------------------------------

-- الراكبة: تقرأ رحلاتها
drop policy if exists rides_select_passenger on public.rides;
create policy rides_select_passenger
  on public.rides
  for select
  using (passenger_id = auth.uid());

-- الراكبة: تُنشئ رحلة باسمها
drop policy if exists rides_insert_passenger on public.rides;
create policy rides_insert_passenger
  on public.rides
  for insert
  with check (passenger_id = auth.uid());

-- الراكبة: تحدّث رحلاتها (مثل الإلغاء)
drop policy if exists rides_update_passenger on public.rides;
create policy rides_update_passenger
  on public.rides
  for update
  using (passenger_id = auth.uid())
  with check (passenger_id = auth.uid());

-- السائقة: تقرأ الرحلات المسندة إليها أو الرحلات المطلوبة (المتاحة للقبول)
drop policy if exists rides_select_driver on public.rides;
create policy rides_select_driver
  on public.rides
  for select
  using (driver_id = auth.uid() or status = 'requested');

-- السائقة: تحدّث الرحلات المسندة إليها
drop policy if exists rides_update_driver on public.rides;
create policy rides_update_driver
  on public.rides
  for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- ratings — القراءة لطرفي التقييم، والإدراج للمقيِّمة فقط
-- -----------------------------------------------------------------------------
drop policy if exists ratings_select_involved on public.ratings;
create policy ratings_select_involved
  on public.ratings
  for select
  using (rater_id = auth.uid() or ratee_id = auth.uid());

drop policy if exists ratings_insert_rater on public.ratings;
create policy ratings_insert_rater
  on public.ratings
  for insert
  with check (rater_id = auth.uid());

-- -----------------------------------------------------------------------------
-- groups — المالكة تدير مجموعتها بالكامل، والأعضاء يقرؤون مجموعاتهم
-- -----------------------------------------------------------------------------

-- المالكة: كل العمليات (select/insert/update/delete) على مجموعاتها
drop policy if exists groups_owner_all on public.groups;
create policy groups_owner_all
  on public.groups
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- الأعضاء: قراءة المجموعات التي ينتمون إليها
drop policy if exists groups_select_member on public.groups;
create policy groups_select_member
  on public.groups
  for select
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.member_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- group_members — العضو يدير عضويته، ومالكة المجموعة تدير أعضاءها
-- -----------------------------------------------------------------------------

-- العضو: قراءة عضويته
drop policy if exists group_members_select_own on public.group_members;
create policy group_members_select_own
  on public.group_members
  for select
  using (member_id = auth.uid());

-- العضو: الانضمام (إدراج عضويته)
drop policy if exists group_members_insert_own on public.group_members;
create policy group_members_insert_own
  on public.group_members
  for insert
  with check (member_id = auth.uid());

-- العضو: مغادرة (حذف عضويته)
drop policy if exists group_members_delete_own on public.group_members;
create policy group_members_delete_own
  on public.group_members
  for delete
  using (member_id = auth.uid());

-- مالكة المجموعة: قراءة أعضاء مجموعاتها
drop policy if exists group_members_select_owner on public.group_members;
create policy group_members_select_owner
  on public.group_members
  for select
  using (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );

-- مالكة المجموعة: إدارة أعضاء مجموعاتها (إدراج/حذف)
drop policy if exists group_members_insert_owner on public.group_members;
create policy group_members_insert_owner
  on public.group_members
  for insert
  with check (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );

drop policy if exists group_members_delete_owner on public.group_members;
create policy group_members_delete_owner
  on public.group_members
  for delete
  using (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );
