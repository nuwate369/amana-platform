-- Migration 0004: Add status to admin_users for invite system

alter table public.admin_users 
add column if not exists status text default 'active' check (status in ('pending', 'active'));

-- Also we might want to ensure profiles matches this logic, but admin_users is sufficient.
-- The user will be created via Supabase Auth Admin API (inviteUserByEmail)
-- and then we insert/update admin_users with status = 'pending'.
