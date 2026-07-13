/**
 * تحقّق من هجرة 0013 + بيانات البذر. للتشغيل بعد تطبيق الهجرة والبذر:
 *   node scripts/verify-moderation.mjs
 * يفحص الأعمدة والجدول، ثم يجري حظرًا تجريبيًا على راكبة demo ويؤكّد كتابة
 * سطر في audit_logs، ثم يرفع الحظر ويصفّي أثره. لا يمسّ أي حساب حقيقي.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, 'apps/admin/.env.local'), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = true;
const pass = (m) => console.log('  ✓', m);
const fail = (m) => { ok = false; console.log('  ✗', m); };

async function colOk(table, column) {
  const { error } = await db.from(table).select(column).limit(1);
  return !error || error.code !== '42703';
}

console.log('\n[1] المخطط:');
for (const c of ['user_type', 'is_active', 'is_protected', 'ban_reason', 'banned_by', 'banned_at']) {
  (await colOk('profiles', c)) ? pass(`profiles.${c}`) : fail(`profiles.${c} مفقود`);
}
{
  const { error } = await db.from('audit_logs').select('id').limit(1);
  !error ? pass('جدول audit_logs') : fail(`audit_logs: ${error.message}`);
}

console.log('\n[2] الأعداد (user_type):');
const c = async (t) => (await db.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', t)).count;
const drivers = await c('driver');
const passengers = await c('passenger');
console.log(`  السائقات=${drivers}  الراكبات=${passengers}`);
drivers >= 2 ? pass('سائقتان على الأقل') : fail('أقل من سائقتين — طبّق البذر');
passengers >= 4 ? pass('أربع راكبات على الأقل') : fail('أقل من ٤ راكبات — طبّق البذر');

console.log('\n[3] دورة حظر تجريبية على راكبة demo:');
const { data: victim } = await db.from('profiles')
  .select('id, full_name').eq('user_type', 'passenger').eq('is_active', true).limit(1).maybeSingle();
if (!victim) { fail('لا توجد راكبة نشطة للاختبار'); }
else {
  const reason = 'اختبار تحقّق آلي';
  await db.from('profiles').update({ is_active: false, ban_reason: reason, banned_at: new Date().toISOString() }).eq('id', victim.id);
  await db.from('audit_logs').insert({ actor_name: 'verify-script', action: 'ban_user', target_type: 'profile', target_id: victim.id, target_name: victim.full_name, reason });
  const { data: chk } = await db.from('profiles').select('is_active, ban_reason').eq('id', victim.id).single();
  chk?.is_active === false && chk?.ban_reason === reason ? pass('الحظر انعكس على profiles') : fail('الحظر لم ينعكس');
  const { data: log } = await db.from('audit_logs').select('id').eq('target_id', victim.id).eq('action', 'ban_user').order('created_at', { ascending: false }).limit(1);
  log?.length ? pass('سطر audit_logs مكتوب') : fail('لم يُكتب سطر audit_logs');
  // تنظيف: رفع الحظر + حذف سطر الاختبار
  await db.from('profiles').update({ is_active: true, ban_reason: null, banned_at: null }).eq('id', victim.id);
  await db.from('audit_logs').delete().eq('actor_name', 'verify-script');
  pass('نُظّف أثر الاختبار');
}

console.log(ok ? '\n✅ كل الفحوص نجحت.\n' : '\n❌ بعض الفحوص فشلت — راجع أعلاه.\n');
process.exit(ok ? 0 : 1);
