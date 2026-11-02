import React, { useState } from 'react';
import { X, Film, Image as ImageIcon, Download, Loader2, Check } from 'lucide-react';
import { VideoAspectRatio, ExportProgress } from '../types/export';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (format: 'mp4' | 'gif', aspectRatio: VideoAspectRatio) => Promise<void>;
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
  const [format, setFormat] = useState<'mp4' | 'gif'>('mp4');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const isExporting = exportProgress !== null && exportProgress.phase !== 'completed' && exportProgress.phase !== 'error';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
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
          Zvolte formát a poměr stran pro export do videa nebo animovaného obrázku.
        </p>

        {/* Format selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Formát souboru
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormat('mp4')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                format === 'mp4'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold">MP4 video</div>
                <div className="text-[10px] text-slate-400">Se zvukem a 30 FPS</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormat('gif')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                format === 'gif'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold">Animovaný GIF</div>
                <div className="text-[10px] text-slate-400">Bez zvuku, 15 FPS</div>
              </div>
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

        {/* Completed download action */}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={downloadFilename}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Check className="w-4 h-4" />
            Stáhnout ({downloadFilename})
          </a>
        ) : (
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onStartExport(format, aspectRatio)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Probíhá export…' : 'Spustit export'}
          </button>
        )}
      </div>
    </div>
  );
};

