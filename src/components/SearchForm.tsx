import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Calendar, User, AlertCircle, X } from 'lucide-react';
import { DEMO_USER, getDemoObservations } from '../services/demoData';
import { InatObservation } from '../types/inat';
import { fetchObservations } from '../services/inatApi';
import { Language, translations } from '../i18n/translations';
import { DateRangeCalendar } from './DateRangeCalendar';

interface SearchFormProps {
  onDataLoaded: (observations: InatObservation[], username: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  locale?: Language;
}

const STORAGE_KEY_USERNAME = 'myinat_last_username';

export const SearchForm: React.FC<SearchFormProps> = ({
  onDataLoaded,
  isLoading,
  setIsLoading,
  locale = 'en',
}) => {
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USERNAME) || '';
    } catch (_) {
      return '';
    }
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rawInputFrom, setRawInputFrom] = useState('');
  const [rawInputTo, setRawInputTo] = useState('');
  const [isAllRange, setIsAllRange] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const timeframeRef = useRef<HTMLDivElement>(null);
  const [progressText, setProgressText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const t = translations[locale];

  // Sync text inputs whenever dateFrom / dateTo is updated (presets, calendar selection, clear)
  useEffect(() => {
    if (!isAllRange) {
      setRawInputFrom(dateFrom ? dateFrom.replace(/-/g, '/') : '');
    }
  }, [dateFrom, isAllRange]);

  useEffect(() => {
    if (!isAllRange) {
      setRawInputTo(dateTo ? dateTo.replace(/-/g, '/') : '');
    }
  }, [dateTo, isAllRange]);

  // Keep "All" preset text localized if language switches while active
  useEffect(() => {
    if (isAllRange) {
      setRawInputFrom(t.sinceBegan);
      setRawInputTo(t.untilNow);
    }
  }, [locale, isAllRange, t.sinceBegan, t.untilNow]);

  // Close calendar on outside click
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCalendarOpen]);

  const isoToSlashFormat = (isoStr: string): string => {
    if (!isoStr) return '';
    return isoStr.replace(/-/g, '/');
  };

  const parseDateInputToIso = (val: string): string | null => {
    if (!val) return null;
    const match = val.trim().match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d > daysInMonth) return null;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  const formatAsDateInput = (value: string, prevValue: string): string => {
    // If user is deleting/backspacing, allow it without adding characters
    if (value.length < prevValue.length) {
      return value;
    }

    // Replace dots or dashes with slashes
    let cleaned = value.replace(/[.-]/g, '/');
    // Keep only digits and slashes
    cleaned = cleaned.replace(/[^\d/]/g, '');

    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }

    // Auto-insert slash after year (4 digits) if user hasn't typed one
    if (/^\d{4}$/.test(cleaned)) {
      cleaned = `${cleaned}/`;
    }
    // Auto-insert slash after month (YYYY/MM) if user hasn't typed one
    else if (/^\d{4}\/\d{2}$/.test(cleaned)) {
      cleaned = `${cleaned}/`;
    }

    return cleaned;
  };

  const stripPresetText = (val: string): string => {
    return val
      .replace(translations.cs.sinceBegan, '')
      .replace(translations.en.sinceBegan, '')
      .replace(translations.cs.untilNow, '')
      .replace(translations.en.untilNow, '');
  };

  const handleInputChange = (field: 'from' | 'to', value: string) => {
    if (isAllRange) {
      setIsAllRange(false);
      value = stripPresetText(value);
    }
    if (field === 'from') {
      const formatted = formatAsDateInput(value, rawInputFrom);
      setRawInputFrom(formatted);
      if (formatted.trim() === '') {
        setDateFrom('');
      } else {
        const iso = parseDateInputToIso(formatted);
        if (iso) {
          setDateFrom(iso);
        }
      }
    } else {
      const formatted = formatAsDateInput(value, rawInputTo);
      setRawInputTo(formatted);
      if (formatted.trim() === '') {
        setDateTo('');
      } else {
        const iso = parseDateInputToIso(formatted);
        if (iso) {
          setDateTo(iso);
        }
      }
    }
  };

  const handleBlur = (field: 'from' | 'to') => {
    if (isAllRange) return;
    if (field === 'from') {
      if (rawInputFrom.trim() === '') {
        setDateFrom('');
        setRawInputFrom('');
      } else {
        const iso = parseDateInputToIso(rawInputFrom);
        if (iso) {
          setDateFrom(iso);
          setRawInputFrom(isoToSlashFormat(iso));
        } else {
          setRawInputFrom(dateFrom ? isoToSlashFormat(dateFrom) : '');
        }
      }
    } else {
      if (rawInputTo.trim() === '') {
        setDateTo('');
        setRawInputTo('');
      } else {
        const iso = parseDateInputToIso(rawInputTo);
        if (iso) {
          setDateTo(iso);
          setRawInputTo(isoToSlashFormat(iso));
        } else {
          setRawInputTo(dateTo ? isoToSlashFormat(dateTo) : '');
        }
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'from' | 'to') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(field);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    try {
      if (val.trim()) {
        localStorage.setItem(STORAGE_KEY_USERNAME, val.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY_USERNAME);
      }
    } catch (_) {
      // Ignore local storage error
    }
  };

  const handlePreset = (preset: 'year' | 'summer' | 'all') => {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (preset === 'year') {
      setIsAllRange(false);
      setDateFrom(`${currentYear - 1}-01-01`);
      setDateTo(`${currentYear - 1}-12-31`);
    } else if (preset === 'summer') {
      setIsAllRange(false);
      setDateFrom(`${currentYear}-06-01`);
      setDateTo(`${currentYear}-08-31`);
    } else if (preset === 'all') {
      setIsAllRange(true);
      setDateFrom('');
      setDateTo('');
      setRawInputFrom(t.sinceBegan);
      setRawInputTo(t.untilNow);
    }
  };

  const handleDemoClick = () => {
    setUsername(DEMO_USER);
    setErrorText(null);
    onDataLoaded(getDemoObservations(locale), DEMO_USER);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalendarOpen(false);
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorText(locale === 'cs' ? 'Zadejte prosím uživatelské jméno na iNaturalistu.' : 'Please enter an iNaturalist username.');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_USERNAME, cleanUsername);
    } catch (_) {
      // Ignore local storage error
    }

    const parsedFrom = !isAllRange && rawInputFrom.trim() ? parseDateInputToIso(rawInputFrom) : null;
    const parsedTo = !isAllRange && rawInputTo.trim() ? parseDateInputToIso(rawInputTo) : null;
    const resolvedFrom = parsedFrom || (isAllRange ? undefined : (dateFrom || undefined));
    const resolvedTo = parsedTo || (isAllRange ? undefined : (dateTo || undefined));

    if (resolvedFrom && resolvedTo && resolvedFrom > resolvedTo) {
      setErrorText(t.invalidDateRange);
      return;
    }

    setErrorText(null);
    setIsLoading(true);
    setProgressText(t.checkingUser);

    try {
      const observations = await fetchObservations({
        username: cleanUsername,
        d1: resolvedFrom,
        d2: resolvedTo,
        locale,
        maxObservations: 50000,
        onProgress: (loaded, total) => {
          setProgressText(
            locale === 'cs'
              ? `Načteno ${loaded} z ${total} pozorování…`
              : `Loaded ${loaded} of ${total} observations…`
          );
        },
      });

      if (observations.length === 0) {
        setErrorText(t.userNotFound);
      } else {
        onDataLoaded(observations, cleanUsername);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (locale === 'cs' ? 'Nastala neočekávaná chyba při načítání dat.' : 'An unexpected error occurred while loading data.');
      setErrorText(msg);
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={timeframeRef}>
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {t.searchTitle}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t.searchDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
          title={locale === 'cs' ? 'Načíst ukázková data' : 'Load demo data'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {t.usernameLabel}
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder={t.usernamePlaceholder}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {locale === 'cs' ? 'Období pozorování' : 'Observation timeframe'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handlePreset('year');
                  setIsCalendarOpen(false);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {locale === 'cs' ? 'Minulý rok' : 'Last year'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePreset('summer');
                  setIsCalendarOpen(false);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {locale === 'cs' ? 'Léto' : 'Summer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePreset('all');
                  setIsCalendarOpen(false);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {locale === 'cs' ? 'Vše' : 'All'}
              </button>
            </div>
          </div>

          {/* Timeframe picker windows */}
          <div className="grid grid-cols-2 gap-3">
            {/* "From" window */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 shrink-0 pointer-events-none z-10" />
              <input
                type="text"
                value={rawInputFrom}
                onChange={(e) => handleInputChange('from', e.target.value)}
                onFocus={(e) => {
                  setActiveField('from');
                  setIsCalendarOpen(true);
                  if (isAllRange) {
                    e.target.select();
                  }
                }}
                onClick={() => {
                  setActiveField('from');
                  setIsCalendarOpen(true);
                }}
                onBlur={() => handleBlur('from')}
                onKeyDown={(e) => handleInputKeyDown(e, 'from')}
                placeholder={t.dateFromPlaceholder}
                disabled={isLoading}
                className={`w-full pl-10 pr-8 py-2.5 bg-slate-950 border rounded-xl text-xs font-medium tracking-wide text-white placeholder:text-slate-500 placeholder:opacity-50 placeholder:font-normal outline-none transition ${
                  isCalendarOpen && activeField === 'from'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-900/90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              />
              {(rawInputFrom || dateFrom || isAllRange) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAllRange(false);
                    setDateFrom('');
                    setRawInputFrom('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer z-10"
                  title={locale === 'cs' ? 'Vymazat počáteční datum' : 'Clear start date'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* "To" window */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 shrink-0 pointer-events-none z-10" />
              <input
                type="text"
                value={rawInputTo}
                onChange={(e) => handleInputChange('to', e.target.value)}
                onFocus={(e) => {
                  setActiveField('to');
                  setIsCalendarOpen(true);
                  if (isAllRange) {
                    e.target.select();
                  }
                }}
                onClick={() => {
                  setActiveField('to');
                  setIsCalendarOpen(true);
                }}
                onBlur={() => handleBlur('to')}
                onKeyDown={(e) => handleInputKeyDown(e, 'to')}
                placeholder={t.dateToPlaceholder}
                disabled={isLoading}
                className={`w-full pl-10 pr-8 py-2.5 bg-slate-950 border rounded-xl text-xs font-medium tracking-wide text-white placeholder:text-slate-500 placeholder:opacity-50 placeholder:font-normal outline-none transition ${
                  isCalendarOpen && activeField === 'to'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-900/90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              />
              {(rawInputTo || dateTo || isAllRange) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAllRange(false);
                    setDateTo('');
                    setRawInputTo('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer z-10"
                  title={locale === 'cs' ? 'Vymazat koncové datum' : 'Clear end date'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {errorText && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {isLoading && progressText && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{progressText}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-pulse rounded-full w-2/3" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
        >
          <Search className="w-4 h-4" />
          {isLoading ? t.loading : t.loadStory}
        </button>
      </form>
    </div>

    {/* Date Picker floating overlay: on desktop opens to the RIGHT without moving main window, on mobile opens below */}
    {isCalendarOpen && (
      <div className="z-50 lg:absolute lg:left-[calc(100%+1.25rem)] lg:top-[160px] lg:w-[350px] max-lg:absolute max-lg:top-full max-lg:left-0 max-lg:right-0 max-lg:mt-3">
        <DateRangeCalendar
          dateFrom={dateFrom}
          dateTo={dateTo}
          activeField={activeField}
          onSelectDate={(field, dateStr) => {
            setIsAllRange(false);
            if (field === 'from') {
              setDateFrom(dateStr);
              if (dateTo && dateStr > dateTo) {
                setDateTo(dateStr);
              }
              setActiveField('to');
            } else {
              setDateTo(dateStr);
              if (dateFrom && dateStr < dateFrom) {
                setDateFrom(dateStr);
              }
            }
          }}
          onSelectRange={(fromStr, toStr) => {
            setIsAllRange(false);
            setDateFrom(fromStr);
            setDateTo(toStr);
          }}
          onClear={() => {
            setIsAllRange(false);
            setDateFrom('');
            setDateTo('');
            setRawInputFrom('');
            setRawInputTo('');
          }}
          onClose={() => setIsCalendarOpen(false)}
          locale={locale}
        />
      </div>
    )}
  </div>
);
};

