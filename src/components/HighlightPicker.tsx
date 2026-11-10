import React, { useState, useMemo } from 'react';
import {
  Star,
  MessageSquare,
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
  recommendedCount?: number;
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
  recommendedCount = 8,
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
  locale = 'en',
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
    <div className="w-full max-w-6xl h-[calc(100dvh-5rem)] max-h-[860px] flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden">
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
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
            <span>{t.selectedCount}:</span>
            <span className="text-white font-bold">{selectedIds.size}</span>
            {recommendedCount > 0 && (
              <span className="text-emerald-300/80 font-normal ml-0.5">
                ({locale === 'cs' ? `doporučeno: ${recommendedCount}` : `target: ${recommendedCount}`})
              </span>
            )}
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
              const topTarget = sortedHighlights.slice(0, Math.max(1, recommendedCount)).map(h => h.observation.id);
              const hasAllRecommended = topTarget.every(id => selectedIds.has(id));
              const idsToSelect = hasAllRecommended
                ? sortedHighlights.map(h => h.observation.id)
                : topTarget;

              idsToSelect.forEach(id => {
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

      {/* 3. Cards Grid (Scrollovatelná oblast se zachováním plné výšky karet) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 auto-rows-max content-start">
        {sortedHighlights.map(({ observation, score }) => {
          const isSelected = selectedIds.has(observation.id);
          const photoUrl = getObservationPhotoUrl(observation, 'medium');
          const scientificName = observation.taxon?.name || (locale === 'cs' ? 'Neznámý taxon' : 'Unknown taxon');
          const rank = observation.taxon?.rank;
          const isItalicRank = !rank || ['species', 'genus', 'subspecies', 'variety', 'form'].includes(rank);

          return (
            <div
              key={observation.id}
              onClick={() => onToggleHighlight(observation.id)}
              className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer transition select-none shrink-0 bg-slate-950 ${isSelected
                ? 'border-emerald-500 bg-slate-900/90 shadow-md ring-1 ring-emerald-500/50'
                : 'border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
            >
              {/* Photo banner with fixed height to guarantee full visibility */}
              <div className="relative w-full h-44 sm:h-48 md:h-52 bg-slate-900 overflow-hidden shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={scientificName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 bg-slate-950 p-2 text-center">
                    {locale === 'cs' ? 'Bez fotografie' : 'No photo'}
                  </div>
                )}

                {/* Selection toggle badge */}
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition shadow ${isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900/80 text-transparent border border-white/20'
                    }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>

                {/* Date badge in bottom-left */}
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur-sm text-[10px] text-slate-300 tabular-nums shadow border border-slate-800/60">
                  {formatLocalizedDate(observation.observed_on, locale)}
                </div>

                {/* Dynamic sort metric badge in bottom right corner of photo */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-sm text-[11px] font-semibold flex items-center gap-1 shadow border border-slate-800">
                  {sortMode === 'faves' && (
                    <span className="text-amber-400 flex items-center gap-1" title={locale === 'cs' ? 'Počet oblíbení' : 'Favorites'}>
                      <Star className="w-3 h-3 fill-amber-400" />
                      {observation.faves_count || 0}
                    </span>
                  )}
                  {sortMode === 'comments' && (
                    <span className="text-cyan-400 flex items-center gap-1" title={locale === 'cs' ? 'Počet komentářů' : 'Comments'}>
                      <MessageSquare className="w-3 h-3 fill-cyan-400" />
                      {observation.comments_count || 0}
                    </span>
                  )}
                  {sortMode === 'score' && (
                    <span className="text-emerald-400 flex items-center gap-1" title={locale === 'cs' ? 'Celkové skóre' : 'Total score'}>
                      <Sparkles className="w-3 h-3" />
                      {score}&nbsp;{t.scorePointsShort}
                    </span>
                  )}
                  {sortMode === 'date' && (
                    <span className="text-slate-300 flex items-center gap-1" title={locale === 'cs' ? 'Datum pozorování' : 'Observation date'}>
                      <Calendar className="w-3 h-3" />
                      {formatLocalizedDate(observation.observed_on, locale)}
                    </span>
                  )}
                </div>
              </div>

              {/* Malá lišta pod fotkou s vědeckým názvem taxonu a hypertextovým odkazem na pozorování */}
              <div className="h-8 px-2.5 bg-slate-950/95 border-t border-slate-800/80 flex items-center shrink-0">
                <a
                  href={`https://www.inaturalist.org/observations/${observation.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`truncate text-xs text-slate-300 hover:text-emerald-400 hover:underline transition font-medium ${isItalicRank ? 'italic' : ''
                    }`}
                  title={`${scientificName} (iNaturalist #${observation.id})`}
                >
                  {scientificName}
                </a>
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
          <button
            type="button"
            role="checkbox"
            aria-checked={filterObscured}
            onClick={() => onFilterObscuredChange(!filterObscured)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium select-none transition cursor-pointer ${filterObscured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${filterObscured
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                  : 'bg-slate-900 border-slate-600 text-transparent'
                }`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>{locale === 'cs' ? 'Skrýt zkreslené' : 'Hide obscured'}</span>
          </button>

          {/* Filtr osamocených vzdálených bodů */}
          <button
            type="button"
            role="checkbox"
            aria-checked={filterIsolated}
            onClick={() => onFilterIsolatedChange(!filterIsolated)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium select-none transition cursor-pointer ${filterIsolated
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${filterIsolated
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                  : 'bg-slate-900 border-slate-600 text-transparent'
                }`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>{locale === 'cs' ? 'Vynechat osamocené (> 150 km)' : 'Skip isolated (> 150 km)'}</span>
          </button>
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
