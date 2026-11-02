import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Maximize2,
  Minimize2,
  ArrowLeft,
} from 'lucide-react';
import { TimelineData } from '../types/timeline';
import { PreloadedSprites } from '../engine/spriteAtlas';
import { interpolateCamera } from '../engine/cameraDirector';
import { renderDopamineFrame } from '../engine/dopamineCanvas';
import { globalSoundEngine } from '../engine/soundEngine';
import { ExportDialog } from './ExportDialog';
import { VideoAspectRatio, ExportProgress, ExportConfig } from '../types/export';
import { exportToMp4 } from '../engine/videoExporter';
import { exportToGif } from '../engine/gifExporter';

interface PlayerProps {
  timeline: TimelineData;
  sprites: PreloadedSprites;
  username: string;
  onBack: () => void;
}

const CARTO_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export const Player: React.FC<PlayerProps> = ({
  timeline,
  sprites,
  username,
  onBack,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Export modal state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');

  const animFrameIdRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number | null>(null);
  const lastPlayedCueIndexRef = useRef<number>(-1);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialKeyframe = timeline.cameraKeyframes[0] || {
      center: [15.47, 49.81],
      zoom: 7,
      pitch: 20,
      bearing: 0,
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_DARK_STYLE,
      center: initialKeyframe.center,
      zoom: initialKeyframe.zoom,
      pitch: initialKeyframe.pitch,
      bearing: initialKeyframe.bearing,
      interactive: false, // Directed camera controls movement
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [timeline]);

  // Sync canvas size with map container
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = mapContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Main animation render loop
  useEffect(() => {
    const loop = (wallNow: number) => {
      if (lastWallTimeRef.current === null) {
        lastWallTimeRef.current = wallNow;
      }
      const dt = (wallNow - lastWallTimeRef.current) / 1000;
      lastWallTimeRef.current = wallNow;

      if (isPlayingRef.current) {
        let nextTime = currentTimeRef.current + dt * speedRef.current;
        if (nextTime >= timeline.duration) {
          nextTime = timeline.duration;
          setIsPlaying(false);
        }
        currentTimeRef.current = nextTime;
        setCurrentTime(nextTime);

        // Sound cues trigger
        const cues = timeline.soundCues;
        while (
          lastPlayedCueIndexRef.current + 1 < cues.length &&
          cues[lastPlayedCueIndexRef.current + 1].t <= nextTime
        ) {
          lastPlayedCueIndexRef.current++;
          globalSoundEngine.playCue(cues[lastPlayedCueIndexRef.current]);
        }
      }

      // Render frame
      const map = mapRef.current;
      const canvas = canvasRef.current;
      if (map && canvas) {
        const cam = interpolateCamera(timeline.cameraKeyframes, currentTimeRef.current);
        map.jumpTo({
          center: cam.center,
          zoom: cam.zoom,
          pitch: cam.pitch,
          bearing: cam.bearing,
        });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.scale(dpr, dpr);

          const w = canvas.width / dpr;
          const h = canvas.height / dpr;

          renderDopamineFrame({
            ctx,
            width: w,
            height: h,
            timeline,
            t: currentTimeRef.current,
            project: (coord) => {
              const p = map.project(coord);
              return { x: p.x, y: p.y };
            },
            sprites,
          });

          ctx.restore();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [timeline, sprites]);

  // Playback controls
  const handleTogglePlay = () => {
    if (currentTime >= timeline.duration) {
      handleSeek(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newTime: number) => {
    currentTimeRef.current = newTime;
    setCurrentTime(newTime);

    // Reset sound cue index to new time
    let idx = -1;
    while (idx + 1 < timeline.soundCues.length && timeline.soundCues[idx + 1].t <= newTime) {
      idx++;
    }
    lastPlayedCueIndexRef.current = idx;
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    globalSoundEngine.setMuted(nextMuted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Offline frame renderer for deterministic video and GIF export
  const renderFrameForExport = async (timeSec: number, targetCanvas: HTMLCanvasElement) => {
    const map = mapRef.current;
    if (!map) return;

    const cam = interpolateCamera(timeline.cameraKeyframes, timeSec);
    map.jumpTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
    });

    // Wait for map tiles to settle
    await new Promise<void>((resolve) => {
      map.once('render', () => resolve());
      // Fallback timeout in case render already triggered
      setTimeout(resolve, 50);
    });

    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return;

    // 1. Draw MapLibre canvas
    const mapCanvas = map.getCanvas();
    targetCtx.drawImage(mapCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

    // 2. Overlay Dopamine effects
    renderDopamineFrame({
      ctx: targetCtx,
      width: targetCanvas.width,
      height: targetCanvas.height,
      timeline,
      t: timeSec,
      project: (coord) => {
        const p = map.project(coord);
        // Scale to targetCanvas
        const scaleX = targetCanvas.width / mapCanvas.clientWidth;
        const scaleY = targetCanvas.height / mapCanvas.clientHeight;
        return { x: p.x * scaleX, y: p.y * scaleY };
      },
      sprites,
    });
  };

  const handleStartExport = async (format: 'mp4' | 'gif', aspectRatio: VideoAspectRatio) => {
    setIsPlaying(false);
    setDownloadUrl(null);

    let width = 1920;
    let height = 1080;
    if (aspectRatio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    }

    if (format === 'gif') {
      width = Math.round(width / 2.5);
      height = Math.round(height / 2.5);
    }

    const config: ExportConfig = {
      format,
      aspectRatio,
      fps: format === 'mp4' ? 30 : 15,
      width,
      height,
      quality: 0.9,
    };

    try {
      let blob: Blob;
      if (format === 'mp4') {
        blob = await exportToMp4(
          timeline.duration,
          timeline.soundCues,
          config,
          renderFrameForExport,
          setExportProgress
        );
      } else {
        blob = await exportToGif(
          timeline.duration,
          renderFrameForExport,
          setExportProgress,
          15,
          width,
          height
        );
      }

      const url = URL.createObjectURL(blob);
      const filename = `myinat_${username}_${aspectRatio.replace(':', 'x')}.${format}`;
      setDownloadUrl(url);
      setDownloadFilename(filename);

      setExportProgress({
        currentFrame: 100,
        totalFrames: 100,
        percentage: 100,
        phase: 'completed',
      });
    } catch (err: unknown) {
      console.error('Chyba exportu:', err);
      setExportProgress({
        currentFrame: 0,
        totalFrames: 0,
        percentage: 0,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Neznámá chyba při exportu',
      });
    }
  };

  // Keyboard shortcut for space play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isExportOpen) {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="relative w-full h-[85vh] sm:h-[88vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col select-none">
      {/* Map and Canvas Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Top Header Overlay Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Zpět
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs text-slate-300 font-medium">
              <span className="text-slate-500">Uživatel:</span>{' '}
              <span className="text-white font-semibold">{username}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs">
              <div className="text-slate-400">
                Pozorování:{' '}
                <span className="text-emerald-400 font-semibold font-mono">
                  {timeline.stats.totalObservations}
                </span>
              </div>
              <div className="text-slate-400">
                Druhy:{' '}
                <span className="text-cyan-400 font-semibold font-mono">
                  {timeline.stats.totalSpecies}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportovat
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Player Controls */}
      <div className="p-4 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-md flex flex-col gap-3">
        {/* Scrubber timeline bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 w-10 text-right">
            {currentTime.toFixed(1)}s
          </span>
          <div className="relative flex-1 group py-1">
            <input
              type="range"
              min={0}
              max={timeline.duration}
              step={0.05}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 group-hover:h-2 transition-all outline-none"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 w-10">
            {timeline.duration.toFixed(1)}s
          </span>
        </div>

        {/* Buttons and toggles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition shadow-md shadow-emerald-500/20 cursor-pointer"
              title={isPlaying ? 'Pozastavit (Mezerník)' : 'Přehrát (Mezerník)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(0)}
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition"
              title="Restartovat od začátku"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Playback speed selector */}
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono text-slate-400">
              {[0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-1 rounded-lg transition ${
                    playbackSpeed === s
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                      : 'hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Zapnout zvuk' : 'Ztlumit zvuk'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              title="Celá obrazovka"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Export modal dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onStartExport={handleStartExport}
        exportProgress={exportProgress}
        downloadUrl={downloadUrl}
        downloadFilename={downloadFilename}
      />
    </div>
  );
};

