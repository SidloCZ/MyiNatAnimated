import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Language } from '../i18n/translations';

interface DateRangeCalendarProps {
  dateFrom: string; // 'YYYY-MM-DD'
  dateTo: string;   // 'YYYY-MM-DD'
  activeField: 'from' | 'to';
  onSelectDate: (field: 'from' | 'to', dateStr: string) => void;
  onSelectRange: (fromStr: string, toStr: string) => void;
  onClear: () => void;
  onClose: () => void;
  locale?: Language;
}

const CS_MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CS_WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseIso(isoStr: string): { year: number; month: number; day: number } | null {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
  dateFrom,
  dateTo,
  activeField,
  onSelectDate,
  onSelectRange,
  onClear,
  onClose,
  locale = 'en',
}) => {
  // Determine initial month to display
  // Prioritize active field's date, or fallback to the other field's date, or current date
  const [viewDate, setViewDate] = useState(() => {
    const targetDateStr = activeField === 'from'
      ? (dateFrom || dateTo)
      : (dateTo || dateFrom);

    const parsed = parseIso(targetDateStr);
    if (parsed) {
      return new Date(parsed.year, parsed.month, 1);
    }
    return new Date();
  });

  // When activeField changes or date is set, if viewDate is far off, sync it
  useEffect(() => {
    const targetDateStr = activeField === 'from'
      ? (dateFrom || dateTo)
      : (dateTo || dateFrom);
    const parsed = parseIso(targetDateStr);
    if (parsed) {
      setViewDate(new Date(parsed.year, parsed.month, 1));
    }
  }, [activeField]);

  // Drag selection state for range dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [dragHover, setDragHover] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Global mouseup listener for drag release outside days
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (dragAnchor && dragHover && dragAnchor !== dragHover) {
          const start = dragAnchor < dragHover ? dragAnchor : dragHover;
          const end = dragAnchor < dragHover ? dragHover : dragAnchor;
          onSelectRange(start, end);
        } else if (dragAnchor) {
          onSelectDate(activeField, dragAnchor);
        }
        setIsDragging(false);
        setDragAnchor(null);
        setDragHover(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragAnchor, dragHover, activeField, onSelectDate, onSelectRange]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = locale === 'cs' ? CS_MONTHS : EN_MONTHS;
  const weekdays = locale === 'cs' ? CS_WEEKDAYS : EN_WEEKDAYS;

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Build grid of days (Monday-first)
  const calendarDays = useMemo(() => {
    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayIso = new Date().toISOString().slice(0, 10);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Monday=0, ..., Sunday=6
    const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    // Previous month filler days
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const iso = formatIso(prevDate.getFullYear(), prevDate.getMonth(), dayNum);
      days.push({
        dateStr: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatIso(viewYear, viewMonth, d);
      days.push({
        dateStr: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayIso,
      });
    }

    // Next month filler days to complete rows (up to multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const iso = formatIso(nextDate.getFullYear(), nextDate.getMonth(), d);
      days.push({
        dateStr: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Active range resolution (including drag preview)
  const activeRange = useMemo(() => {
    if (isDragging && dragAnchor && dragHover) {
      return {
        start: dragAnchor < dragHover ? dragAnchor : dragHover,
        end: dragAnchor < dragHover ? dragHover : dragAnchor,
        isLiveDrag: true,
      };
    }
    if (dateFrom && dateTo) {
      return {
        start: dateFrom < dateTo ? dateFrom : dateTo,
        end: dateFrom < dateTo ? dateTo : dateFrom,
        isLiveDrag: false,
      };
    }
    return null;
  }, [isDragging, dragAnchor, dragHover, dateFrom, dateTo]);

  const handleDayMouseDown = (dateStr: string) => {
    setIsDragging(true);
    setDragAnchor(dateStr);
    setDragHover(dateStr);
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if (isDragging) {
      setDragHover(dateStr);
    }
  };

  const handleDayClick = (dateStr: string) => {
    // If not a drag, simple single day selection
    if (!isDragging) {
      onSelectDate(activeField, dateStr);
    }
  };

  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    onSelectDate(activeField, today);
    setViewDate(new Date());
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-slate-100"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-white tracking-wide">
            {monthNames[viewMonth]} {viewYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title={locale === 'cs' ? 'Předchozí měsíc' : 'Previous month'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title={locale === 'cs' ? 'Následující měsíc' : 'Next month'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday columns */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {weekdays.map((day, idx) => (
          <div
            key={day}
            className={`text-[11px] font-semibold py-0.5 ${
              idx >= 5 ? 'text-emerald-400/80' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ dateStr, dayNumber, isCurrentMonth, isToday }) => {
          const isFrom = dateStr === dateFrom;
          const isTo = dateStr === dateTo;
          const isEndpoint = isFrom || isTo;

          const inRange =
            activeRange &&
            dateStr >= activeRange.start &&
            dateStr <= activeRange.end;

          const isRangeStart = activeRange && dateStr === activeRange.start;
          const isRangeEnd = activeRange && dateStr === activeRange.end;

          let btnClass = 'text-slate-300 hover:bg-slate-800 hover:text-white';

          if (!isCurrentMonth) {
            btnClass = 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50';
          }

          if (isEndpoint) {
            btnClass = 'bg-emerald-500 text-slate-950 font-bold shadow-md hover:bg-emerald-400';
          } else if (inRange) {
            btnClass = 'bg-emerald-500/20 text-emerald-200 font-medium hover:bg-emerald-500/30';
          } else if (isToday) {
            btnClass = 'border border-emerald-500/50 text-emerald-300 font-semibold hover:bg-slate-800';
          }

          return (
            <div
              key={dateStr}
              className={`relative flex items-center justify-center ${
                inRange && !isEndpoint ? 'bg-emerald-500/10' : ''
              } ${isRangeStart ? 'rounded-l-lg' : ''} ${isRangeEnd ? 'rounded-r-lg' : ''}`}
            >
              <button
                type="button"
                onMouseDown={() => handleDayMouseDown(dateStr)}
                onMouseEnter={() => handleDayMouseEnter(dateStr)}
                onClick={() => handleDayClick(dateStr)}
                className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer relative ${btnClass}`}
              >
                {dayNumber}
                {isEndpoint && (
                  <span className="sr-only">
                    {isFrom ? (locale === 'cs' ? 'Od' : 'From') : (locale === 'cs' ? 'Do' : 'To')}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Hint and Quick Actions Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="text-[11px] text-slate-400">
          {locale === 'cs' ? 'Kliknutím vyberete den, tažením rozsah.' : 'Click to pick day, drag for range.'}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={setToday}
            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
          >
            {locale === 'cs' ? 'Dnes' : 'Today'}
          </button>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
              title={locale === 'cs' ? 'Vymazat vybrané datum' : 'Clear dates'}
            >
              <X className="w-3 h-3" />
              <span>{locale === 'cs' ? 'Smazat' : 'Clear'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>{locale === 'cs' ? 'Hotovo' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
