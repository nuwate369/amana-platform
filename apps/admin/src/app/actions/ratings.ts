'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { logAudit } from '@/app/actions/moderation';

/**
 * إدارة نظام التقييم:
 * - أسئلة التقييم (rating_questions): إضافة/تعديل/تفعيل/حذف — مع تسجيل كل
 *   حركة في audit_logs. لكل سؤال «وجهة»: driver (يظهر في تطبيق الراكبة)
 *   أو passenger (يظهر في تطبيق السائقة).
 * - عرض آخر التقييمات (ratings + إجاباتها) بأسماء المقيِّم والمقيَّم.
 */

type ActionResult = { success: true } | { success: false; error: string };

export type QuestionTarget = 'driver' | 'passenger';

export interface RatingQuestionRow {
  id: string;
  question: string;
  target: QuestionTarget;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  /** إحصاءات الإجابات — تحكم أيضًا قواعد الحفظ (سؤال له إجابات لا يُحذف ولا تتغيّر وجهته). */
  answersCount: number;
  avgStars: number | null;
  lastAnswerAt: string | null;
}

/** المؤشرات العامة لتقرير التقييمات. */
export interface RatingsOverview {
  totalRatings: number;
  driverAvg: number | null;     // متوسط تقييم السائقات (ما استلمنه)
  passengerAvg: number | null;  // متوسط تقييم الراكبات
  totalAnswers: number;
  lowStarsCount: number;        // تقييمات 1-2 نجمة (تستحق الانتباه)
}

/** إحصاءات سؤال واحد لنافذة التفاصيل. */
export interface QuestionStats {
  question: string;
  target: QuestionTarget;
  isActive: boolean;
  answersCount: number;
  avgStars: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  firstAnswerAt: string | null;
  lastAnswerAt: string | null;
  recent: {
    id: string;
    stars: number;
    raterName: string | null;
    rateeName: string | null;
    createdAt: string;
  }[];
}

export interface RatingRow {
  id: string;
  raterName: string | null;
  raterType: string | null;
  rateeName: string | null;
  rateeType: string | null;
  stars: number;
  comment: string | null;
  answersCount: number;
  answersAvg: number | null;
  createdAt: string;
}

/** أخطاء «الجدول غير موجود» قبل تطبيق هجرة 0014. */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

// ============================================================
// الأسئلة
// ============================================================

export async function listRatingQuestions(): Promise<{
  questions: RatingQuestionRow[];
  migrationNeeded: boolean;
}> {
  const db = getAdminSupabase();
  const [{ data, error }, answersRes] = await Promise.all([
    db
      .from('rating_questions')
      .select('id, question, target, is_active, sort_order, created_at')
      .order('target')
      .order('sort_order'),
    db.from('rating_answers').select('question_id, stars, created_at'),
  ]);

  if (error) {
    if (!isMissingTable(error)) {
      console.error('[listRatingQuestions] error:', error.code, error.message);
    }
    return { questions: [], migrationNeeded: isMissingTable(error) };
  }

  // تجميع إحصاءات الإجابات لكل سؤال
  const agg = new Map<string, { count: number; sum: number; last: string }>();
  for (const a of answersRes.data ?? []) {
    const cur = agg.get(a.question_id) ?? { count: 0, sum: 0, last: a.created_at };
    cur.count += 1;
    cur.sum += a.stars;
    if (a.created_at > cur.last) cur.last = a.created_at;
    agg.set(a.question_id, cur);
  }

  return {
    migrationNeeded: false,
    questions: (data ?? []).map((q) => {
      const s = agg.get(q.id);
      return {
        id: q.id,
        question: q.question,
        target: q.target as QuestionTarget,
        isActive: q.is_active,
        sortOrder: q.sort_order,
        createdAt: q.created_at,
        answersCount: s?.count ?? 0,
        avgStars: s ? Math.round((s.sum / s.count) * 10) / 10 : null,
        lastAnswerAt: s?.last ?? null,
      };
    }),
  };
}

/** عدد إجابات سؤال — يُستخدم في فرض قواعد الحفظ والحذف. */
async function countQuestionAnswers(questionId: string): Promise<number> {
  const db = getAdminSupabase();
  const { count } = await db
    .from('rating_answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', questionId);
  return count ?? 0;
}

export async function createRatingQuestion(
  actorId: string | null,
  input: { question: string; target: QuestionTarget; sortOrder: number },
): Promise<ActionResult> {
  const question = (input.question ?? '').trim();
  if (question.length < 3) return { success: false, error: 'نص السؤال قصير جدًا (٣ أحرف على الأقل).' };
  if (input.target !== 'driver' && input.target !== 'passenger') {
    return { success: false, error: 'وجهة السؤال غير صحيحة.' };
  }

  const db = getAdminSupabase();
  const { data: created, error } = await db
    .from('rating_questions')
    .insert({
      question,
      target: input.target,
      sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { success: false, error: 'هذا السؤال موجود مسبقًا لنفس الوجهة.' };
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId,
    action: 'create_rating_question',
    targetType: 'rating_question',
    targetId: created.id,
    targetName: question,
    metadata: { target: input.target },
  });

  revalidatePath('/ratings');
  return { success: true };
}

