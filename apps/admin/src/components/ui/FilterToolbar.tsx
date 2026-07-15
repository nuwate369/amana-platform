'use client';

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  Search, SlidersHorizontal, ChevronDown, X, Check, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';

/**
 * شريط فلاتر موحّد قابل لإعادة الاستخدام عبر كل الشاشات — بحث + ترتيب + شرائح فلاتر
 * منسدلة (config-driven). هوية أمانة (أنثراسايت/ذهبي) عبر رموز التصميم الدلالية فقط،
 * RTL + وضع داكن، ومتوافق مع لوحة المفاتيح (تركيز مرئي، Escape، role=listbox/option).
 *
 * تطبيق مهارات: ui-ux-pro-max (a11y/تفاعل/كثافة)، design-system (رموز دلالية بلا hex)،
 * ui-styling (منسدلات مبنية يدويًا بلا Radix)، brand (الذهبي للحالة النشطة/الإجراء).
 */

type IconType = ComponentType<{ className?: string }>;

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** مفتاح فريد (يُعاد في onFilterChange). */
  key: string;
  /** تسمية «الكل» للفلتر (تظهر حين لا قيمة مختارة). */
  label: string;
  icon: IconType;
  options: FilterOption[];
  /** القيمة الحالية ('' = الكل). */
  value: string;
}

export interface SortState {
  value: string;
  dir: 'asc' | 'desc';
}

export interface FilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions: FilterOption[];
  sort: SortState;
  onSortChange: (value: string) => void;
  onSortDirToggle: () => void;
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  /** عناصر إضافية في الصف العلوي (بجانب البحث). */
  extraControls?: ReactNode;
  /** عنصر يُوضع أوّل صفّ الفلاتر (يمينًا في RTL) — مثل منتقي التاريخ. */
  filterLead?: ReactNode;
  lang: 'ar' | 'en';
  isRtl: boolean;
  /** فتح صف الفلاتر افتراضيًّا. */
  defaultOpen?: boolean;
}

/** إغلاق القائمة بالنقر خارجًا أو Escape. */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** قائمة الخيارات المنسدلة (تُعاد استخدامها للفلتر والترتيب). */
function MenuList({
  options,
  value,
  onSelect,
  isRtl,
}: {
  options: FilterOption[];
  value: string;
  onSelect: (value: string) => void;
  isRtl: boolean;
}) {
  return (
    <div
      role="listbox"
      className={`absolute top-full z-50 mt-1 max-h-64 min-w-[11rem] overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
        isRtl ? 'right-0' : 'left-0'
      }`}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value || '__all'}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(o.value)}
            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-right text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            <span>{o.label}</span>
            {selected ? <Check className="w-4 h-4 shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** شريحة فلتر منسدلة: أيقونة + تسمية + مسح (X) + قائمة خيارات. */
function FilterChip({
  config,
  allLabel,
  onChange,
  isRtl,
}: {
  config: FilterConfig;
  allLabel: string;
  onChange: (value: string) => void;
  isRtl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const Icon = config.icon;
  const active = Boolean(config.value);
  const label = config.options.find((o) => o.value === config.value)?.label ?? config.label;
  const menuOptions: FilterOption[] = [{ value: '', label: allLabel }, ...config.options];

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-lg border transition-colors ${
          active ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={active ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {active ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`${allLabel}`}
            title={allLabel}
            className="pe-2.5 ps-1 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      {open ? (
        <MenuList
          options={menuOptions}
          value={config.value}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
          isRtl={isRtl}
        />
      ) : null}
    </div>
  );
}

/** ضابط الترتيب: تسمية + قائمة معايير + زر اتجاه (تصاعدي/تنازلي). */
function SortControl({
  options,
  sort,
  onChange,
  onDirToggle,
  isRtl,
  label,
  ascLabel,
  descLabel,
}: {
  options: FilterOption[];
  sort: SortState;
  onChange: (value: string) => void;
  onDirToggle: () => void;
  isRtl: boolean;
  label: string;
  ascLabel: string;
  descLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const current = options.find((o) => o.value === sort.value)?.label ?? '';

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">{label}</span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowUpDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="whitespace-nowrap">{current}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open ? (
          <MenuList
            options={options}
            value={sort.value}
            onSelect={(v) => {
              onChange(v);
              setOpen(false);
            }}
            isRtl={isRtl}
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDirToggle}
        title={sort.dir === 'asc' ? ascLabel : descLabel}
        aria-label={sort.dir === 'asc' ? ascLabel : descLabel}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {sort.dir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  sortOptions,
  sort,
  onSortChange,
  onSortDirToggle,
  filters = [],
  onFilterChange,
  extraControls,
  filterLead,
  lang,
  isRtl,
  defaultOpen = false,
}: FilterToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(defaultOpen);
  const activeCount = filters.filter((f) => Boolean(f.value)).length;

  const L =
    lang === 'ar'
      ? { all: 'الكل', filter: 'تصفية', sort: 'ترتيب:', asc: 'تصاعدي', desc: 'تنازلي', clearAll: 'مسح الكل', search: 'بحث…' }
      : { all: 'All', filter: 'Filter', sort: 'Sort:', asc: 'Ascending', desc: 'Descending', clearAll: 'Clear all', search: 'Search…' };

  return (
    <div className="space-y-2">
      {/* الصف العلوي: البحث (يمينًا) ← إضافات ← الترتيب ← زر التصفية (يسارًا) */}
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? L.search}
            className="h-10 w-full rounded-lg border border-border bg-background pr-9 pl-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {extraControls}

        <SortControl
          options={sortOptions}
          sort={sort}
          onChange={onSortChange}
          onDirToggle={onSortDirToggle}
          isRtl={isRtl}
          label={L.sort}
          ascLabel={L.asc}
          descLabel={L.desc}
        />

        {filters.length > 0 || filterLead ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filtersOpen || activeCount > 0
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border text-foreground hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {L.filter}
            {activeCount > 0 ? (
              <span className="rounded-full bg-white/25 px-1.5 text-xs font-bold">{activeCount}</span>
            ) : null}
            {filtersOpen ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        ) : null}
      </div>

      {/* صف شرائح الفلاتر (قابل للطيّ) — التاريخ أوّلًا (يمينًا) ثم الشرائح */}
      {filtersOpen && (filters.length > 0 || filterLead) ? (
        <div className="relative flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {filterLead}
          {filters.map((f) => (
            <FilterChip
              key={f.key}
              config={f}
              allLabel={f.label}
              onChange={(v) => onFilterChange?.(f.key, v)}
              isRtl={isRtl}
            />
          ))}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => filters.forEach((f) => onFilterChange?.(f.key, ''))}
              className="ms-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="w-3.5 h-3.5" />
              {L.clearAll}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
