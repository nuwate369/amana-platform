'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * منتقي نطاق تاريخ للإشعارات (بداية + نهاية) مع شرط: النهاية >= البداية + يوم.
 * يُعيد { startsAt, expiresAt } كـ ISO strings (نهاية اليوم).
 * التصميم: يطابق DateRangePicker الموجود (أنثراسايت + ذهبي، RTL/LTR).
 */

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const AR_WEEK = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const EN_WEEK = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

function monthCells(year: number, month: number): (Date|null)[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month+1, 0).getDate();
  const cells: (Date|null)[] = Array.from({length: startWeekday}, () => null);
  for (let d=1; d<=daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** القيمة الخارجية */
export interface AnnouncementDateRangeValue {
  startsAt:  string;   // ISO
  expiresAt: string;   // ISO
}

interface Props {
  value: AnnouncementDateRangeValue;
  onChange: (v: AnnouncementDateRangeValue) => void;
  lang: 'ar' | 'en';
  isRtl: boolean;
  /** رسالة الخطأ من الخارج (مثلاً «أقلّ مدة يوم واحد») */
  error?: string | null;
}

export function AnnouncementDateRange({ value, onChange, lang, isRtl, error }: Props) {
  const ar = lang === 'ar';
  const months   = ar ? AR_MONTHS : EN_MONTHS;
  const weekdays = ar ? AR_WEEK   : EN_WEEK;

  // draft داخلي قبل التطبيق
  const [open, setOpen]         = useState(false);
  const [picking, setPicking]   = useState<'start'|'end'>('start');  // أي طرف يُختار حالياً
  const [draftStart, setDraftStart] = useState<Date>(() => new Date(value.startsAt));
  const [draftEnd,   setDraftEnd]   = useState<Date>(() => new Date(value.expiresAt));
  const [hover, setHover]       = useState<Date|null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => firstOfMonth(new Date(value.startsAt)));
  const rootRef = useRef<HTMLDivElement>(null);

  // إغلاق بالنقر خارجاً أو Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openPicker() {
    setDraftStart(new Date(value.startsAt));
    setDraftEnd(new Date(value.expiresAt));
    setViewMonth(firstOfMonth(new Date(value.startsAt)));
    setPicking('start');
    setHover(null);
    setOpen(true);
  }

  function pickDay(day: Date) {
    if (picking === 'start') {
      const s = startOfDay(day);
      // النهاية يجب أن تبقى بعد البداية بيوم على الأقل
      const minEnd = new Date(s); minEnd.setDate(minEnd.getDate() + 1);
      if (draftEnd <= minEnd) setDraftEnd(minEnd);
      setDraftStart(s);
      setPicking('end');
    } else {
      const minEnd = new Date(draftStart); minEnd.setDate(minEnd.getDate() + 1);
      if (day < minEnd) return; // تجاهل النقر إن كان أقل من الحد الأدنى
      setDraftEnd(endOfDay(day));
      setPicking('start');
    }
  }

  function apply() {
    onChange({
      startsAt:  draftStart.toISOString(),
      expiresAt: draftEnd.toISOString(),
    });
    setOpen(false);
  }

  // الحد الأدنى لتاريخ النهاية (يوم بعد البداية)
  const minEnd = new Date(draftStart); minEnd.setDate(minEnd.getDate() + 1);

  // العرض المرئي للنطاق
  const lo = draftStart;
  const hi = picking === 'end' && hover && hover > minEnd ? hover : draftEnd;

  function dayClasses(day: Date): string {
    const base = 'h-9 w-full flex items-center justify-center text-sm transition-colors cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
    const isPast = picking === 'end' && day < minEnd;
    if (isPast) return `${base} opacity-25 cursor-not-allowed`;
    const isStart = sameDay(day, lo);
    const isEnd   = sameDay(day, hi);
    const inRange = day > lo && day < hi;
    const isToday = sameDay(day, new Date());
    if (isStart || isEnd) return `${base} bg-primary text-primary-foreground font-bold shadow-sm`;
    if (inRange) return `${base} bg-primary/12 text-primary rounded-none`;
    return `${base} text-foreground hover:bg-muted ${isToday ? 'font-bold text-primary ring-1 ring-inset ring-primary/40' : ''}`;
  }

  const MonthGrid = ({ base, className='' }: { base: Date; className?: string }) => {
    const cells = monthCells(base.getFullYear(), base.getMonth());
    return (
      <div className={`w-60 ${className}`}>
        <div className="mb-2 text-center text-sm font-semibold text-foreground">
          {months[base.getMonth()]} {base.getFullYear()}
        </div>
        <div className="grid grid-cols-7">
          {weekdays.map(w => (
            <div key={w} className="py-1 text-center text-[10px] font-medium text-muted-foreground">{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => day ? (
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
          ) : <div key={i} />)}
        </div>
      </div>
    );
  };

  const triggerLabel = `${fmt(new Date(value.startsAt))} — ${fmt(new Date(value.expiresAt))}`;

  return (
    <div ref={rootRef} className="space-y-1">
      {/* تسمية الحقلين */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{ar ? 'تاريخ البداية' : 'Start date'}</span>
        <span className="text-muted-foreground/40">→</span>
        <span>{ar ? 'تاريخ الانتهاء' : 'End date'}</span>
      </div>

      {/* الزر المُشغِّل */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          error
            ? 'border-destructive bg-destructive/5 text-foreground'
            : 'border-border bg-background text-foreground hover:bg-muted'
        }`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-start whitespace-nowrap">{triggerLabel}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          picking === 'start' && open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {ar ? 'بداية' : 'Start'}
        </span>
        <span className="text-muted-foreground/40">→</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          picking === 'end' && open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {ar ? 'نهاية' : 'End'}
        </span>
      </button>

      {/* رسالة الخطأ */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* رسالة مساعدة */}
      {!error && (
        <p className="text-xs text-muted-foreground">
          {ar
            ? 'الحدّ الأدنى: يوم واحد. لن يظهر الإشعار بعد تاريخ الانتهاء.'
            : 'Minimum 1 day. Notification hidden after expiry date.'}
        </p>
      )}

      {/* اللوحة */}
      {open && (
        <div
          role="dialog"
          aria-label={ar ? 'اختيار نطاق التاريخ' : 'Select date range'}
          className={`absolute z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? 'right-0' : 'left-0'
          }`}
        >
          {/* تبويب البداية / النهاية */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setPicking('start')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                picking === 'start'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {ar ? '📅 تاريخ البداية' : '📅 Start date'}
              <span className="ml-2 text-xs opacity-80">{fmt(draftStart)}</span>
            </button>
            <span className="text-muted-foreground">→</span>
            <button
              type="button"
              onClick={() => setPicking('end')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                picking === 'end'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {ar ? '🏁 تاريخ الانتهاء' : '🏁 End date'}
              <span className="ml-2 text-xs opacity-80">{fmt(draftEnd)}</span>
            </button>
          </div>

          {/* تعليمة ديناميكية */}
          <div className="border-b border-border bg-primary/5 px-4 py-1.5 text-center text-xs text-primary">
            {picking === 'start'
              ? (ar ? 'اختر تاريخ بداية الإشعار' : 'Pick the start date')
              : (ar ? `اختر تاريخ الانتهاء (الأدنى: ${fmt(minEnd)})` : `Pick end date (min: ${fmt(minEnd)})`)}
          </div>

          {/* الشهران */}
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth(m => addMonths(m, -1))}
                aria-label={ar ? 'الشهر السابق' : 'Previous month'}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(m => addMonths(m, 1))}
                aria-label={ar ? 'الشهر التالي' : 'Next month'}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row" onMouseLeave={() => setHover(null)}>
              <MonthGrid base={viewMonth} />
              <MonthGrid base={addMonths(viewMonth, 1)} className="hidden sm:block" />
            </div>
          </div>

          {/* التذييل */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {fmt(draftStart)} → {fmt(draftEnd)}
              {' '}
              <span className="text-primary">
                ({Math.round((draftEnd.getTime()-draftStart.getTime())/(86400*1000))} {ar ? 'يوم' : 'days'})
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {ar ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
