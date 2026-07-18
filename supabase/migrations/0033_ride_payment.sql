-- ============================================================
-- 0033 — دفع الرحلة (تجريبي/محاكى — بلا بوابة حقيقية بعد)
--
-- يغلق ذيل حلقة الرحلة: بعد إنهائها تُسجَّل قيمة الفاتورة النهائية ووقت الدفع
-- ووسيلته. الأسعار حقيقية (محسوبة من المسافة)؛ الدفع محاكى للتجربة — يُستبدَل
-- لاحقًا بربط بوابة دفع حكومية (يتطلّب سجلًّا تجاريًّا).
--
-- RLS: الراكبة تحدّث صفّها أصلًا (rides_update_passenger) فلا حاجة لسياسة جديدة.
-- idempotent.
-- ============================================================

alter table public.rides add column if not exists paid_at        timestamptz;
alter table public.rides add column if not exists fare_total     numeric(10,2);
alter table public.rides add column if not exists payment_method text;
