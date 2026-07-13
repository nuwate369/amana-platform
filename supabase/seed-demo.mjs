/**
 * بذر بيانات تجريبية لمنصة أمانة (لأغراض العرض/التطوير فقط).
 *   node supabase/seed-demo.mjs           # يمسح ثم يبذر بيانات تجريبية
 *   node supabase/seed-demo.mjs --purge   # يمسح البيانات التجريبية فقط
 *
 * البيانات الافتراضية: سائقتان (٢) + أربع راكبات (٤) + رحلات + تقييم + مجموعة.
 * يقرأ الرابط والمفتاح السرّي من apps/admin/.env.local (لا يحتوي أسرارًا بذاته).
 * كل الحسابات التجريبية ببادئة demo_ ونطاق @amana.test ليسهل مسحها بأمان
 * (لا يمسّ حسابات الموظفين مثل testadmin@amana.test).
 *
 * ملاحظة: يتطلّب تطبيق هجرة 0013 أولًا حتى يُصنَّف user_type بشكل صحيح.
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
const DOMAIN = '@amana.test';
const PREFIX = 'demo_'; // نمسح ما يبدأ بـ demo_ فقط — لا نمسّ حسابات الموظفين

/**
 * حذف الحسابات التجريبية فقط (demo_*@amana.test).
 * rides.driver_id وratings.* بلا ON DELETE CASCADE — لذا نحذف السجلات
 * التابعة أولًا وإلا فشل deleteUser بصمت بقيود المفاتيح الأجنبية.
 */
async function purge() {
  // 1) جمع معرّفات الحسابات التجريبية
  const ids = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 100 });
    const users = data?.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      const email = u.email || '';
      if (email.startsWith(PREFIX) && email.endsWith(DOMAIN)) ids.push(u.id);
    }
    if (users.length < 100) break;
  }
  if (!ids.length) { console.log('لا توجد حسابات تجريبية.'); return; }

  // 2) حذف السجلات التابعة (الأبناء قبل الآباء)
  await db.from('ratings').delete().or(`rater_id.in.(${ids.join(',')}),ratee_id.in.(${ids.join(',')})`);
  await db.from('rides').delete().or(`passenger_id.in.(${ids.join(',')}),driver_id.in.(${ids.join(',')})`);
  await db.from('group_members').delete().in('member_id', ids);
  await db.from('groups').delete().in('owner_id', ids);

  // 3) حذف الحسابات مع التحقق الفعلي من كل حذف
  let removed = 0;
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id); // يحذف profile/drivers (cascade)
    if (error) throw new Error(`حذف ${id}: ${error.message}`);
    removed++;
  }
  console.log(`مُسح ${removed} حساب تجريبي.`);
}

async function mkUser(name, role) {
  const email = `${PREFIX}${role}_${name.n}${DOMAIN}`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: 'Demo12345!',
    email_confirm: true,
    user_metadata: { full_name: name.ar, role },
  });
  if (error) throw new Error(`إنشاء ${email}: ${error.message}`);
  // رقم جوال واقعي للعرض (العمود يقبل null؛ نملؤه لإثراء البيانات)
  if (name.phone) await db.from('profiles').update({ phone: name.phone }).eq('id', data.user.id);
  return data.user.id;
}

