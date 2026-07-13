'use client';

import { useState, useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import { CalendarDays } from 'lucide-react';

interface DateRangePickerProps {
  onChange?: (dates: Date[]) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({ onChange, placeholder = 'من تاريخ - إلى تاريخ', className = '' }: DateRangePickerProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
      </div>
      <Flatpickr
        options={{
          mode: 'range',
          locale: Arabic,
          dateFormat: 'Y-m-d',
          showMonths: 2,
        }}
        onChange={onChange}
        className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
        placeholder={placeholder}
      />
      <style jsx global>{`
        /* تخصيص مظهر الكالندر ليتطابق مع الثيم البرتقالي/الدافئ */
        .flatpickr-calendar {
          font-family: inherit;
          border: 1px solid hsl(var(--border));
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .flatpickr-day.selected, 
        .flatpickr-day.startRange, 
        .flatpickr-day.endRange, 
        .flatpickr-day.selected.inRange, 
        .flatpickr-day.startRange.inRange, 
        .flatpickr-day.endRange.inRange, 
        .flatpickr-day.selected:focus, 
        .flatpickr-day.startRange:focus, 
        .flatpickr-day.endRange:focus, 
        .flatpickr-day.selected:hover, 
        .flatpickr-day.startRange:hover, 
        .flatpickr-day.endRange:hover, 
        .flatpickr-day.selected.prevMonthDay, 
        .flatpickr-day.startRange.prevMonthDay, 
        .flatpickr-day.endRange.prevMonthDay, 
        .flatpickr-day.selected.nextMonthDay, 
        .flatpickr-day.startRange.nextMonthDay, 
        .flatpickr-day.endRange.nextMonthDay {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }
        .flatpickr-day.inRange {
          background: hsl(var(--primary) / 0.1);
          border-color: transparent;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
