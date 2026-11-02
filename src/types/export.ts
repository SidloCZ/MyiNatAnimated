export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export interface ExportConfig {
  format: 'mp4' | 'gif';
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

