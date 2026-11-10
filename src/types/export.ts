export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type ExportFormat = 'mp4' | 'gif' | 'apng';

export type MapStyleKey = 'dark' | 'liberty' | 'positron' | 'bright' | 'osm';

export interface ExportConfig {
  format: ExportFormat;
  aspectRatio: VideoAspectRatio;
  fps: number;
  width: number;
  height: number;
  quality: number; // 0-1
  speed?: number;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  phase: 'rendering' | 'encoding' | 'muxing' | 'completed' | 'error';
  errorMessage?: string;
}