async function seed() {
  await purge();

  const passengers = [
    { n: 1, ar: 'نورة الأحمد', phone: '0501112233' },
    { n: 2, ar: 'ريم القحطاني', phone: '0502223344' },
    { n: 3, ar: 'لمى السالم', phone: '0503334455' },
    { n: 4, ar: 'دانة الحربي', phone: '0504445566' },
  ];
  const drivers = [
    { n: 1, ar: 'هند العتيبي', phone: '0505556677', status: 'approved', make: 'تويوتا', model: 'كامري', plate: 'أ ب ج 1234' },
    { n: 2, ar: 'عبير الشمري', phone: '0506667788', status: 'pending', make: 'هيونداي', model: 'إلنترا', plate: 'د هـ و 5678' },
  ];

  const pIds = [];
  for (const p of passengers) pIds.push(await mkUser(p, 'passenger'));

  const dIds = [];
  for (const d of drivers) {
    const id = await mkUser(d, 'driver');
    dIds.push(id);
    // صف السائقة يُنشأ تلقائيًا عبر trigger؛ نحدّثه ببيانات المركبة والحالة.
    const { data: exists } = await db.from('drivers').select('id').eq('id', id).maybeSingle();
    const payload = {
      status: d.status,
      vehicle_make: d.make,
      vehicle_model: d.model,
      vehicle_plate: d.plate,
      license_url: 'https://example.com/license.jpg',
      national_id_url: 'https://example.com/id.jpg',
      vehicle_registration_url: 'https://example.com/reg.jpg',
    };
    if (exists) await db.from('drivers').update(payload).eq('id', id);
    else await db.from('drivers').insert({ id, ...payload });
  }

  // ------------------------------------------------------------
  // رحلات غنية: موزّعة على آخر ٢١ يومًا بأحياء وأسعار وحالات متنوعة.
  // السائقة النشطة الوحيدة (هند approved) تنفّذها؛ عبير pending بلا رحلات.
  // ------------------------------------------------------------
  const day = 86_400_000;
  const at = (daysAgo, hour = 9) => new Date(Date.now() - daysAgo * day + hour * 3_600_000).toISOString();

  // [راكبة, من, إلى, السعر, الحالة, قبل كم يوم]
  const RIDES = [
    [0, 'حي النخيل',  'العليا',    45.0,  'completed',   20],
    [1, 'الملقا',      'حطين',      58.5,  'completed',   18],
    [2, 'الياسمين',    'الصحافة',   32.0,  'completed',   16],
    [3, 'قرطبة',       'الروضة',    27.25, 'completed',   14],
    [0, 'العليا',      'حي السفارات', 63.0, 'completed',  11],
    [1, 'حطين',        'الملقا',    55.0,  'completed',   9],
    [2, 'الصحافة',     'الغدير',    29.5,  'completed',   7],
    [0, 'حي السفارات', 'النرجس',    71.0,  'completed',   4],
    [3, 'الروضة',      'الرمال',    38.0,  'completed',   2],
    [1, 'المروج',      'الورود',    40.0,  'cancelled',   6],
    [2, 'الوادي',      'النزهة',    33.0,  'cancelled',   3],
    [0, 'النرجس',      'العارض',    49.0,  'in_progress', 0],
    [3, 'قرطبة',       'المونسية',  26.0,  'requested',   0],
  ];

  const rideRows = [];
  for (const [p, from, to, price, status, daysAgo] of RIDES) {
    const completedRide = status === 'completed';
    const { data, error } = await db.from('rides').insert({
      passenger_id: pIds[p],
      driver_id: status === 'requested' ? null : dIds[0],
      status,
      pickup_address: from,
      dropoff_address: to,
      price_estimate: price,
      price_final: completedRide ? price : null,
      requested_at: at(daysAgo),
      completed_at: completedRide ? at(daysAgo, 10) : null,
    }).select('id, passenger_id, status').single();
    if (error) throw new Error('إدراج الرحلات: ' + error.message);
    rideRows.push(data);
  }

  // ------------------------------------------------------------
  // تقييمات ثنائية الاتجاه لكل رحلة مكتملة:
  //   الراكبة → السائقة  +  السائقة → الراكبة
  // مع إجابات تفصيلية على أسئلة rating_questions إن كانت الهجرة 0014 مطبّقة.
  // ------------------------------------------------------------
  const { data: questions, error: qErr } = await db
    .from('rating_questions').select('id, target').eq('is_active', true);
  const hasQuestions = !qErr && (questions?.length ?? 0) > 0;
  if (qErr) console.log('⚠️  جداول أسئلة التقييم غير موجودة (طبّق 0014) — سيُبذر التقييم الإجمالي فقط.');

  const P2D_COMMENTS = [
    'خدمة ممتازة وسيارة نظيفة', 'قيادة آمنة وهادئة، شكرًا', 'وصلت بالوقت المحدد تمامًا',
    'تعامل راقٍ جدًا', null, 'رحلة مريحة والتكييف ممتاز', 'أفضل سائقة تعاملت معها', null, 'كل شيء رائع',
  ];
  const D2P_COMMENTS = [
    'راكبة ملتزمة ومحترمة', 'كانت جاهزة في الموقع', null, 'تعامل لطيف', 'دقيقة في الموعد', null, 'شكرًا لالتزامها', 'راكبة مثالية', null,
  ];
  // نجوم متنوعة (أغلبها مرتفعة كواقع تقييمات التطبيقات)
  const P2D_STARS = [5, 5, 4, 5, 4, 5, 5, 3, 5];
  const D2P_STARS = [5, 4, 5, 5, 4, 5, 3, 5, 4];

  // نجوم إجابة سؤال قريبة من الإجمالي (±1 ضمن 1..5) — حتمية بلا عشوائية
  const near = (base, i) => Math.min(5, Math.max(1, base + [0, 1, -1, 0][i % 4]));

  const completedRides = rideRows.filter((r) => r.status === 'completed');
  let ratingsCount = 0;
  let answersCount = 0;

  for (let i = 0; i < completedRides.length; i++) {
    const ride = completedRides[i];
    const pairs = [
      { rater: ride.passenger_id, ratee: dIds[0], stars: P2D_STARS[i], comment: P2D_COMMENTS[i], target: 'driver' },
      { rater: dIds[0], ratee: ride.passenger_id, stars: D2P_STARS[i], comment: D2P_COMMENTS[i], target: 'passenger' },
    ];
    for (const pr of pairs) {
      const { data: rating, error: rErr } = await db.from('ratings').insert({
        ride_id: ride.id, rater_id: pr.rater, ratee_id: pr.ratee, stars: pr.stars, comment: pr.comment,
      }).select('id').single();
      if (rErr) throw new Error('إدراج التقييمات: ' + rErr.message);
      ratingsCount++;

      if (hasQuestions) {
        const qs = questions.filter((q) => q.target === pr.target);
        const answers = qs.map((q, j) => ({ rating_id: rating.id, question_id: q.id, stars: near(pr.stars, i + j) }));
        if (answers.length) {
          const { error: aErr } = await db.from('rating_answers').insert(answers);
          if (aErr) throw new Error('إدراج إجابات التقييم: ' + aErr.message);
          answersCount += answers.length;
        }
      }
    }
  }
  console.log(`تقييمات: ${ratingsCount} (بإجابات تفصيلية: ${answersCount})`);

  // مجموعات نقل مشتركة
  const { data: grp } = await db.from('groups').insert({ name: 'زميلات العمل', owner_id: pIds[0] }).select('id').single();
  if (grp) {
    await db.from('group_members').insert([
      { group_id: grp.id, member_id: pIds[0] },
      { group_id: grp.id, member_id: pIds[1] },
      { group_id: grp.id, member_id: pIds[2] },
    ]);
  }
  const { data: grp2 } = await db.from('groups').insert({ name: 'جاراتنا في النرجس', owner_id: pIds[2] }).select('id').single();
  if (grp2) {
    await db.from('group_members').insert([
      { group_id: grp2.id, member_id: pIds[2] },
      { group_id: grp2.id, member_id: pIds[3] },
    ]);
  }

  const counts = {};
  for (const t of ['profiles', 'drivers', 'rides', 'ratings', 'groups', 'group_members']) {
    const { count } = await db.from(t).select('*', { count: 'exact', head: true });
    counts[t] = count;
  }
  if (hasQuestions) {
    const { count } = await db.from('rating_answers').select('*', { count: 'exact', head: true });
    counts.rating_answers = count;
    const { count: qc } = await db.from('rating_questions').select('*', { count: 'exact', head: true });
    counts.rating_questions = qc;
  }
  console.log('تم البذر. الأعداد:', JSON.stringify(counts));
}

const run = process.argv.includes('--purge') ? purge : seed;
run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
