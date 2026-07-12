/**
 * بذر بيانات تجريبية لمنصة أمانة (لأغراض العرض/التطوير فقط).
 *   node supabase/seed-demo.mjs           # يمسح ثم يبذر بيانات تجريبية
 *   node supabase/seed-demo.mjs --purge   # يمسح البيانات التجريبية فقط
 *
 * يقرأ الرابط والمفتاح السرّي من apps/admin/.env.local (لا يحتوي أسرارًا بذاته).
 * كل الحسابات التجريبية ببريد ينتهي بـ @amana.test ليسهل مسحها.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, 'apps/admin/.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error('مفاتيح Supabase غير موجودة في apps/admin/.env.local');

const db = createClient(url, secret, { auth: { persistSession: false } });
const DEMO = '@amana.test';

async function purge() {
  let removed = 0;
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 100 });
    const users = data?.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      if ((u.email || '').endsWith(DEMO)) {
        await db.auth.admin.deleteUser(u.id); // يحذف profile/drivers بالتتابع (cascade)
        removed++;
      }
    }
    if (users.length < 100) break;
  }
  console.log(`مُسح ${removed} حساب تجريبي.`);
}

async function mkUser(name, role) {
  const email = `demo_${role}_${name.n}${DEMO}`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: 'Demo12345!',
    email_confirm: true,
    user_metadata: { full_name: name.ar, role },
  });
  if (error) throw new Error(`إنشاء ${email}: ${error.message}`);
  return data.user.id;
}

async function seed() {
  await purge();

  const passengers = [
    { n: 1, ar: 'نورة الأحمد' },
    { n: 2, ar: 'ريم القحطاني' },
    { n: 3, ar: 'لمى السالم' },
    { n: 4, ar: 'دانة الحربي' },
    { n: 5, ar: 'سارة المطيري' },
  ];
  const drivers = [
    { n: 1, ar: 'هند العتيبي', status: 'approved', make: 'تويوتا', model: 'كامري', plate: 'أ ب ج 1234' },
    { n: 2, ar: 'عبير الشمري', status: 'pending', make: 'هيونداي', model: 'إلنترا', plate: 'د هـ و 5678' },
    { n: 3, ar: 'منى الزهراني', status: 'approved', make: 'كيا', model: 'سيراتو', plate: 'ز ح ط 9012' },
  ];

  const pIds = [];
  for (const p of passengers) pIds.push(await mkUser(p, 'passenger'));
  const dIds = [];
  for (const d of drivers) {
    const id = await mkUser(d, 'driver');
    dIds.push(id);
    await db.from('drivers').update({
      status: d.status,
      vehicle_make: d.make,
      vehicle_model: d.model,
      vehicle_plate: d.plate,
      license_url: 'https://example.com/license.jpg',
      national_id_url: 'https://example.com/id.jpg',
      vehicle_registration_url: 'https://example.com/reg.jpg',
    }).eq('id', id);
  }
  // بعض السائقات قد لا يكون لها صف drivers تلقائيًا؛ نُدرج إن لزم.
  for (let i = 0; i < dIds.length; i++) {
    const { data: exists } = await db.from('drivers').select('id').eq('id', dIds[i]).maybeSingle();
    if (!exists) {
      await db.from('drivers').insert({ id: dIds[i], status: drivers[i].status,
        vehicle_make: drivers[i].make, vehicle_model: drivers[i].model, vehicle_plate: drivers[i].plate });
    }
  }

  // رحلات
  const rides = [
    { passenger_id: pIds[0], driver_id: dIds[0], status: 'completed', pickup_address: 'حي النخيل', dropoff_address: 'العليا', price_estimate: 45, price_final: 45, price: 45 },
    { passenger_id: pIds[1], driver_id: dIds[2], status: 'completed', pickup_address: 'الملقا', dropoff_address: 'حطين', price_estimate: 58.48, price_final: 58.48 },
    { passenger_id: pIds[2], driver_id: dIds[0], status: 'in_progress', pickup_address: 'الياسمين', dropoff_address: 'الصحافة', price_estimate: 32 },
    { passenger_id: pIds[3], driver_id: null, status: 'requested', pickup_address: 'قرطبة', dropoff_address: 'الروضة', price_estimate: 27 },
    { passenger_id: pIds[4], driver_id: dIds[2], status: 'cancelled', pickup_address: 'المروج', dropoff_address: 'الورود', price_estimate: 40 },
  ].map(({ price, ...r }) => r);
  const { data: rideRows, error: rErr } = await db.from('rides').insert(rides).select('id, status');
  if (rErr) throw new Error('إدراج الرحلات: ' + rErr.message);

  // تقييم لرحلة مكتملة
  const completed = rideRows.find((r) => r.status === 'completed');
  if (completed) {
    await db.from('ratings').insert({ ride_id: completed.id, rater_id: pIds[0], ratee_id: dIds[0], stars: 5, comment: 'خدمة ممتازة' });
  }

  // مجموعة مغلقة
  const { data: grp } = await db.from('groups').insert({ name: 'زميلات العمل', owner_id: pIds[0] }).select('id').single();
  if (grp) {
    await db.from('group_members').insert([
      { group_id: grp.id, member_id: pIds[0] },
      { group_id: grp.id, member_id: pIds[1] },
      { group_id: grp.id, member_id: pIds[2] },
    ]);
  }

  const counts = {};
  for (const t of ['profiles', 'drivers', 'rides', 'ratings', 'groups', 'group_members']) {
    const { count } = await db.from(t).select('*', { count: 'exact', head: true });
    counts[t] = count;
  }
  console.log('تم البذر. الأعداد:', JSON.stringify(counts));
}

const run = process.argv.includes('--purge') ? purge : seed;
run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
