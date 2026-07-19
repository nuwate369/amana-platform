-- 0039_announcements_public_read.sql
-- السماح للمستخدمين (الركاب والسائقين) بقراءة الإعلانات الموجهة لهم.

drop policy if exists announcements_select_users on public.announcements;

create policy announcements_select_users on public.announcements
  for select to authenticated
  using (
    status = 'sent' 
    and starts_at <= now() 
    and expires_at > now()
    and (
      audience = 'all'
      or (audience = 'specific' and target_user_id = auth.uid())
      or (audience = 'passengers' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'passenger'))
      or (audience = 'drivers' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'driver'))
    )
  );
