import React from 'react';
import { Gauge } from 'lucide-react';

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;
export type SpeedPreset = (typeof SPEED_PRESETS)[number];

export function getNearestSpeedIndex(speed: number): number {
  let bestIdx = 3; // 1x default
  let minDiff = Infinity;
  for (let i = 0; i < SPEED_PRESETS.length; i++) {
    const diff = Math.abs(SPEED_PRESETS[i] - speed);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export interface SpeedSliderProps {
  value: number;
  onChange: (speed: number) => void;
  disabled?: boolean;
  compact?: boolean;
  resetTooltip?: string;
}

export const SpeedSlider: React.FC<SpeedSliderProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
  resetTooltip,
}) => {
  const currentIndex = getNearestSpeedIndex(value);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 select-none ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="range"
          min={0}
          max={SPEED_PRESETS.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(e) => onChange(SPEED_PRESETS[Number(e.target.value)])}
          aria-label="Playback speed"
          className="w-16 sm:w-24 h-5 bg-transparent appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-slate-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-slate-800 [&::-moz-range-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 hover:[&::-webkit-slider-thumb]:bg-emerald-300 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-400 hover:[&::-moz-range-thumb]:bg-emerald-300 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:cursor-pointer"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(1.0)}
          title={resetTooltip || 'Reset to 1x'}
          className="tabular-nums font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition min-w-[2.2rem] text-center cursor-pointer"
        >
          {value}x
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="relative flex items-center">
        <input
          type="range"
          min={0}
          max={SPEED_PRESETS.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(e) => onChange(SPEED_PRESETS[Number(e.target.value)])}
          aria-label="Playback speed"
          className="w-full h-6 bg-transparent appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded-lg [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-950 [&::-webkit-slider-runnable-track]:border [&::-webkit-slider-runnable-track]:border-slate-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-slate-950 [&::-moz-range-track]:border [&::-moz-range-track]:border-slate-800 [&::-moz-range-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 hover:[&::-webkit-slider-thumb]:bg-emerald-300 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-400 hover:[&::-moz-range-thumb]:bg-emerald-300 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between items-center px-0.5">
        {SPEED_PRESETS.map((preset, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={`text-[10px] sm:text-xs tabular-nums transition cursor-pointer px-1 py-0.5 rounded ${
                isSelected
                  ? 'text-emerald-400 font-bold bg-emerald-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset}x
            </button>
          );
        })}
      </div>
    </div>
  );
};