export async function updateRatingQuestion(
  actorId: string | null,
  id: string,
  input: { question: string; target: QuestionTarget; sortOrder: number; isActive: boolean },
): Promise<ActionResult> {
  const question = (input.question ?? '').trim();
  if (question.length < 3) return { success: false, error: 'نص السؤال قصير جدًا (٣ أحرف على الأقل).' };

  const db = getAdminSupabase();

  // قاعدة سلامة البيانات: سؤال له إجابات مسجّلة لا تتغيّر وجهته —
  // الإجابات التاريخية مرتبطة بسياق «من المُقيَّم» وتغييره يفسد دلالتها.
  const { data: current } = await db
    .from('rating_questions').select('target').eq('id', id).maybeSingle();
  if (!current) return { success: false, error: 'السؤال غير موجود.' };
  if (current.target !== input.target) {
    const answers = await countQuestionAnswers(id);
    if (answers > 0) {
      return {
        success: false,
        error: `لا يمكن تغيير وجهة سؤال له ${answers} إجابة مسجّلة — أوقف هذا السؤال وأنشئ سؤالًا جديدًا بالوجهة المطلوبة.`,
      };
    }
  }

  const { error } = await db
    .from('rating_questions')
    .update({
      question,
      target: input.target,
      sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      is_active: !!input.isActive,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') return { success: false, error: 'هذا السؤال موجود مسبقًا لنفس الوجهة.' };
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId,
    action: 'update_rating_question',
    targetType: 'rating_question',
    targetId: id,
    targetName: question,
    metadata: { target: input.target, isActive: !!input.isActive },
  });

  revalidatePath('/ratings');
  return { success: true };
}

export async function deleteRatingQuestion(
  actorId: string | null,
  id: string,
): Promise<ActionResult> {
  const db = getAdminSupabase();

  // قاعدة سلامة البيانات: سؤال له إجابات مسجّلة لا يُحذف نهائيًا —
  // الحذف يمسح الإجابات التاريخية (cascade). البديل الصحيح: الإيقاف.
  const answers = await countQuestionAnswers(id);
  if (answers > 0) {
    return {
      success: false,
      error: `لا يمكن حذف سؤال له ${answers} إجابة مسجّلة — أوقفه بدلًا من ذلك للحفاظ على البيانات التاريخية.`,
    };
  }

  const { data: existing } = await db
    .from('rating_questions').select('question').eq('id', id).maybeSingle();

  const { error } = await db.from('rating_questions').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  await logAudit({
    actorId,
    action: 'delete_rating_question',
    targetType: 'rating_question',
    targetId: id,
    targetName: existing?.question ?? null,
  });

  revalidatePath('/ratings');
  return { success: true };
}

// ============================================================
// آخر التقييمات
// ============================================================

export async function listRecentRatings(limit = 30): Promise<RatingRow[]> {
  const db = getAdminSupabase();
  const { data: ratings, error } = await db
    .from('ratings')
    .select('id, rater_id, ratee_id, stars, comment, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !ratings?.length) {
    if (error) console.error('[listRecentRatings] error:', error.code, error.message);
    return [];
  }

  const ids = [...new Set(ratings.flatMap((r) => [r.rater_id, r.ratee_id]))];
  const ratingIds = ratings.map((r) => r.id);

  const [profilesRes, answersRes] = await Promise.all([
    db.from('profiles').select('id, full_name, user_type').in('id', ids),
    db.from('rating_answers').select('rating_id, stars').in('rating_id', ratingIds),
  ]);

  const names = new Map<string, { name: string | null; type: string | null }>();
  for (const p of profilesRes.data ?? []) {
    names.set(p.id, { name: p.full_name, type: p.user_type });
  }

  // تجميع الإجابات لكل تقييم (قد يكون الجدول غير موجود قبل 0014 — نتجاهل بهدوء)
  const answers = new Map<string, number[]>();
  for (const a of answersRes.data ?? []) {
    const list = answers.get(a.rating_id) ?? [];
    list.push(a.stars);
    answers.set(a.rating_id, list);
  }

  return ratings.map((r) => {
    const list = answers.get(r.id) ?? [];
    return {
      id: r.id,
      raterName: names.get(r.rater_id)?.name ?? null,
      raterType: names.get(r.rater_id)?.type ?? null,
      rateeName: names.get(r.ratee_id)?.name ?? null,
      rateeType: names.get(r.ratee_id)?.type ?? null,
      stars: r.stars,
      comment: r.comment,
      answersCount: list.length,
      answersAvg: list.length
        ? Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 10) / 10
        : null,
      createdAt: r.created_at,
    };
  });
}

