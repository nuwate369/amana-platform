'use client';

import { Coins, MapPin, ShieldMinus, TrendingUp, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * صفحة إعدادات التسعير الديناميكي — نموذج ثابت (mock) بلا منطق حفظ.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-brand-700 dark:text-brand-200">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-brand-400">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50';

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400">
          <Icon size={16} />
        </span>
        <h2 className="font-semibold text-brand-800 dark:text-brand-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">إعدادات التسعير الديناميكي</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">
          ضبط التعرفة الأساسية ومضاعِفات الذروة لحساب أسعار الرحلات
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* التعرفة الأساسية */}
        <SectionCard title="التعرفة الأساسية" icon={Coins}>
          <div className="space-y-4">
            <Field label="التعرفة الأساسية (ريال)" hint="الرسوم الثابتة عند بدء كل رحلة">
              <input type="number" defaultValue="8" min="0" step="0.5" className={inputCls} />
            </Field>
            <Field label="سعر الكيلومتر (ريال)" hint="يُضاف عن كل كيلومتر مقطوع">
              <input type="number" defaultValue="1.75" min="0" step="0.25" className={inputCls} />
            </Field>
            <Field label="الحد الأدنى للرحلة (ريال)" hint="أقل مبلغ يُحتسب مهما قصرت الرحلة">
              <input type="number" defaultValue="12" min="0" step="1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        {/* تسعير الذروة */}
        <SectionCard title="تسعير وقت الذروة" icon={TrendingUp}>
          <div className="space-y-4">
            <Field label="مضاعِف وقت الذروة" hint="يُضرب في السعر خلال ساعات الذروة (×١.٥)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  defaultValue="1.5"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-200 accent-accent-500 dark:bg-brand-700"
                />
                <input type="number" defaultValue="1.5" min="1" max="3" step="0.1" className={`${inputCls} w-20`} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ساعات الذروة — من">
                <input type="time" defaultValue="07:00" className={inputCls} />
              </Field>
              <Field label="ساعات الذروة — إلى">
                <input type="time" defaultValue="09:30" className={inputCls} />
              </Field>
            </div>
            <Field label="نمط التطبيق">
              <select defaultValue="daily" className={inputCls}>
                <option value="daily">يوميًا</option>
                <option value="workdays">أيام العمل فقط</option>
                <option value="weekend">نهاية الأسبوع فقط</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* المسافة والمنطقة */}
        <SectionCard title="نطاق الخدمة" icon={MapPin}>
          <div className="space-y-4">
            <Field label="المدينة">
              <select defaultValue="riyadh" className={inputCls}>
                <option value="riyadh">الرياض</option>
                <option value="jeddah">جدة</option>
                <option value="dammam">الدمّام</option>
              </select>
            </Field>
            <Field label="أقصى مسافة للرحلة (كم)" hint="لا تُقبل الطلبات التي تتجاوز هذه المسافة">
              <input type="number" defaultValue="45" min="1" step="1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        {/* الرسوم والخصومات */}
        <SectionCard title="الرسوم والحد الأدنى" icon={ShieldMinus}>
          <div className="space-y-4">
            <Field label="نسبة عمولة المنصّة (%)" hint="النسبة المقتطعة من كل رحلة">
              <input type="number" defaultValue="15" min="0" max="100" step="1" className={inputCls} />
            </Field>
            <Field label="رسوم الانتظار لكل دقيقة (ريال)">
              <input type="number" defaultValue="0.5" min="0" step="0.1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* شريط الحفظ */}
      <div className="flex items-center justify-end gap-3 border-t border-brand-200 pt-4 dark:border-brand-700">
        <span className="ml-auto flex items-center gap-1.5 text-xs text-brand-400">
          <Clock size={14} />
          آخر تحديث: اليوم ١٠:٤٢ صباحًا
        </span>
        <button
          type="button"
          className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-700"
        >
          إلغاء
        </button>
        <button
          type="button"
          className="rounded-lg bg-accent-500 px-5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-accent-400"
        >
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}
