'use client';

import { createSupabaseClient } from '@amana/supabase-client';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * عميل Supabase العام (anon) لجهة العميل في لوحة الإدارة.
 * يُستخدم لعمليات المصادقة (تسجيل الدخول/الخروج) وقراءة البيانات العامة.
 */
export const supabase = createSupabaseClient({
  url,
  anonKey,
  detectSessionInUrl: true,
});
