import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { ExportConfig, ExportProgress } from '../types/export';
import { SoundCue } from '../types/timeline';
import { SoundEngine } from './soundEngine';

export interface VideoRenderFrameCallback {
  (timeSec: number, targetCanvas: HTMLCanvasElement): Promise<void>;
}

export async function exportToMp4(
  durationSeconds: number,
  soundCues: SoundCue[],
  config: ExportConfig,
  renderFrame: VideoRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'AudioEncoder' in window;

  if (hasWebCodecs) {
    return exportWithWebCodecs(durationSeconds, soundCues, config, renderFrame, onProgress);
  } else {
    return exportWithMediaRecorder(durationSeconds, soundCues, config, renderFrame, onProgress);
  }
}

async function exportWithWebCodecs(
  durationSeconds: number,
  soundCues: SoundCue[],
  config: ExportConfig,
  renderFrame: VideoRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const { width, height, fps = 30 } = config;
  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    audio: {
      codec: 'aac',
      numberOfChannels: 2,
      sampleRate: 44100,
    },
    fastStart: 'in-memory',
  });

  // 1. Audio Encoding
  onProgress?.({
    currentFrame: 0,
    totalFrames,
    percentage: 5,
    phase: 'encoding',
  });

  const audioBuffer = await SoundEngine.renderOfflineAudio(soundCues, durationSeconds);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error('Chyba AudioEncoder:', e),
  });

  audioEncoder.configure({
    codec: 'mp4a.40.2', // AAC-LC
    numberOfChannels: numChannels,
    sampleRate,
    bitrate: 128000,
  });

  // Feed audio data in chunks of 1024 samples
  const samplesPerChunk = 1024;
  const totalSamples = audioBuffer.length;
  for (let offset = 0; offset < totalSamples; offset += samplesPerChunk) {
    const chunkLength = Math.min(samplesPerChunk, totalSamples - offset);
    const planarData = new Float32Array(chunkLength * numChannels);

    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      planarData.set(channelData.subarray(offset, offset + chunkLength), ch * chunkLength);
    }

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: chunkLength,
      numberOfChannels: numChannels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000), // in microseconds
      data: planarData,
    });

    audioEncoder.encode(audioData);
    audioData.close();
  }

  await audioEncoder.flush();
  audioEncoder.close();

  // 2. Video Encoding
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('Chyba VideoEncoder:', e),
  });

  videoEncoder.configure({
    codec: 'avc1.42001f', // H.264 Baseline
    width,
    height,
    bitrate: 5_000_000,
    framerate: fps,
  });

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await renderFrame(t, canvas);

    const timestampUs = Math.round((f / fps) * 1_000_000);
    const videoFrame = new VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: Math.round((1 / fps) * 1_000_000),
    });

    const isKeyframe = f % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(5 + ((f + 1) / totalFrames) * 90),
        phase: 'rendering',
      });
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();

  // 3. Finalize MP4
  onProgress?.({
    currentFrame: totalFrames,
    totalFrames,
    percentage: 100,
    phase: 'muxing',
  });

  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

// Fallback for browsers without WebCodecs
async function exportWithMediaRecorder(
  durationSeconds: number,
  soundCues: SoundCue[],
  config: ExportConfig,
  renderFrame: VideoRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const { width, height, fps = 30 } = config;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const stream = canvas.captureStream(fps);

  // Audio setup via Web Audio
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  for (const track of dest.stream.getAudioTracks()) {
    stream.addTrack(track);
  }

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : 'video/webm;codecs=vp9,opus';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));
  recorder.start();

  // Schedule audio cues in real audio context
  const startTime = audioCtx.currentTime + 0.1;
  for (const cue of soundCues) {
    if (cue.t >= 0 && cue.t < durationSeconds) {
      SoundEngine.renderCueIntoContext(audioCtx, dest, cue, startTime + cue.t);
    }
  }

  // Draw frames in real-time pace
  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await renderFrame(t, canvas);
    await new Promise((r) => setTimeout(r, 1000 / fps));

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        phase: 'rendering',
      });
    }
  }

  recorder.stop();
  await new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  return new Blob(chunks, { type: mimeType });
}

