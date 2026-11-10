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
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window;

  if (hasWebCodecs) {
    try {
      return await exportWithWebCodecs(durationSeconds, soundCues, config, renderFrame, onProgress);
    } catch (err) {
      console.warn('WebCodecs failed, falling back to MediaRecorder:', err);
      return await exportWithMediaRecorder(durationSeconds, soundCues, config, renderFrame, onProgress);
    }
  } else {
    return await exportWithMediaRecorder(durationSeconds, soundCues, config, renderFrame, onProgress);
  }
}

async function findSupportedVideoCodec(width: number, height: number, fps: number): Promise<string> {
  // Profiles: Level 4.2 handles up to 1080p60 smoothly; Level 4.0 handles 1080p30
  const candidateCodecs = [
    'avc1.4d002a', // Main Profile, Level 4.2
    'avc1.64002a', // High Profile, Level 4.2
    'avc1.420028', // Baseline Profile, Level 4.0
    'avc1.42002a', // Baseline Profile, Level 4.2
    'avc1.42001f', // Baseline Profile, Level 3.1 (only works up to 720p)
  ];

  if (typeof VideoEncoder !== 'undefined' && typeof VideoEncoder.isConfigSupported === 'function') {
    for (const codec of candidateCodecs) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: 5_000_000,
          framerate: fps,
        });
        if (support.supported) {
          return codec;
        }
      } catch {
        // Try next codec
      }
    }
  }

  return 'avc1.4d002a';
}

async function checkAudioEncoderSupport(sampleRate: number, numChannels: number): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioEncoder.isConfigSupported !== 'function') {
    return false;
  }
  try {
    const support = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      numberOfChannels: numChannels,
      sampleRate,
      bitrate: 128000,
    });
    return !!support.supported;
  } catch {
    return false;
  }
}

async function exportWithWebCodecs(
  durationSeconds: number,
  soundCues: SoundCue[],
  config: ExportConfig,
  renderFrame: VideoRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  // H.264 requires even dimensions
  const width = Math.floor(config.width / 2) * 2;
  const height = Math.floor(config.height / 2) * 2;
  const fps = config.fps || 30;
  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));

  const videoCodec = await findSupportedVideoCodec(width, height, fps);

  // Check if AudioEncoder with AAC is supported
  const canEncodeAudio = await checkAudioEncoderSupport(44100, 2);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    ...(canEncodeAudio
      ? {
          audio: {
            codec: 'aac' as const,
            numberOfChannels: 2,
            sampleRate: 44100,
          },
        }
      : {}),
    fastStart: 'in-memory',
  });

  // 1. Audio Encoding (if supported and cues exist)
  if (canEncodeAudio && soundCues.length > 0) {
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 5,
      phase: 'encoding',
    });

    try {
      const audioBuffer = await SoundEngine.renderOfflineAudio(soundCues, durationSeconds);
      const sampleRate = audioBuffer.sampleRate;
      const numChannels = audioBuffer.numberOfChannels;

      let audioEncoderError: Error | null = null;
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
          audioEncoderError = e instanceof Error ? e : new Error(String(e));
          console.warn('AudioEncoder warning:', e);
        },
      });

      audioEncoder.configure({
        codec: 'mp4a.40.2', // AAC-LC
        numberOfChannels: numChannels,
        sampleRate,
        bitrate: 128000,
      });

      const samplesPerChunk = 1024;
      const totalSamples = audioBuffer.length;
      for (let offset = 0; offset < totalSamples; offset += samplesPerChunk) {
        if (audioEncoderError) break;

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
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }

      if (!audioEncoderError) {
        await audioEncoder.flush();
      }
      audioEncoder.close();
    } catch (audioErr) {
      console.warn('The audio track could not be encoded, continuing without sound:', audioErr);
    }
  }

  // 2. Video Encoding
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  let videoError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      videoError = e instanceof Error ? e : new Error(String(e));
      console.error('Chyba VideoEncoder:', e);
    },
  });

  videoEncoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate: 6_000_000,
    framerate: fps,
  });

  for (let f = 0; f < totalFrames; f++) {
    if (videoError) throw videoError;

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

    // Yield to event loop to keep UI and progress bar responsive
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (videoError) throw videoError;

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
  const width = Math.floor(config.width / 2) * 2;
  const height = Math.floor(config.height / 2) * 2;
  const fps = config.fps || 30;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const stream = canvas.captureStream(fps);

  // Audio setup via Web Audio
  let audioCtx: AudioContext | null = null;
  if (soundCues.length > 0 && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      for (const track of dest.stream.getAudioTracks()) {
        stream.addTrack(track);
      }
      const startTime = audioCtx.currentTime + 0.05;
      for (const cue of soundCues) {
        if (cue.t >= 0 && cue.t < durationSeconds) {
          SoundEngine.renderCueIntoContext(audioCtx, dest, cue, startTime + cue.t);
        }
      }
    } catch {
      // Audio optional on failure
    }
  }

  let mimeType = 'video/webm';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));
  recorder.start();

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
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }

  return new Blob(chunks, { type: mimeType });
}
