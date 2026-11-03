import React, { useState, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  UserCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { InatObservation, HighlightItem } from '../types/inat';
import { getObservationPhotoUrl } from '../services/inatApi';
import { Language, translations, formatLocalizedDate } from '../i18n/translations';

interface HighlightPickerProps {
  observations: InatObservation[];
  suggestedHighlights: HighlightItem[];
  selectedIds: Set<number>;
  sequenceType: 'observed' | 'created';
  onSequenceTypeChange: (type: 'observed' | 'created') => void;
  filterObscured: boolean;
  onFilterObscuredChange: (filter: boolean) => void;
  obscuredCount: number;
  filterIsolated: boolean;
  onFilterIsolatedChange: (filter: boolean) => void;
  isolatedCount: number;
  onToggleHighlight: (id: number) => void;
  onProceed: () => void;
  onBack: () => void;
  locale?: Language;
}

export type HighlightSortMode = 'faves' | 'score' | 'comments' | 'date';

export const HighlightPicker: React.FC<HighlightPickerProps> = ({
  observations,
  suggestedHighlights,
  selectedIds,
  sequenceType,
  onSequenceTypeChange,
  filterObscured,
  onFilterObscuredChange,
  obscuredCount,
  filterIsolated,
  onFilterIsolatedChange,
  isolatedCount,
  onToggleHighlight,
  onProceed,
  onBack,
  locale = 'cs',
}) => {
  const t = translations[locale];
  // Výchozí řazení: napřed podle oblíbení, poté podle skóre, poté podle komentářů
  const [sortMode, setSortMode] = useState<HighlightSortMode>('faves');

  const sortedHighlights = useMemo(() => {
    const list = [...suggestedHighlights];
    return list.sort((a, b) => {
      if (sortMode === 'faves') {
        const diffFaves = (b.observation.faves_count || 0) - (a.observation.faves_count || 0);
        if (diffFaves !== 0) return diffFaves;
        const diffScore = b.score - a.score;
        if (diffScore !== 0) return diffScore;
        return (b.observation.comments_count || 0) - (a.observation.comments_count || 0);
      }
      if (sortMode === 'score') {
        const diffScore = b.score - a.score;
        if (diffScore !== 0) return diffScore;
        const diffFaves = (b.observation.faves_count || 0) - (a.observation.faves_count || 0);
        if (diffFaves !== 0) return diffFaves;
        return (b.observation.comments_count || 0) - (a.observation.comments_count || 0);
      }
      if (sortMode === 'comments') {
        const diffComments = (b.observation.comments_count || 0) - (a.observation.comments_count || 0);
        if (diffComments !== 0) return diffComments;
        const diffFaves = (b.observation.faves_count || 0) - (a.observation.faves_count || 0);
        if (diffFaves !== 0) return diffFaves;
        return b.score - a.score;
      }
      // 'date'
      const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
      const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
      return timeA - timeB;
    });
  }, [suggestedHighlights, sortMode]);

  return (
    <div className="w-full max-w-6xl h-[calc(100dvh-6.5rem)] max-h-[860px] flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* 1. Header (Pevná horní lišta) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {t.highlightTitle} ({suggestedHighlights.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.highlightSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            {t.selectedCount}: {selectedIds.size}&nbsp;/&nbsp;12
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400">
            {locale === 'cs' ? `Z celkem: ${observations.length} pozorování` : `Pool: ${observations.length} observations`}
          </span>
          {filterObscured && obscuredCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {locale === 'cs' ? `${obscuredCount} zkreslených skryto` : `${obscuredCount} obscured hidden`}
            </span>
          )}
          {filterIsolated && isolatedCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {locale === 'cs' ? `${isolatedCount} osamocených vynecháno` : `${isolatedCount} isolated skipped`}
            </span>
          )}
        </div>
      </div>

      {/* 2. Sort Controls Bar (Přepínač řazení) */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            {t.sortLabel}
          </span>
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSortMode('faves')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${sortMode === 'faves'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Star className="w-3 h-3 fill-current" />
              {t.sortByFaves}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('score')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${sortMode === 'score'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Sparkles className="w-3 h-3" />
              {t.sortByScore}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('comments')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${sortMode === 'comments'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <MessageSquare className="w-3 h-3" />
              {t.sortByComments}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('date')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${sortMode === 'date'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Calendar className="w-3 h-3" />
              {t.sortByDate}
            </button>
          </div>
        </div>

        {/* Rychlý výběr: Vybrat doporučené / Zrušit výběr */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const top12 = new Set(sortedHighlights.slice(0, 12).map(h => h.observation.id));
              // Trigger state through callback or replace
              top12.forEach(id => {
                if (!selectedIds.has(id)) onToggleHighlight(id);
              });
            }}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {t.selectAllBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach(id => onToggleHighlight(id));
            }}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {t.deselectAllBtn}
          </button>
        </div>
      </div>

      {/* 3. Cards Grid (Jediná scrollovatelná oblast, plně přizpůsobená výšce) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sortedHighlights.map(({ observation, score }) => {
          const isSelected = selectedIds.has(observation.id);
          const photoUrl = getObservationPhotoUrl(observation, 'medium');
          const commonName = observation.taxon?.preferred_common_name || observation.taxon?.name || 'Pozorování';
          const latinName = observation.taxon?.name;
          const idCount = observation.identifications_count || 0;

          return (
            <div
              key={observation.id}
              onClick={() => onToggleHighlight(observation.id)}
              className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer transition select-none ${isSelected
                ? 'border-emerald-500/80 bg-slate-800/80 shadow-md'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-70 hover:opacity-100'
                }`}
            >
              {/* Photo banner */}
              <div className="relative w-full h-28 sm:h-32 bg-slate-900 overflow-hidden shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={commonName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 bg-slate-950">
                    Bez fotografie (zvuk / záznam)
                  </div>
                )}

                {/* Selection toggle badge */}
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition ${isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'bg-slate-900/80 text-transparent border border-white/20'
                    }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>

                {/* Date badge */}
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] text-slate-300 font-mono">
                  {formatLocalizedDate(observation.observed_on, locale)}
                </div>
              </div>

              {/* Text body */}
              <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-1" title={commonName}>
                    {commonName}
                  </h3>
                  {latinName && (
                    <p className="text-[11px] italic text-slate-400 line-clamp-1">
                      {latinName}
                    </p>
                  )}
                  {observation.place_guess && (
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={observation.place_guess}>
                      {observation.place_guess}
                    </p>
                  )}
                </div>

                {/* Metrics bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-amber-400 font-medium text-[11px]" title="Počet oblíbení">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {observation.faves_count || 0}
                    </span>
                    <span className="flex items-center gap-0.5 text-cyan-400 font-medium text-[11px]" title="Počet komentářů">
                      <MessageSquare className="w-3 h-3 fill-cyan-400" />
                      {observation.comments_count || 0}
                    </span>
                    <span className="flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]" title={`Počet určení: ${idCount} (${idCount > 2 ? `bonus +${(idCount - 2) * 0.5} b.` : 'základní'})`}>
                      <UserCheck className="w-3 h-3" />
                      {idCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    {score}&nbsp;b.
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Footer Controls (Pevná spodní lišta s tlačítky - vždy viditelná bez rolování) */}
      <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Pořadí animace */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">
              {locale === 'cs' ? 'Pořadí:' : 'Sequence:'}
            </span>
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onSequenceTypeChange('observed')}
                className={`px-2.5 py-1 rounded-lg transition ${sequenceType === 'observed'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                {locale === 'cs' ? 'Datum pozorování' : 'Observation date'}
              </button>
              <button
                type="button"
                onClick={() => onSequenceTypeChange('created')}
                className={`px-2.5 py-1 rounded-lg transition ${sequenceType === 'created'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                {locale === 'cs' ? 'Datum nahrání' : 'Upload date'}
              </button>
            </div>
          </div>

          {/* Filtr zkreslených souřadnic */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition py-0.5">
            <input
              type="checkbox"
              checked={filterObscured}
              onChange={(e) => onFilterObscuredChange(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
            <span>{locale === 'cs' ? 'Skrýt zkreslené' : 'Hide obscured'}</span>
          </label>

          {/* Filtr osamocených vzdálených bodů */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition py-0.5">
            <input
              type="checkbox"
              checked={filterIsolated}
              onChange={(e) => onFilterIsolatedChange(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
            <span>{locale === 'cs' ? 'Vynechat osamocené (> 150 km)' : 'Skip isolated (> 150 km)'}</span>
          </label>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backBtn}
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs shadow-md transition cursor-pointer"
          >
            {locale === 'cs' ? 'Pokračovat' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
