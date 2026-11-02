import React, { useState } from 'react';
import { Search, Sparkles, Calendar, User, AlertCircle } from 'lucide-react';
import { DEMO_USER, DEMO_OBSERVATIONS } from '../services/demoData';
import { InatObservation } from '../types/inat';
import { fetchObservations } from '../services/inatApi';

interface SearchFormProps {
  onDataLoaded: (observations: InatObservation[], username: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onDataLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [username, setUsername] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [progressText, setProgressText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

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
    onDataLoaded(DEMO_OBSERVATIONS, DEMO_USER);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorText('Zadejte prosím uživatelské jméno na iNaturalistu.');
      return;
    }

    setErrorText(null);
    setIsLoading(true);
    setProgressText('Zjišťuji počet pozorování...');

    try {
      const observations = await fetchObservations({
        username: cleanUsername,
        d1: dateFrom || undefined,
        d2: dateTo || undefined,
        maxObservations: 2500,
        onProgress: (loaded, total) => {
          setProgressText(`Načteno ${loaded} z ${total} pozorování...`);
        },
      });

      if (observations.length === 0) {
        setErrorText('Pro zadaného uživatele a období nebyla nalezena žádná pozorování se souřadnicemi.');
      } else {
        onDataLoaded(observations, cleanUsername);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nastala neočekávaná chyba při načítání dat.';
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
            Zadání účtu a období
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Zadejte uživatele sítě iNaturalist nebo vyzkoušejte připravené demo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
          title="Načíst ukázková data"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Uživatelské jméno
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="např. jmeno_uzivatele"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Období pozorování
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset('year')}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Minulý rok
              </button>
              <button
                type="button"
                onClick={() => handlePreset('summer')}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Léto
              </button>
              <button
                type="button"
                onClick={() => handlePreset('all')}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Vše
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white text-xs outline-none transition"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white text-xs outline-none transition"
              />
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
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          <Search className="w-4 h-4" />
          {isLoading ? 'Načítání…' : 'Načíst'}
        </button>
      </form>
    </div>
  );
};

