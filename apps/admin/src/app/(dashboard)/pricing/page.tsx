'use client';

import { Coins, MapPin, ShieldMinus, TrendingUp, Clock, BadgePercent } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon size={16} />
        </span>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function PricingPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <BadgePercent className="h-6 w-6 text-primary shrink-0" />
          {t('pricing.title', 'إعدادات التسعير الديناميكي')}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground">{t('pricing.subtitle', 'ضبط التعرفة الأساسية ومضاعِفات الذروة لحساب أسعار الرحلات')}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* التعرفة الأساسية */}
        <SectionCard title={t('pricing.sections.baseFare.title', 'التعرفة الأساسية')} icon={Coins}>
          <div className="space-y-4">
            <Field label={t('pricing.sections.baseFare.basePrice', 'التعرفة الأساسية (ريال)')} hint={t('pricing.sections.baseFare.basePriceHint', 'الرسوم الثابتة عند بدء كل رحلة')}>
              <input type="number" defaultValue="8" min="0" step="0.5" className={inputCls} />
            </Field>
            <Field label={t('pricing.sections.baseFare.perKm', 'سعر الكيلومتر (ريال)')} hint={t('pricing.sections.baseFare.perKmHint', 'يُضاف عن كل كيلومتر مقطوع')}>
              <input type="number" defaultValue="1.75" min="0" step="0.25" className={inputCls} />
            </Field>
            <Field label={t('pricing.sections.baseFare.minTrip', 'الحد الأدنى للرحلة (ريال)')} hint={t('pricing.sections.baseFare.minTripHint', 'أقل مبلغ يُحتسب مهما قصرت الرحلة')}>
              <input type="number" defaultValue="12" min="0" step="1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        {/* تسعير الذروة */}
        <SectionCard title={t('pricing.sections.surge.title', 'تسعير وقت الذروة')} icon={TrendingUp}>
          <div className="space-y-4">
            <Field label={t('pricing.sections.surge.multiplier', 'مضاعِف وقت الذروة')} hint={t('pricing.sections.surge.multiplierHint', 'يُضرب في السعر خلال ساعات الذروة (×1.5)')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  defaultValue="1.5"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
                />
                <input type="number" defaultValue="1.5" min="1" max="3" step="0.1" className={`${inputCls} w-20`} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('pricing.sections.surge.start', 'ساعات الذروة — من')}>
                <input type="time" defaultValue="07:00" className={inputCls} />
              </Field>
              <Field label={t('pricing.sections.surge.end', 'ساعات الذروة — إلى')}>
                <input type="time" defaultValue="09:30" className={inputCls} />
              </Field>
            </div>
            <Field label={t('pricing.sections.surge.pattern', 'نمط التطبيق')}>
              <select defaultValue="daily" className={inputCls}>
                <option value="daily">{t('pricing.sections.surge.daily', 'يوميًا')}</option>
                <option value="workdays">{t('pricing.sections.surge.workdays', 'أيام العمل فقط')}</option>
                <option value="weekend">{t('pricing.sections.surge.weekend', 'نهاية الأسبوع فقط')}</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* المسافة والمنطقة */}
        <SectionCard title={t('pricing.sections.service.title', 'نطاق الخدمة')} icon={MapPin}>
          <div className="space-y-4">
            <Field label={t('pricing.sections.service.city', 'المدينة')}>
              <select defaultValue="riyadh" className={inputCls}>
                <option value="riyadh">{t('pricing.sections.service.riyadh', 'الرياض')}</option>
                <option value="jeddah">{t('pricing.sections.service.jeddah', 'جدة')}</option>
                <option value="dammam">{t('pricing.sections.service.dammam', 'الدمّام')}</option>
              </select>
            </Field>
            <Field label={t('pricing.sections.service.maxDist', 'أقصى مسافة للرحلة (كم)')} hint={t('pricing.sections.service.maxDistHint', 'لا تُقبل الطلبات التي تتجاوز هذه المسافة')}>
              <input type="number" defaultValue="45" min="1" step="1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        {/* الرسوم والخصومات */}
        <SectionCard title={t('pricing.sections.fees.title', 'الرسوم والحد الأدنى')} icon={ShieldMinus}>
          <div className="space-y-4">
            <Field label={t('pricing.sections.fees.commission', 'نسبة عمولة المنصّة (%)')} hint={t('pricing.sections.fees.commissionHint', 'النسبة المقتطعة من كل رحلة')}>
              <input type="number" defaultValue="15" min="0" max="100" step="1" className={inputCls} />
            </Field>
            <Field label={t('pricing.sections.fees.waitFee', 'رسوم الانتظار لكل دقيقة (ريال)')}>
              <input type="number" defaultValue="0.5" min="0" step="0.1" className={inputCls} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* شريط الحفظ */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={14} />
          {t('pricing.lastUpdated', 'آخر تحديث: اليوم 10:42 صباحًا')}
        </span>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          {t('common.cancel', 'إلغاء')}
        </button>
        <button
          type="button"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {t('pricing.save', 'حفظ التغييرات')}
        </button>
      </div>
    </div>
  );
}
