import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
try {
  const envContent = readFileSync(join(root, 'apps/admin/.env.local'), 'utf8');
  let url = '';
  let secret = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) secret = line.split('=')[1].trim();
  });

  if (!url || !secret) throw new Error('مفاتيح Supabase غير موجودة في apps/admin/.env.local');

  const db = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔄 جاري تطبيق ملف 0003_rbac.sql...');
  const sql = readFileSync(join(root, 'supabase/migrations/0003_rbac.sql'), 'utf8');
  
  // By executing queries directly from the client is not officially supported for huge DDL without rpc, 
  // but we can try to call a standard extension or if the user applies it in SQL editor.
  // Instead of trying to run DDL via JS (which might fail via REST API), 
  // we will just create the user, and ask the user to run the SQL in Supabase dashboard.

  console.log('👤 جاري التأكد من وجود حساب nuwate369@gmail.com ...');
  
  let userId;
  const { data: usersData, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) throw listErr;

  const existingUser = usersData.users.find(u => u.email === 'nuwate369@gmail.com');
  
  if (existingUser) {
    console.log('✅ المستخدم موجود:', existingUser.id);
    userId = existingUser.id;
  } else {
    console.log('⏳ جاري إنشاء المستخدم nuwate369@gmail.com ...');
    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email: 'nuwate369@gmail.com',
      password: 'q@Q422982',
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    if (createErr) throw createErr;
    console.log('✅ تم إنشاء المستخدم:', newUser.user.id);
    userId = newUser.user.id;
  }

  console.log('\n======================================');
  console.log('🚀 نجاح! الحساب جاهز:');
  console.log('البريد: nuwate369@gmail.com');
  console.log('كلمة المرور: q@Q422982');
  console.log('الآن يرجى نسخ محتوى ملف supabase/migrations/0003_rbac.sql ولصقه في SQL Editor في Supabase وتثبيته لربط هذا الحساب بدور super_admin.');
  console.log('======================================\n');
  
} catch (error) {
  console.error('❌ خطأ أثناء تنفيذ السكربت:', error.message);
}
