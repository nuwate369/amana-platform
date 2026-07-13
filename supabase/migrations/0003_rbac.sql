-- Migration 0003: RBAC (Role-Based Access Control) for Admin Panel

create table if not exists public.admin_roles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    is_protected boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.admin_permissions (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    description text,
    created_at timestamptz default now()
);

create table if not exists public.admin_role_permissions (
    role_id uuid references public.admin_roles(id) on delete cascade,
    permission_id uuid references public.admin_permissions(id) on delete cascade,
    primary key (role_id, permission_id)
);

create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role_id uuid references public.admin_roles(id),
    is_protected boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_users enable row level security;

-- Protection Trigger
create or replace function public.protect_admin_records()
returns trigger as $$
begin
    if (tg_op = 'DELETE') then
        if old.is_protected = true then
            raise exception 'لا يمكن حذف هذا السجل لأنه محمي (is_protected = true)';
        end if;
        return old;
    elsif (tg_op = 'UPDATE') then
        if old.is_protected = true then
            raise exception 'لا يمكن تعديل هذا السجل لأنه محمي (is_protected = true)';
        end if;
        return new;
    end if;
    return null;
end;
$$ language plpgsql;

drop trigger if exists trigger_protect_admin_roles on public.admin_roles;
create trigger trigger_protect_admin_roles
    before update or delete on public.admin_roles
    for each row execute function public.protect_admin_records();

drop trigger if exists trigger_protect_admin_users on public.admin_users;
create trigger trigger_protect_admin_users
    before update or delete on public.admin_users
    for each row execute function public.protect_admin_records();

-- Seed Data for Roles and Permissions
do $$
declare
    super_admin_role_id uuid;
    perm_id uuid;
begin
    insert into public.admin_roles (name, description, is_protected)
    values ('super_admin', 'المدير العام بصلاحيات كاملة', true)
    on conflict (name) do update set is_protected = true
    returning id into super_admin_role_id;

    insert into public.admin_permissions (key, description) values
    ('manage_roles', 'إدارة المجموعات والصلاحيات'),
    ('manage_admin_users', 'إدارة المستخدمين الإداريين'),
    ('manage_drivers', 'إدارة السائقات'),
    ('manage_passengers', 'إدارة الراكبات'),
    ('manage_settings', 'إدارة إعدادات المنصة')
    on conflict (key) do nothing;

    for perm_id in select id from public.admin_permissions loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (super_admin_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
    end loop;
end
$$;
