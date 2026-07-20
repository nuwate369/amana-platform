'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '@/lib/supabase/admin';

/** استقبال رأي زائرة على صفحة التحميل — تحقّق وتنظيف على الخادم. */

export type ReviewApp = 'passenger' | 'driver';

export interface ReviewRow {
  id: string;
  name: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AppStats {
  installs: number;
  updates: number;
  reviewsCount: number;
  ratingAvg: number | null;
}

export async function listReviews(app: ReviewApp, limit = 8): Promise<ReviewRow[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('app_reviews')
    .select('id, name, rating, comment, created_at')
    .eq('app', app)
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function getStats(app: ReviewApp): Promise<AppStats> {
  const db = getAdminSupabase();
  const { data } = await db.rpc('app_public_stats', { p_app: app });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { installs: number; updates: number; reviews_count: number; rating_avg: number | null }
    | undefined;

  return {
    installs: Number(row?.installs ?? 0),
    updates: Number(row?.updates ?? 0),
    reviewsCount: Number(row?.reviews_count ?? 0),
    ratingAvg: row?.rating_avg != null ? Number(row.rating_avg) : null,
  };
}

export async function submitReview(input: {
  app: ReviewApp;
  name: string;
  rating: number;
  comment: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  const comment = input.comment.trim();

  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: 'الاسم يجب أن يكون بين حرفين و60 حرفًا.' };
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: 'اختاري تقييمًا من 1 إلى 5 نجوم.' };
  }
  if (comment.length > 600) {
    return { ok: false, error: 'التعليق طويل جدًّا (600 حرف كحدّ أقصى).' };
  }

  const db = getAdminSupabase();
  const { error } = await db.from('app_reviews').insert({
    app: input.app,
    name,
    rating: input.rating,
    comment: comment || null,
  });

  if (error) return { ok: false, error: 'تعذّر حفظ رأيك، حاولي مرّة أخرى.' };

  revalidatePath('/download');
  return { ok: true };
}
