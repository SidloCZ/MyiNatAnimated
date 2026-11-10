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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const timeframeRef = useRef<HTMLDivElement>(null);
  const [progressText, setProgressText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const t = translations[locale];

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

  const formatDisplayDate = (isoStr: string): string => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoStr;
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
      setDateFrom(`${currentYear - 1}-01-01`);
      setDateTo(`${currentYear - 1}-12-31`);
    } else if (preset === 'summer') {
      setDateFrom(`${currentYear - 1}-06-01`);
      setDateTo(`${currentYear - 1}-08-31`);
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
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

    if (dateFrom && dateTo && dateFrom > dateTo) {
      setErrorText(t.invalidDateRange);
      return;
    }

    setErrorText(null);
    setIsLoading(true);
    setProgressText(t.checkingUser);

    try {
      const observations = await fetchObservations({
        username: cleanUsername,
        d1: dateFrom || undefined,
        d2: dateTo || undefined,
        locale,
        maxObservations: 2500,
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
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
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

        <div ref={timeframeRef}>
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
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && activeField === 'from') {
                    setIsCalendarOpen(false);
                  } else {
                    setActiveField('from');
                    setIsCalendarOpen(true);
                  }
                }}
                disabled={isLoading}
                className={`w-full flex items-center justify-between pl-10 pr-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-left transition cursor-pointer ${
                  isCalendarOpen && activeField === 'from'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-900/90 text-white'
                    : 'border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 shrink-0" />
                <span className={dateFrom ? 'text-white font-medium tracking-wide' : 'text-slate-500'}>
                  {dateFrom ? formatDisplayDate(dateFrom) : (locale === 'cs' ? 'Od' : 'From')}
                </span>
                {dateFrom && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateFrom('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setDateFrom('');
                      }
                    }}
                    className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    title={locale === 'cs' ? 'Vymazat počáteční datum' : 'Clear start date'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </div>

            {/* "To" window */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && activeField === 'to') {
                    setIsCalendarOpen(false);
                  } else {
                    setActiveField('to');
                    setIsCalendarOpen(true);
                  }
                }}
                disabled={isLoading}
                className={`w-full flex items-center justify-between pl-10 pr-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-left transition cursor-pointer ${
                  isCalendarOpen && activeField === 'to'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-900/90 text-white'
                    : 'border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 shrink-0" />
                <span className={dateTo ? 'text-white font-medium tracking-wide' : 'text-slate-500'}>
                  {dateTo ? formatDisplayDate(dateTo) : (locale === 'cs' ? 'Do' : 'To')}
                </span>
                {dateTo && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateTo('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setDateTo('');
                      }
                    }}
                    className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    title={locale === 'cs' ? 'Vymazat koncové datum' : 'Clear end date'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Date Picker floating overlay that opens directly below without stretching the card */}
          {isCalendarOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50">
              <DateRangeCalendar
                dateFrom={dateFrom}
                dateTo={dateTo}
                activeField={activeField}
                onSelectDate={(field, dateStr) => {
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
                  setDateFrom(fromStr);
                  setDateTo(toStr);
                }}
                onClear={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                onClose={() => setIsCalendarOpen(false)}
                locale={locale}
              />
            </div>
          )}
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
  );
};

