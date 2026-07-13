-- Migration 0005: Seed Supervisor and Analyst Roles

do $$
declare
    supervisor_role_id uuid;
    analyst_role_id uuid;
    perm_id uuid;
begin
    -- 1. Create Supervisor Role (مشرف)
    insert into public.admin_roles (name, description, is_protected)
    values ('مشرف', 'متابعة الرحلات والسائقات ومراجعة طلبات KYC', false)
    on conflict (name) do nothing
    returning id into supervisor_role_id;

    -- If it already existed, fetch its ID
    if supervisor_role_id is null then
        select id into supervisor_role_id from public.admin_roles where name = 'مشرف';
    end if;

    -- 2. Create Analyst Role (محلل)
    insert into public.admin_roles (name, description, is_protected)
    values ('محلل', 'اطّلاع على التقارير ولوحات المؤشرات فقط', false)
    on conflict (name) do nothing
    returning id into analyst_role_id;

    if analyst_role_id is null then
        select id into analyst_role_id from public.admin_roles where name = 'محلل';
    end if;

    -- 3. Assign specific permissions to Supervisor
    -- Let's say supervisor gets manage_drivers and manage_passengers
    for perm_id in select id from public.admin_permissions where key in ('manage_drivers', 'manage_passengers') loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (supervisor_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
    end loop;

    -- Analyst might get read-only permissions (we can add a 'view_reports' permission)
    insert into public.admin_permissions (key, description) values
    ('view_reports', 'عرض التقارير والإحصائيات')
    on conflict (key) do nothing;

    for perm_id in select id from public.admin_permissions where key = 'view_reports' loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (analyst_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
        
        -- Also give super_admin this new permission
        insert into public.admin_role_permissions (role_id, permission_id)
        select id, perm_id from public.admin_roles where name = 'super_admin'
        on conflict (role_id, permission_id) do nothing;
    end loop;
end
$$;
