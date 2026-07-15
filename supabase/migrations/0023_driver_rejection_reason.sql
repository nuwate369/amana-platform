-- ============================================================
-- 0023_driver_rejection_reason.sql
-- سبب رفض توثيق السائقة — يصل إليها داخل التطبيق كي تعرف ما تُصلحه.
--
--   rejection_reason (text) — يُملأ عند الرفض، ويُفرَّغ عند القبول أو عند
--   إعادة الإرسال للتدقيق. تقرؤه السائقة عبر سياسة drivers_select_own القائمة
--   (id = auth.uid())، فلا حاجة لتغيير RLS.
--
-- idempotent. Supabase SQL Editor → Run (بعد 0022).
-- ============================================================

alter table public.drivers
  add column if not exists rejection_reason text;
