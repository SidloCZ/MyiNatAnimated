import React from 'react';
import { Loader2 } from 'lucide-react';

interface PrepareProgressProps {
  statusText: string;
  progressPercent: number;
}

export const PrepareProgress: React.FC<PrepareProgressProps> = ({
  statusText,
  progressPercent,
}) => {
  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2">
        Příprava animace
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        {statusText || 'Předpočítávání dráhy kamery, zvuků a vektorových efektů…'}
      </p>

      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/50"
          style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 font-mono">
        <span>Průběh</span>
        <span>{Math.round(progressPercent)}&nbsp;%</span>
      </div>
    </div>
  );
};

