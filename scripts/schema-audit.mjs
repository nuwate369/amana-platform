import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), 'apps/admin/.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...val] = trimmed.split('=');
  env[key.trim()] = val.join('=').trim();
});

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. TABLES + COLUMNS
console.log('=== TABLES + COLUMNS ===');
const tables = ['profiles', 'drivers', 'rides', 'ratings', 'groups', 'group_members', 'system_notifications'];
const results = {};

for (const table of tables) {
  const { data, error } = await s.from(table).select('*').limit(1);
  if (error) {
    console.log(`  ${table}: ${error.code === '42P01' ? 'DOES NOT EXIST' : 'ERROR ' + error.code}`);
    results[table] = { exists: error.code !== '42P01', error: error.message };
  } else {
    const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
    console.log(`  ${table}: [${cols.join(', ')}]`);
    results[table] = { exists: true, columns: cols };
  }
}

// 2. ALL PROFILES DATA
console.log('\n=== ALL PROFILES ===');
const { data: profiles } = await s.from('profiles').select('*');
console.log('Columns:', profiles?.length > 0 ? Object.keys(profiles[0]).join(', ') : 'EMPTY');
(profiles || []).forEach(r => console.log(`  ${r.id?.substring(0,8)}… | role=${r.role} | name=${r.full_name || 'NULL'} | phone=${r.phone || 'NULL'} | locale=${r.locale} | created=${r.created_at?.substring(0,10)}`));

// 3. ALL DRIVERS DATA
console.log('\n=== ALL DRIVERS ===');
const { data: drivers, error: dErr } = await s.from('drivers').select('*');
if (dErr) console.log('  ERROR:', dErr.code, dErr.message);
else {
  console.log('Columns:', drivers?.length > 0 ? Object.keys(drivers[0]).join(', ') : 'EMPTY');
  (drivers || []).forEach(r => console.log(`  ${r.id?.substring(0,8)}… | status=${r.status} | make=${r.vehicle_make || 'NULL'}`));
}

// 4. SYSTEM_NOTIFICATIONS
console.log('\n=== SYSTEM_NOTIFICATIONS ===');
const { data: notifs, error: nErr } = await s.from('system_notifications').select('*').limit(3);
if (nErr) console.log('  ERROR:', nErr.code, nErr.message);
else {
  console.log('Columns:', notifs?.length > 0 ? Object.keys(notifs[0]).join(', ') : 'EMPTY TABLE');
  (notifs || []).forEach(r => console.log('  ', JSON.stringify(r).substring(0, 300)));
}

// 5. ALL AUTH USERS
console.log('\n=== ALL AUTH USERS ===');
const { data: authUsers } = await s.auth.admin.listUsers({ perPage: 100 });
(authUsers?.users || []).forEach(u => {
  const meta = JSON.stringify(u.user_metadata);
  const app = JSON.stringify((u).app_metadata || {});
  console.log(`  ${u.email} | id=${u.id?.substring(0,8)}… | meta=${meta} | created=${u.created_at?.substring(0,10)} | last_signin=${u.last_sign_in_at?.substring(0,10) || 'NEVER'}`);
});

// 6. ENUM DETECTION (test role column)
console.log('\n=== ENUM DETECTION (role column) ===');
const testVals = ['passenger', 'driver', 'admin', 'super_admin', 'support'];
for (const v of testVals) {
  const { error } = await s.from('profiles').select('id').eq('role', v).limit(1);
  if (error?.code === '22P02') {
    console.log(`  role='${v}': INVALID in enum`);
  } else {
    const { count } = await s.from('profiles').select('*', { count: 'exact', head: true }).eq('role', v);
    console.log(`  role='${v}': VALID (${count} rows)`);
  }
}

// 7. RPC FUNCTIONS
console.log('\n=== KNOWN FUNCTIONS ===');
const fns = ['handle_new_user', 'enforce_immutable_user_type', 'set_updated_at', 'set_profiles_updated_at', 'add_document_expiring_notification'];
for (const fn of fns) {
  const { error } = await s.rpc(fn);
  const missing = error?.message?.includes('function') && error?.message?.includes('not found');
  console.log(`  ${fn}: ${missing ? 'NOT FOUND' : 'EXISTS (or params needed)'}`);
}

console.log('\n=== DONE ===');
