import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Map as MapIcon,
  Calendar,
} from 'lucide-react';
import { TimelineData } from '../types/timeline';
import { PreloadedSprites } from '../engine/spriteAtlas';
import { interpolateCamera } from '../engine/cameraDirector';
import { warmupMapTiles, waitForMapIdle, waitForStyleLoad } from '../engine/tilePreloader';
import { renderDopamineFrame } from '../engine/dopamineCanvas';
import { getPlaybackStatsAtTime } from '../engine/timelineBuilder';
import { globalSoundEngine } from '../engine/soundEngine';
import { ExportDialog } from './ExportDialog';
import { VideoAspectRatio, ExportProgress, ExportConfig, ExportFormat } from '../types/export';
import { exportToMp4 } from '../engine/videoExporter';
import { exportToGif } from '../engine/gifExporter';
import { exportToApng } from '../engine/apngExporter';
import { Language, translations, formatLocalizedDate } from '../i18n/translations';
import { logToTerminal } from '../services/logger';

interface PlayerProps {
  timeline: TimelineData;
  sprites: PreloadedSprites;
  username: string;
  onBack: () => void;
  locale?: Language;
}

export type MapStyleKey = 'dark' | 'liberty' | 'positron' | 'bright' | 'osm';

export const MAP_STYLES: Record<MapStyleKey, { label: string; style: string | maplibregl.StyleSpecification }> = {
  dark: {
    label: 'Tmavá (OpenFreeMap)',
    style: 'https://tiles.openfreemap.org/styles/dark',
  },
  liberty: {
    label: 'Barevná (OpenFreeMap)',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
  positron: {
    label: 'Světlá (OpenFreeMap)',
    style: 'https://tiles.openfreemap.org/styles/positron',
  },
  bright: {
    label: 'Jasná (OpenFreeMap)',
    style: 'https://tiles.openfreemap.org/styles/bright',
  },
  osm: {
    label: 'OpenStreetMap (OpenFreeMap)',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
};

export const Player: React.FC<PlayerProps> = ({
  timeline,
  sprites,
  username,
  onBack,
  locale = 'cs',
}) => {
  const t = translations[locale];
  const currentExportAspectRatioRef = useRef<VideoAspectRatio>('16:9');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [bufferProgress, setBufferProgress] = useState(0);
  const cancelBufferingRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>('dark');

  // Dynamic live playback stats (date, live observation count, live species count)
  const currentStats = useMemo(() => {
    return getPlaybackStatsAtTime(timeline.events, currentTime);
  }, [timeline.events, currentTime]);

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

  const isMapReadyRef = useRef(false);
  isMapReadyRef.current = isMapReady;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;

  const handleSkipBuffering = () => {
    cancelBufferingRef.current = true;
    setIsBuffering(false);
    setIsMapReady(true);
    setIsPlaying(false);
    const map = mapRef.current;
    if (map) {
      const initialKeyframe = timeline.cameraKeyframes[0];
      if (initialKeyframe) {
        map.jumpTo({
          center: initialKeyframe.center,
          zoom: initialKeyframe.zoom,
          pitch: initialKeyframe.pitch,
          bearing: initialKeyframe.bearing,
        });
      }
    }
  };

  const styleChangeSeqRef = useRef(0);

  const handleStyleChange = async (key: MapStyleKey) => {
    setMapStyleKey(key);
    const map = mapRef.current;
    if (!map) return;

    const seq = ++styleChangeSeqRef.current;

    // Pause playback on style switch
    setIsPlaying(false);

    // Cancel any existing buffering and activate buffering state with progress
    cancelBufferingRef.current = false;
    setIsMapReady(false);
    setIsBuffering(true);
    setBufferProgress(0);

    // Apply the selected style
    const selected = MAP_STYLES[key] || MAP_STYLES.dark;
    map.setStyle(selected.style);

    // Wait for the new style JSON and sources to load
    await waitForStyleLoad(map, 4000);
    if (seq !== styleChangeSeqRef.current) return;

    // Warm up map tiles along the entire flight path for the newly selected style
    await warmupMapTiles(map, timeline.cameraKeyframes, {
      onProgress: (p) => {
        if (seq === styleChangeSeqRef.current) {
          setBufferProgress(Math.round(p * 100));
        }
      },
      shouldCancel: () => cancelBufferingRef.current || seq !== styleChangeSeqRef.current,
      samples: Math.min(14, Math.max(8, timeline.cameraKeyframes.length)),
      timeoutPerStepMs: 700,
    });

    if (seq !== styleChangeSeqRef.current) return;

    // Restore camera to current time position
    const currentKf = interpolateCamera(timeline.cameraKeyframes, currentTimeRef.current || 0);
    map.jumpTo({
      center: currentKf.center,
      zoom: currentKf.zoom,
      pitch: currentKf.pitch,
      bearing: currentKf.bearing,
    });

    await waitForMapIdle(map, 600);
    if (seq !== styleChangeSeqRef.current) return;

    setIsBuffering(false);
    setIsMapReady(true);
    setIsPlaying(false);
  };

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
      style: MAP_STYLES.dark.style,
      center: initialKeyframe.center,
      zoom: initialKeyframe.zoom,
      pitch: initialKeyframe.pitch,
      bearing: initialKeyframe.bearing,
      interactive: false, // Directed camera controls movement
      attributionControl: false,
      maxTileCacheSize: 3000,
      renderWorldCopies: false,
      preserveDrawingBuffer: true,
    });

    cancelBufferingRef.current = false;
    setIsBuffering(true);
    setBufferProgress(0);
    setIsMapReady(false);
    setIsPlaying(false);

    map.once('load', async () => {
      // Warm up map tiles along the flight trajectory directly on this map instance
      await warmupMapTiles(map, timeline.cameraKeyframes, {
        onProgress: (p) => setBufferProgress(Math.round(p * 100)),
        shouldCancel: () => cancelBufferingRef.current,
        samples: 10,
        timeoutPerStepMs: 600,
      });

      if (!cancelBufferingRef.current) {
        setIsBuffering(false);
        setIsMapReady(true);
        setIsPlaying(false);
      }
    });

    mapRef.current = map;

    return () => {
      cancelBufferingRef.current = true;
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

      if (isPlayingRef.current && isMapReadyRef.current) {
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

  // Offline frame renderer for deterministic video, GIF and APNG export
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

    // Ensure MapLibre updates sources and paints WebGL buffer synchronously
    const anyMap = map as unknown as { _render?: (now: number) => void };
    if (typeof anyMap._render === 'function') {
      anyMap._render(performance.now());
    }

    // Wait for map tiles to settle completely before grabbing frame
    if (!map.areTilesLoaded()) {
      await waitForMapIdle(map, 600);
      if (typeof anyMap._render === 'function') {
        anyMap._render(performance.now());
      }
    }

    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return;

    const mapCanvas = map.getCanvas();
    const mapW = mapCanvas.width;
    const mapH = mapCanvas.height;
    const targetW = targetCanvas.width;
    const targetH = targetCanvas.height;

    // Fill background color matching map style so no black borders appear
    targetCtx.fillStyle = mapStyleKey === 'dark' ? '#0f172a' : '#f8fafc';
    targetCtx.fillRect(0, 0, targetW, targetH);

    // Calculate aspect ratio crop (cover) to prevent squishing on 9:16 and 1:1
    const targetRatio = targetW / targetH;
    const mapRatio = mapW / mapH;

    let sx = 0;
    let sy = 0;
    let sw = mapW;
    let sh = mapH;

    if (mapRatio > targetRatio) {
      // Map is wider than target: crop sides
      sw = mapH * targetRatio;
      sx = (mapW - sw) / 2;
    } else {
      // Map is taller than target: crop top and bottom
      sh = mapW / targetRatio;
      sy = (mapH - sh) / 2;
    }

    // 1. Draw cropped map onto target canvas with true isotropic aspect ratio
    targetCtx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);

    // 2. Overlay Dopamine effects with isotropic projection and UI scaling
    const scaleFactor = targetW / sw;
    renderDopamineFrame({
      ctx: targetCtx,
      width: targetW,
      height: targetH,
      timeline,
      t: timeSec,
      project: (coord) => {
        const p = map.project(coord);
        // Map CSS client coordinate to mapCanvas backing buffer pixels
        const mx = p.x * (mapW / mapCanvas.clientWidth);
        const my = p.y * (mapH / mapCanvas.clientHeight);
        // Offset by crop origin and scale isotropically to target canvas
        return {
          x: (mx - sx) * scaleFactor,
          y: (my - sy) * scaleFactor,
        };
      },
      sprites,
      isExport: true,
      aspectRatio: currentExportAspectRatioRef.current,
      locale,
    });
  };

  const handleResetExport = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);
    setExportProgress(null);
  };

  const handleStartExport = async (format: ExportFormat, aspectRatio: VideoAspectRatio) => {
    setIsPlaying(false);
    currentExportAspectRatioRef.current = aspectRatio;
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);

    logToTerminal('info', `Spuštěn export: ${format.toUpperCase()} (${aspectRatio})`);

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
    } else if (format === 'apng') {
      width = Math.round(width / 2);
      height = Math.round(height / 2);
    }

    // Enforce even dimensions required for video and encoders
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

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
      } else if (format === 'gif') {
        blob = await exportToGif(
          timeline.duration,
          renderFrameForExport,
          setExportProgress,
          15,
          width,
          height
        );
      } else {
        blob = await exportToApng(
          timeline.duration,
          renderFrameForExport,
          setExportProgress,
          15,
          width,
          height
        );
      }

      let extension = format === 'apng' ? 'png' : format;
      if (format === 'mp4' && blob.type.includes('webm')) {
        extension = 'webm';
      }

      const url = URL.createObjectURL(blob);
      const filename = `myinat_${username}_${aspectRatio.replace(':', 'x')}.${extension}`;
      setDownloadUrl(url);
      setDownloadFilename(filename);

      setExportProgress({
        currentFrame: 100,
        totalFrames: 100,
        percentage: 100,
        phase: 'completed',
      });
      logToTerminal('info', `Export dokončen: ${filename} (velikost: ${(blob.size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err: unknown) {
      console.error('Chyba exportu:', err);
      logToTerminal('error', `Chyba při exportu: ${err instanceof Error ? err.message : String(err)}`, err);
      setExportProgress({
        currentFrame: 0,
        totalFrames: 0,
        percentage: 0,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : (locale === 'cs' ? 'Neznámá chyba při exportu' : 'Unknown export error'),
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

        {/* Map Tile Preload / Warmup Overlay */}
        {isBuffering && (
          <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
            <div className="max-w-sm w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <MapIcon className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  {t.bufferingTitle}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.bufferingDesc}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full space-y-1.5">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                    style={{ width: `${bufferProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                  <span>{t.cameraTrackProgress}</span>
                  <span className="text-emerald-400 font-semibold">{bufferProgress}&nbsp;%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSkipBuffering}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {t.skipBufferingBtn}
              </button>
            </div>
          </div>
        )}

        {/* Big Center Play Button (zobrazí se po načtení mapových podkladů při pozastaveném přehrávání) */}
        {!isBuffering && isMapReady && !isPlaying && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-emerald-300/40 ring-8 ring-emerald-500/20 group"
              title={t.playTooltip}
            >
              <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-slate-950 ml-1.5 transition-transform group-hover:scale-110" />
            </button>
          </div>
        )}

        {/* Top Header Overlay Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30 gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md text-xs font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.backBtn}
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs font-medium hidden sm:block shadow">
              <span className="text-slate-300">{t.userPrefix}</span>{' '}
              <span className="text-white font-bold">{username}</span>
            </div>
          </div>

          {/* Center Date Indicator */}
          {currentStats.dateStr && (
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono">
                {formatLocalizedDate(currentStats.dateStr, locale)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="relative flex items-center">
              <MapIcon className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={mapStyleKey}
                onChange={(e) => handleStyleChange(e.target.value as MapStyleKey)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 border border-slate-800 backdrop-blur-md text-xs font-semibold outline-none cursor-pointer appearance-none transition"
                title={t.mapStyleTitle}
              >
                <option value="dark">{t.styleDark}</option>
                <option value="liberty">{t.styleLiberty}</option>
                <option value="positron">{t.stylePositron}</option>
                <option value="bright">{t.styleBright}</option>
              </select>
            </div>

            {/* Dynamic observation and species counters */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs shadow">
              <div className="text-slate-300 flex items-center gap-1.5">
                <span className="hidden sm:inline font-medium text-slate-300">{t.observationsLabel}</span>
                <span className="text-emerald-400 font-bold font-mono text-xs sm:text-sm">
                  {currentStats.obsCount}
                </span>
                <span className="text-slate-300 font-mono text-xs sm:text-sm font-semibold">
                  /&nbsp;{timeline.stats.totalObservations}
                </span>
              </div>
              <div className="text-slate-300 flex items-center gap-1.5">
                <span className="hidden sm:inline font-medium text-slate-300">{t.speciesLabel}</span>
                <span className="text-cyan-400 font-bold font-mono text-xs sm:text-sm">
                  {currentStats.speciesCount}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.exportBtn}</span>
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
          <span className="text-xs font-mono text-slate-400 w-10">
            {timeline.duration.toFixed(1)}s
          </span>
        </div>

        {/* Buttons and toggles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition shadow-md cursor-pointer"
              title={isPlaying ? t.pauseTooltip : t.playTooltip}
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
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition cursor-pointer"
              title={t.resetTooltip}
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
                  className={`px-2 py-1 rounded-lg transition ${playbackSpeed === s
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
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              title={isMuted ? t.unmuteTooltip : t.muteTooltip}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              title={t.fullscreenTooltip}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Export modal dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => {
          setIsExportOpen(false);
          handleResetExport();
        }}
        onStartExport={handleStartExport}
        onResetExport={handleResetExport}
        exportProgress={exportProgress}
        downloadUrl={downloadUrl}
        downloadFilename={downloadFilename}
        locale={locale}
      />
    </div>
  );
};

