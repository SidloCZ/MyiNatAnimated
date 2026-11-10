import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X, Check } from 'lucide-react';
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

const CS_MONTHS_SHORT = [
  'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn',
  'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro',
];

const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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
  // Navigation mode: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Initial month to display (from active field date, fallback to other field, or today)
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

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Decade base for year picker (12 years displayed)
  const [yearDecadeBase, setYearDecadeBase] = useState(() => Math.floor(viewYear / 12) * 12);

  // Sync year decade base when viewYear changes
  useEffect(() => {
    setYearDecadeBase(Math.floor(viewYear / 12) * 12);
  }, [viewYear]);

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

  const monthNames = locale === 'cs' ? CS_MONTHS : EN_MONTHS;
  const shortMonthNames = locale === 'cs' ? CS_MONTHS_SHORT : EN_MONTHS_SHORT;
  const weekdays = locale === 'cs' ? CS_WEEKDAYS : EN_WEEKDAYS;

  // Header navigation
  const handlePrev = () => {
    if (viewMode === 'years') {
      setYearDecadeBase((b) => b - 12);
    } else if (viewMode === 'months') {
      setViewDate(new Date(viewYear - 1, viewMonth, 1));
    } else {
      setViewDate(new Date(viewYear, viewMonth - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'years') {
      setYearDecadeBase((b) => b + 12);
    } else if (viewMode === 'months') {
      setViewDate(new Date(viewYear + 1, viewMonth, 1));
    } else {
      setViewDate(new Date(viewYear, viewMonth + 1, 1));
    }
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
    const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

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

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatIso(viewYear, viewMonth, d);
      days.push({
        dateStr: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayIso,
      });
    }

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
      };
    }
    if (dateFrom && dateTo) {
      return {
        start: dateFrom < dateTo ? dateFrom : dateTo,
        end: dateFrom < dateTo ? dateTo : dateFrom,
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
    if (!isDragging) {
      onSelectDate(activeField, dateStr);
    }
  };

  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    onSelectDate(activeField, today);
    setViewDate(new Date());
    setViewMode('days');
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[340px] sm:max-w-[360px] mx-auto bg-slate-900/98 border border-slate-700/90 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-slate-100 ring-1 ring-slate-800"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header with Navigation and View Toggles */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          {/* Year selector button (Step 1: selects year -> switches to months) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'years'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={locale === 'cs' ? 'Vybrat rok' : 'Select year'}
          >
            <span>{viewMode === 'years' ? `${yearDecadeBase}–${yearDecadeBase + 11}` : viewYear}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${viewMode === 'years' ? 'rotate-180' : ''}`} />
          </button>

          {/* Month selector button (Step 2: selects month -> switches to days) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'months'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={locale === 'cs' ? 'Vybrat měsíc' : 'Select month'}
          >
            <span>{monthNames[viewMonth]}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${viewMode === 'months' ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title={locale === 'cs' ? 'Předchozí' : 'Previous'}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title={locale === 'cs' ? 'Následující' : 'Next'}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: YEARS GRID */}
      {viewMode === 'years' && (
        <div className="py-1">
          <div className="text-[11px] font-medium text-slate-400 mb-2 px-1">
            {locale === 'cs' ? 'Krok 1: Vyberte rok' : 'Step 1: Select a year'}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => yearDecadeBase + i).map((y) => {
              const isSelected = y === viewYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(y, viewMonth, 1));
                    // Workflow: after choosing year, choose month
                    setViewMode('months');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MONTHS GRID */}
      {viewMode === 'months' && (
        <div className="py-1">
          <div className="text-[11px] font-medium text-slate-400 mb-2 px-1">
            {locale === 'cs' ? `Krok 2: Vyberte měsíc v roce ${viewYear}` : `Step 2: Select a month in ${viewYear}`}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((mName, mIdx) => {
              const isSelected = mIdx === viewMonth;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(viewYear, mIdx, 1));
                    // Workflow: after choosing month, choose day
                    setViewMode('days');
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold truncate transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                  title={mName}
                >
                  {shortMonthNames[mIdx]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: DAYS GRID */}
      {viewMode === 'days' && (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map((day, idx) => (
              <div
                key={day}
                className={`text-[10px] font-semibold py-0.5 ${
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
                  } ${isRangeStart ? 'rounded-l-md' : ''} ${isRangeEnd ? 'rounded-r-md' : ''}`}
                >
                  <button
                    type="button"
                    onMouseDown={() => handleDayMouseDown(dateStr)}
                    onMouseEnter={() => handleDayMouseEnter(dateStr)}
                    onClick={() => handleDayClick(dateStr)}
                    className={`w-7 h-7 rounded-md text-[11px] flex items-center justify-center transition-all cursor-pointer relative ${btnClass}`}
                  >
                    {dayNumber}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={setToday}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
        >
          {locale === 'cs' ? 'Dnes' : 'Today'}
        </button>

        <div className="flex items-center gap-1.5">
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
              title={locale === 'cs' ? 'Vymazat vybraná data' : 'Clear dates'}
            >
              <X className="w-3 h-3" />
              <span>{locale === 'cs' ? 'Smazat' : 'Clear'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>{locale === 'cs' ? 'Hotovo' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