// ============================================================
// التقرير الإحصائي
// ============================================================

/** المؤشرات العامة أعلى شاشة التقييمات — تدعم اتخاذ القرار. */
export async function getRatingsOverview(): Promise<RatingsOverview> {
  const db = getAdminSupabase();

  const [ratingsRes, answersCountRes] = await Promise.all([
    db.from('ratings').select('stars, ratee_id').limit(5000),
    db.from('rating_answers').select('*', { count: 'exact', head: true }),
  ]);

  const ratings = ratingsRes.data ?? [];
  const empty: RatingsOverview = {
    totalRatings: 0, driverAvg: null, passengerAvg: null,
    totalAnswers: answersCountRes.count ?? 0, lowStarsCount: 0,
  };
  if (!ratings.length) return empty;

  // نوع المُقيَّم لكل تقييم (سائقة/راكبة)
  const rateeIds = [...new Set(ratings.map((r) => r.ratee_id))];
  const { data: profiles } = await db
    .from('profiles').select('id, user_type').in('id', rateeIds);
  const types = new Map<string, string>();
  for (const p of profiles ?? []) types.set(p.id, p.user_type);

  const bucket = { driver: [] as number[], passenger: [] as number[] };
  let low = 0;
  for (const r of ratings) {
    if (r.stars <= 2) low++;
    const t = types.get(r.ratee_id);
    if (t === 'driver') bucket.driver.push(r.stars);
    else if (t === 'passenger') bucket.passenger.push(r.stars);
  }
  const avg = (l: number[]) =>
    l.length ? Math.round((l.reduce((s, v) => s + v, 0) / l.length) * 10) / 10 : null;

  return {
    totalRatings: ratings.length,
    driverAvg: avg(bucket.driver),
    passengerAvg: avg(bucket.passenger),
    totalAnswers: answersCountRes.count ?? 0,
    lowStarsCount: low,
  };
}

/** إحصاءات سؤال واحد — لنافذة «عرض التفاصيل» بجانب زر التعديل. */
export async function getQuestionStats(questionId: string): Promise<QuestionStats | null> {
  const db = getAdminSupabase();

  const [{ data: q }, answersRes] = await Promise.all([
    db.from('rating_questions')
      .select('question, target, is_active')
      .eq('id', questionId)
      .maybeSingle(),
    db.from('rating_answers')
      .select('id, stars, created_at, rating_id')
      .eq('question_id', questionId)
      .order('created_at', { ascending: false }),
  ]);
  if (!q) return null;

  const answers = answersRes.data ?? [];
  const distribution: QuestionStats['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const a of answers) {
    sum += a.stars;
    distribution[a.stars as 1 | 2 | 3 | 4 | 5] += 1;
  }

  // آخر الإجابات مع طرفَي التقييم (استعلامان متتاليان لتفادي التباس FK المزدوج)
  const recentRaw = answers.slice(0, 5);
  let recent: QuestionStats['recent'] = [];
  if (recentRaw.length) {
    const ratingIds = [...new Set(recentRaw.map((a) => a.rating_id))];
    const { data: ratings } = await db
      .from('ratings').select('id, rater_id, ratee_id').in('id', ratingIds);
    const partyIds = [...new Set((ratings ?? []).flatMap((r) => [r.rater_id, r.ratee_id]))];
    const { data: profiles } = await db
      .from('profiles').select('id, full_name').in('id', partyIds);
    const names = new Map<string, string | null>();
    for (const p of profiles ?? []) names.set(p.id, p.full_name);
    const parties = new Map<string, { rater: string | null; ratee: string | null }>();
    for (const r of ratings ?? []) {
      parties.set(r.id, {
        rater: names.get(r.rater_id) ?? null,
        ratee: names.get(r.ratee_id) ?? null,
      });
    }
    recent = recentRaw.map((a) => ({
      id: a.id,
      stars: a.stars,
      raterName: parties.get(a.rating_id)?.rater ?? null,
      rateeName: parties.get(a.rating_id)?.ratee ?? null,
      createdAt: a.created_at,
    }));
  }

  return {
    question: q.question,
    target: q.target as QuestionTarget,
    isActive: q.is_active,
    answersCount: answers.length,
    avgStars: answers.length ? Math.round((sum / answers.length) * 10) / 10 : null,
    distribution,
    firstAnswerAt: answers.length ? answers[answers.length - 1].created_at : null,
    lastAnswerAt: answers.length ? answers[0].created_at : null,
    recent,
  };
}
