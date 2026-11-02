import { SoundCue } from '../types/timeline';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;
  private volume = 0.8;

  constructor() {
    // Lazily initialize on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  playCue(cue: SoundCue) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    SoundEngine.renderCueIntoContext(this.ctx, this.masterGain, cue, t);
  }

  // Pure static synthesizer method that works both in live AudioContext and OfflineAudioContext!
  static renderCueIntoContext(
    ctx: BaseAudioContext,
    destination: AudioNode,
    cue: SoundCue,
    startTime: number
  ) {
    const gainAmount = cue.gain ?? 0.3;

    if (cue.type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = cue.pitchFrequency || 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.25, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, startTime + 0.12);

      gain.gain.setValueAtTime(gainAmount, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.13);
    } else if (cue.type === 'star') {
      // Star chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const freq = cue.pitchFrequency || 880;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.22);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.26);
    } else if (cue.type === 'bubble') {
      // Soft comment bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, startTime);
      osc.frequency.exponentialRampToValueAtTime(560, startTime + 0.09);

      gain.gain.setValueAtTime(gainAmount, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.11);
    } else if (cue.type === 'highlight') {
      // Majestic 4-voice chord (Cmaj9: C4, G4, B4, D5)
      const freqs = [261.63, 392.0, 493.88, 587.33];
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(gainAmount * 0.35, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.6);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        osc.stop(startTime + 1.65);
      }
    } else if (cue.type === 'whoosh') {
      // Camera whoosh via filtered noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.6);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3.0;
      filter.frequency.setValueAtTime(250, startTime);
      filter.frequency.exponentialRampToValueAtTime(1200, startTime + 0.3);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + 0.6);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount, startTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(startTime);
      noise.stop(startTime + 0.65);
    }
  }

  // Render full audio buffer offline for video export
  static async renderOfflineAudio(cues: SoundCue[], durationSeconds: number): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const totalFrames = Math.max(1, Math.ceil(sampleRate * durationSeconds));
    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    for (const cue of cues) {
      if (cue.t >= 0 && cue.t < durationSeconds) {
        SoundEngine.renderCueIntoContext(offlineCtx, offlineCtx.destination, cue, cue.t);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const globalSoundEngine = new SoundEngine();

