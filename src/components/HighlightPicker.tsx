import React from 'react';
import { Star, MessageSquare, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { InatObservation, HighlightItem } from '../types/inat';

interface HighlightPickerProps {
  observations: InatObservation[];
  suggestedHighlights: HighlightItem[];
  selectedIds: Set<number>;
  sequenceType: 'observed' | 'created';
  onSequenceTypeChange: (type: 'observed' | 'created') => void;
  filterObscured: boolean;
  onFilterObscuredChange: (filter: boolean) => void;
  obscuredCount: number;
  onToggleHighlight: (id: number) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const HighlightPicker: React.FC<HighlightPickerProps> = ({
  observations,
  suggestedHighlights,
  selectedIds,
  sequenceType,
  onSequenceTypeChange,
  filterObscured,
  onFilterObscuredChange,
  obscuredCount,
  onToggleHighlight,
  onProceed,
  onBack,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Výběr highlightů
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Vyberte pozorování, u&nbsp;kterých se kamera zpomalí a&nbsp;zobrazí se detailní vizitka.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            Vybráno: {selectedIds.size}
          </span>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400">
            Celkem: {observations.length}&nbsp;pozorování
          </span>
          {filterObscured && obscuredCount > 0 && (
            <span className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {obscuredCount}&nbsp;zkreslených skryto
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 max-h-[58vh] overflow-y-auto pr-1">
        {suggestedHighlights.map(({ observation, score }) => {
          const isSelected = selectedIds.has(observation.id);
          const photoUrl = observation.photos?.[0]?.medium_url || observation.photos?.[0]?.url;
          const commonName = observation.taxon?.preferred_common_name || observation.taxon?.name || 'Pozorování';
          const latinName = observation.taxon?.name;

          return (
            <div
              key={observation.id}
              onClick={() => onToggleHighlight(observation.id)}
              className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer transition select-none ${
                isSelected
                  ? 'border-emerald-500/80 bg-slate-800/80 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Image banner */}
              <div className="relative w-full h-36 bg-slate-900 overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={commonName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                    Bez fotografie
                  </div>
                )}

                {/* Selection toggle badge */}
                <div
                  className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-md flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900/80 text-transparent border border-white/20'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Date badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] text-slate-300 font-mono">
                  {observation.observed_on}
                </div>
              </div>

              {/* Text body */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white line-clamp-1">
                    {commonName}
                  </h3>
                  {latinName && (
                    <p className="text-xs italic text-slate-400 line-clamp-1">
                      {latinName}
                    </p>
                  )}
                  {observation.place_guess && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                      {observation.place_guess}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {observation.faves_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-cyan-400 font-medium text-[11px]">
                      <MessageSquare className="w-3 h-3 fill-cyan-400" />
                      {observation.comments_count || 0}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Skóre: {score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-4 self-start sm:self-auto">
          {/* Pořadí animace */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Pořadí:</span>
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onSequenceTypeChange('observed')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  sequenceType === 'observed'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Datum pozorování
              </button>
              <button
                type="button"
                onClick={() => onSequenceTypeChange('created')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  sequenceType === 'created'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Datum nahrání
              </button>
            </div>
          </div>

          {/* Filtr zkreslených souřadnic */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition py-1">
            <input
              type="checkbox"
              checked={filterObscured}
              onChange={(e) => onFilterObscuredChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
            <span>Skrýt zkreslené / soukromé body</span>
          </label>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            Pokračovat
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

