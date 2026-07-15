'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * منتقي مدى تاريخ مخصّص (بلا مكتبات) — شهران جنبًا لجنب + معاينات جانبية سريعة
 * (اليوم/أمس/آخر أسبوع/آخر شهر/الشهر الماضي/مخصّص) + زرّا تطبيق/مسح.
 * هوية أنثراسايت+ذهبي عبر رموز التصميم، RTL + وضع داكن، ومتوافق مع لوحة المفاتيح
 * (تركيز مرئي، Escape للإغلاق، إغلاق بالنقر خارجًا، aria-labels).
 */

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const AR_WEEK = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const EN_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

/** خلايا شهر (فراغات البداية ثم الأيام)، بطول مضاعف لـ7. */
function monthCells(year: number, month: number): (Date | null)[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateRangePicker({
  value,
  onChange,
  lang,
  isRtl,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  lang: 'ar' | 'en';
  isRtl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [hover, setHover] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(firstOfMonth(value.from ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  const months = lang === 'ar' ? AR_MONTHS : EN_MONTHS;
  const weekdays = lang === 'ar' ? AR_WEEK : EN_WEEK;

  function openPicker() {
    setDraft(value);
    setViewMonth(firstOfMonth(value.from ?? new Date()));
    setHover(null);
    setOpen(true);
  }

  // إغلاق بالنقر خارجًا + Escape (escape-routes / keyboard-nav).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickDay(day: Date) {
    setDraft((prev) => {
      if (!prev.from || (prev.from && prev.to)) return { from: day, to: null };
      if (day < prev.from) return { from: day, to: prev.from };
      return { from: prev.from, to: day };
    });
  }

  function applyPreset(key: string) {
    const today = startOfDay(new Date());
    if (key === 'custom') {
      setDraft({ from: null, to: null });
      setViewMonth(firstOfMonth(today));
      return;
    }
    let from = today;
    let to = today;
    if (key === 'yesterday') {
      from = new Date(today);
      from.setDate(from.getDate() - 1);
      to = new Date(from);
    } else if (key === 'week') {
      from = new Date(today);
      from.setDate(from.getDate() - 6);
    } else if (key === 'month') {
      from = new Date(today);
      from.setDate(from.getDate() - 29);
    } else if (key === 'prevMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    setDraft({ from, to });
    setViewMonth(firstOfMonth(from));
  }

  const presets = [
    { key: 'today', label: lang === 'ar' ? 'اليوم' : 'Today' },
    { key: 'yesterday', label: lang === 'ar' ? 'أمس' : 'Yesterday' },
    { key: 'week', label: lang === 'ar' ? 'آخر أسبوع' : 'Last 7 days' },
    { key: 'month', label: lang === 'ar' ? 'آخر شهر' : 'Last 30 days' },
    { key: 'prevMonth', label: lang === 'ar' ? 'الشهر الماضي' : 'Previous month' },
    { key: 'custom', label: lang === 'ar' ? 'مخصّص' : 'Custom' },
  ];

  // نطاق العرض الحالي (يشمل معاينة التمرير عند اختيار البداية فقط).
  const tentativeTo = draft.to ?? (draft.from && hover ? hover : null);
  const lo = draft.from && tentativeTo ? (draft.from < tentativeTo ? draft.from : tentativeTo) : draft.from;
  const hi = draft.from && tentativeTo ? (draft.from < tentativeTo ? tentativeTo : draft.from) : null;

  function dayClasses(day: Date): string {
    const base =
      'h-9 w-full flex items-center justify-center text-sm transition-colors cursor-pointer ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-card';
    const isEdge = (lo && sameDay(day, lo)) || (hi && sameDay(day, hi));
    const inRange = lo && hi && day > lo && day < hi;
    const isToday = sameDay(day, new Date());
    if (isEdge) return `${base} rounded-lg bg-primary text-primary-foreground font-bold shadow-sm`;
    if (inRange) return `${base} bg-primary/12 text-primary rounded-none`;
    return `${base} rounded-lg text-foreground hover:bg-muted ${isToday ? 'font-bold text-primary ring-1 ring-inset ring-primary/40' : ''}`;
  }

  const MonthGrid = ({ base, className = '' }: { base: Date; className?: string }) => {
    const cells = monthCells(base.getFullYear(), base.getMonth());
    return (
      <div className={`w-60 ${className}`}>
        <div className="mb-2 text-center text-sm font-semibold text-foreground">
          {months[base.getMonth()]} {base.getFullYear()}
        </div>
        <div className="grid grid-cols-7">
          {weekdays.map((w) => (
            <div key={w} className="py-1 text-center text-[10px] font-medium text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {cells.map((day, i) =>
            day ? (
              <button
                key={i}
                type="button"
                onClick={() => pickDay(day)}
                onMouseEnter={() => setHover(day)}
                className={dayClasses(day)}
                aria-label={fmt(day)}
              >
                {day.getDate()}
              </button>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      </div>
    );
  };

  const hasValue = Boolean(value.from);
  const triggerLabel = hasValue
    ? value.to && value.from && !sameDay(value.from, value.to)
      ? `${fmt(value.from as Date)} — ${fmt(value.to)}`
      : fmt(value.from as Date)
    : lang === 'ar'
      ? 'التاريخ'
      : 'Date';

  return (
    // بلا relative عمدًا: تُفتح اللوحة أسفل شريط الأدوات (الأب positioned) لا أسفل الزر —
    // فتظهر تحت مربع البحث بمحاذاة اليمين. يتطلّب أن يكون الأب المباشر `relative`.
    <div ref={rootRef}>
      {/* الزر المُشغِّل */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          hasValue ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-primary" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        {hasValue ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={lang === 'ar' ? 'مسح فلتر التاريخ' : 'Clear date filter'}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: null, to: null });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange({ from: null, to: null });
              }
            }}
            className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {/* اللوحة */}
      {open && (
        <div
          role="dialog"
          aria-label={lang === 'ar' ? 'اختيار مدى التاريخ' : 'Select date range'}
          className={`absolute top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? 'right-4' : 'left-4'
          }`}
        >
          <div className="flex flex-col sm:flex-row">
            {/* المعاينات الجانبية */}
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-36 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-e">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-right text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* الشهور */}
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                  aria-label={lang === 'ar' ? 'الشهر السابق' : 'Previous month'}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  aria-label={lang === 'ar' ? 'الشهر التالي' : 'Next month'}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
              <div
                className="flex flex-col gap-4 sm:flex-row"
                onMouseLeave={() => setHover(null)}
              >
                <MonthGrid base={viewMonth} />
                <MonthGrid base={addMonths(viewMonth, 1)} className="hidden sm:block" />
              </div>
            </div>
          </div>

          {/* التذييل: المدى المختار + تطبيق/مسح */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {draft.from
                ? draft.to
                  ? `${fmt(draft.from)} — ${fmt(draft.to)}`
                  : fmt(draft.from)
                : lang === 'ar'
                  ? 'اختاري تاريخًا أو مدى'
                  : 'Pick a date or range'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange({ from: null, to: null });
                  setOpen(false);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {lang === 'ar' ? 'مسح' : 'Clear'}
              </button>
              <button
                type="button"
                disabled={!draft.from}
                onClick={() => {
                  onChange({ from: draft.from, to: draft.to ?? draft.from });
                  setOpen(false);
                }}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
