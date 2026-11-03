export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type ExportFormat = 'mp4' | 'gif' | 'apng';

export interface ExportConfig {
  format: ExportFormat;
  aspectRatio: VideoAspectRatio;
  fps: number;
  width: number;
  height: number;
  quality: number; // 0-1
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  phase: 'rendering' | 'encoding' | 'muxing' | 'completed' | 'error';
  errorMessage?: string;
}
