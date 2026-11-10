import React, { useState, useRef, useCallback } from 'react';

export interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onScrubStateChange?: (isScrubbing: boolean) => void;
  onTogglePlay?: () => void;
  disabled?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentTime,
  duration,
  onSeek,
  onScrubStateChange,
  onTogglePlay,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    if (e.button !== 0) return; // Only primary button

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    if (onScrubStateChange) {
      onScrubStateChange(true);
    }

    const targetTime = getTimeFromClientX(e.clientX);
    onSeek(targetTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (containerRef.current && duration > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverRatio(ratio);
      }
    }

    if (!isDragging || disabled || duration <= 0) return;
    const targetTime = getTimeFromClientX(e.clientX);
    onSeek(targetTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release capture errors
    }

    if (onScrubStateChange) {
      onScrubStateChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;

    const step = e.shiftKey ? Math.max(1, duration * 0.1) : Math.max(0.2, duration * 0.02);

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        onSeek(Math.max(0, currentTime - step));
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + step));
        break;
      case 'Home':
        e.preventDefault();
        onSeek(0);
        break;
      case 'End':
        e.preventDefault();
        onSeek(duration);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (onTogglePlay) onTogglePlay();
        break;
    }
  };

  const tooltipPercent = hoverRatio !== null ? Math.max(4, Math.min(96, hoverRatio * 100)) : null;
  const tooltipTime = hoverRatio !== null ? hoverRatio * duration : null;

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Časová osa přehrávání"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-valuetext={`${currentTime.toFixed(1)} s`}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHoverRatio(null)}
      onKeyDown={handleKeyDown}
      className={`relative w-full py-2 flex items-center cursor-pointer select-none group touch-none outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 rounded-lg ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Floating hover tooltip */}
      {tooltipPercent !== null && tooltipTime !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 border border-slate-700/80 text-[11px] text-emerald-400 font-medium tabular-nums shadow-xl pointer-events-none backdrop-blur-sm z-30 transition-opacity"
          style={{ left: `${tooltipPercent}%` }}
        >
          {tooltipTime.toFixed(1)}s
        </div>
      )}

      {/* Track Background */}
      <div className="w-full h-1.5 group-hover:h-2 transition-all duration-150 bg-slate-800/90 rounded-full relative overflow-hidden">
        {/* Progress Fill */}
        <div
          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 rounded-full transition-[width] duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center"
        style={{ left: `${progressPercent}%` }}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-sm transition-transform duration-100 ${
            isDragging ? 'scale-125 bg-emerald-300' : 'scale-100 group-hover:scale-125'
          }`}
        />
      </div>
    </div>
  );
};
