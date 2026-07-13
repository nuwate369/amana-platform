-- Migration 0006: Storage, RLS, and Profiles Schema Updates

-- 1. Profiles Schema Update
alter table public.profiles rename column locale to preferred_language;
alter table public.profiles alter column preferred_language set default 'ar';

alter table public.profiles 
add column if not exists preferred_theme text not null default 'system' check (preferred_theme in ('light', 'dark', 'system'));

-- 2. Admin Tables RLS Policies (Allow users to read their own roles, and super_admins to read all)
create policy "Users can read their own admin record"
on public.admin_users for select
using ( auth.uid() = user_id );

-- We allow authenticated users to read roles and permissions to know what they can do
create policy "Authenticated users can read roles"
on public.admin_roles for select
to authenticated
using ( true );

create policy "Authenticated users can read permissions"
on public.admin_permissions for select
to authenticated
using ( true );

create policy "Authenticated users can read role_permissions"
on public.admin_role_permissions for select
to authenticated
using ( true );

-- 3. Storage Buckets & Policies
-- Create avatars bucket (Public)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create kyc-documents bucket (Private)
insert into storage.buckets (id, name, public) 
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

-- Avatars RLS: Anyone can read, only owner can insert/update/delete their own folder
create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar."
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can update their own avatar."
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own avatar."
on storage.objects for delete
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- KYC Documents RLS: Private, owner can read/write, super_admins/supervisors can read.
create policy "Users can upload their own kyc documents."
on storage.objects for insert
with check ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can read their own kyc documents."
on storage.objects for select
using ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own kyc documents."
on storage.objects for delete
using ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

-- Allow admins with 'manage_drivers' permission (or super_admin) to read all kyc documents
create policy "Admins can read all kyc documents"
on storage.objects for select
using (
  bucket_id = 'kyc-documents' and
  exists (
    select 1 from public.admin_users au
    join public.admin_role_permissions arp on au.role_id = arp.role_id
    join public.admin_permissions ap on arp.permission_id = ap.id
    where au.user_id = auth.uid() and ap.key = 'manage_drivers'
  )
);
