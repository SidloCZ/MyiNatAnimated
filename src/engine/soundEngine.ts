import { SoundCue } from '../types/timeline';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;
  private volume = 0.8;

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

  /**
   * Zvuk pro Highlight: Teplá marimba (Warm Marimba).
   * Měkké, přirozené dřevěné tóny F4 (349 Hz) a C5 (523 Hz) s jemným low-pass filtrem.
   */
  static renderWarmMarimba(
    ctx: BaseAudioContext,
    destination: AudioNode,
    startTime: number,
    gainAmount = 0.45
  ) {
    const notes = [
      { f: 349.23, delay: 0.0 },
      { f: 523.25, delay: 0.07 },
    ];
    for (const n of notes) {
      const t = startTime + n.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.22, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  /**
   * Zvuk pro pozorování s oblíbením (Favorite): Harfové arpeggio (Harp Arpeggio).
   * Čtyři rychlé, jemné struny D5, F#5, A5 a D6, slavnostní a elegantní doznění.
   */
  static renderHarpArpeggio(
    ctx: BaseAudioContext,
    destination: AudioNode,
    startTime: number,
    gainAmount = 0.25
  ) {
    const gliss = [
      { f: 587.33, delay: 0.0 },
      { f: 739.99, delay: 0.035 },
      { f: 880.0, delay: 0.07 },
      { f: 1174.66, delay: 0.105 },
    ];
    for (const g of gliss) {
      const t = startTime + g.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(g.f, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.14, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  /**
   * Statický syntetizér pro vykreslení jednotlivých zvukových podnětů (cue).
   * Funguje identicky v živém AudioContext i v OfflineAudioContext pro export.
   */
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
      // Oblíbené pozorování (Favorite) -> Harfové arpeggio
      SoundEngine.renderHarpArpeggio(ctx, destination, startTime, gainAmount);
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
      // Výběrové pozorování (Highlight) -> Teplá marimba
      SoundEngine.renderWarmMarimba(ctx, destination, startTime, gainAmount);
    } else if (cue.type === 'whoosh') {
      // Filmový aerodynamický přelet kamery (Whoosh)
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

  /**
   * Vykreslení kompletního audio bufferu offline pro export do MP4.
   */
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
