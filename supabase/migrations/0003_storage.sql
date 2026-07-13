-- ============================================================
-- سياسات RLS لتخزين أمانة (storage.objects)
-- تُنفَّذ في Supabase SQL Editor (بعد إنشاء الـ buckets).
-- اصطلاح المسارات: كل مستخدم يرفع ملفاته تحت مجلد باسم معرّفه: {auth.uid}/الملف
--   لذا (storage.foldername(name))[1] = معرّف المالك.
-- ملاحظة: مفتاح service_role (المستخدم في Server Actions بالإدارة) يتجاوز RLS دائمًا.
-- ============================================================

-- دالة مساعدة: هل المستخدم الحالي إداري؟
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ===== avatars: قراءة عامة، الكتابة/التعديل/الحذف لصاحب المجلد فقط =====
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== kyc-documents: القراءة لصاحبه أو الإدارة؛ الكتابة لصاحبه؛ الحذف لصاحبه أو الإدارة =====
drop policy if exists "kyc_read_own_or_admin" on storage.objects;
create policy "kyc_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "kyc_insert_own" on storage.objects;
create policy "kyc_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc_update_own" on storage.objects;
create policy "kyc_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc_delete_own_or_admin" on storage.objects;
create policy "kyc_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kyc-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ===== admin-attachments: كل العمليات للإدارة فقط =====
drop policy if exists "admin_attach_all" on storage.objects;
create policy "admin_attach_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'admin-attachments' and public.is_admin())
  with check (bucket_id = 'admin-attachments' and public.is_admin());
