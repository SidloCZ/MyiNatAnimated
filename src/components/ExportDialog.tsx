import React, { useState } from 'react';
import { X, Film, Image as ImageIcon, Sparkles, Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { VideoAspectRatio, ExportProgress, ExportFormat } from '../types/export';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (format: ExportFormat, aspectRatio: VideoAspectRatio) => Promise<void>;
  exportProgress: ExportProgress | null;
  downloadUrl: string | null;
  downloadFilename: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onStartExport,
  exportProgress,
  downloadUrl,
  downloadFilename,
}) => {
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const isExporting = exportProgress !== null && exportProgress.phase !== 'completed' && exportProgress.phase !== 'error';
  const hasError = exportProgress !== null && exportProgress.phase === 'error';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">
          Exportovat animaci
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Zvolte formát a&nbsp;poměr stran pro export do videa nebo animovaného obrázku.
        </p>

        {/* Format selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Formát souboru
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormat('mp4')}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition ${
                format === 'mp4'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">MP4 video</span>
              </div>
              <div className="text-[10px] text-slate-400">Se zvukem, 30&nbsp;FPS</div>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormat('apng')}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition ${
                format === 'apng'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">APNG</span>
              </div>
              <div className="text-[10px] text-slate-400">Plné barvy, 15&nbsp;FPS</div>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormat('gif')}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition ${
                format === 'gif'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-white">GIF</span>
              </div>
              <div className="text-[10px] text-slate-400">256 barev, 15&nbsp;FPS</div>
            </button>
          </div>
        </div>

        {/* Aspect ratio selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Poměr stran
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setAspectRatio('16:9')}
              className={`p-2.5 rounded-xl border text-center transition ${
                aspectRatio === '16:9'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-semibold">16:9</div>
              <div className="text-[10px] text-slate-500">Na šířku</div>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setAspectRatio('9:16')}
              className={`p-2.5 rounded-xl border text-center transition ${
                aspectRatio === '9:16'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-semibold">9:16</div>
              <div className="text-[10px] text-slate-500">Na výšku</div>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setAspectRatio('1:1')}
              className={`p-2.5 rounded-xl border text-center transition ${
                aspectRatio === '1:1'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-semibold">1:1</div>
              <div className="text-[10px] text-slate-500">Čtverec</div>
            </button>
          </div>
        </div>

        {/* Progress bar during rendering */}
        {isExporting && exportProgress && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                Vykreslování: snímek {exportProgress.currentFrame}&nbsp;/ {exportProgress.totalFrames}
              </span>
              <span className="font-mono text-emerald-400">{exportProgress.percentage}&nbsp;%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${exportProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error alert box */}
        {hasError && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-200">Export se nezdařil</div>
              <div className="mt-0.5 text-rose-300/90 text-[11px]">
                {exportProgress.errorMessage || 'Došlo k&nbsp;neočekávané chybě při vykreslování souboru.'}
              </div>
            </div>
          </div>
        )}

        {/* Completed download action */}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={downloadFilename}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Check className="w-4 h-4" />
            Stáhnout ({downloadFilename})
          </a>
        ) : (
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onStartExport(format, aspectRatio)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Probíhá export…' : 'Spustit export'}
          </button>
        )}
      </div>
    </div>
  );
};
