import { SoundCue } from '../types/timeline';

export type HighlightSoundProfile =
  | 'warm-marimba'
  | 'crystal-drop'
  | 'celeste-chord'
  | 'harp-gliss'
  | 'bamboo-strike'
  | 'gentle-bell'
  | 'synth-sparkle'
  | 'nature-flute'
  | 'pluck-kalimba'
  | 'subtle-pop';

export interface HighlightSoundInfo {
  id: HighlightSoundProfile;
  nameCs: string;
  nameEn: string;
  descCs: string;
  descEn: string;
}

export const HIGHLIGHT_SOUND_PROFILES: HighlightSoundInfo[] = [
  {
    id: 'warm-marimba',
    nameCs: 'Teplá marimba',
    nameEn: 'Warm Marimba',
    descCs: 'Hluboké dřevěné tóny, měkké a přirozené.',
    descEn: 'Deep wooden resonance, soft and organic.',
  },
  {
    id: 'crystal-drop',
    nameCs: 'Křišťálová kapka',
    nameEn: 'Crystal Drop',
    descCs: 'Jemná kapka vody s tichým dozvukem.',
    descEn: 'Subtle water droplet with clean resonance.',
  },
  {
    id: 'celeste-chord',
    nameCs: 'Nebeská čelesta',
    nameEn: 'Celeste Chord',
    descCs: 'Hladký dur akord s dlouhým poklidným dozněním.',
    descEn: 'Smooth major chord with gentle sustain.',
  },
  {
    id: 'harp-gliss',
    nameCs: 'Harfové arpeggio',
    nameEn: 'Harp Arpeggio',
    descCs: 'Čtyři rychlé jemné struny, slavnostní a elegantní.',
    descEn: 'Four rapid delicate plucks, elegant feel.',
  },
  {
    id: 'bamboo-strike',
    nameCs: 'Bambusový zvonek',
    nameEn: 'Bamboo Chime',
    descCs: 'Organický dutý bambus s lehkou ozvěnou.',
    descEn: 'Hollow organic bamboo with overtone decay.',
  },
  {
    id: 'gentle-bell',
    nameCs: 'Tichý chrámový zvon',
    nameEn: 'Temple Bell',
    descCs: 'Hlubší klidný tón tibetské mísy, neruší.',
    descEn: 'Deeper mellow singing bowl, calm and quiet.',
  },
  {
    id: 'synth-sparkle',
    nameCs: 'Ambientní třpyt',
    nameEn: 'Ambient Sparkle',
    descCs: 'Měkký analogový třpyt v tiché dynamice.',
    descEn: 'Soft warm analog shimmer at low volume.',
  },
  {
    id: 'nature-flute',
    nameCs: 'Dřevěná píšťala',
    nameEn: 'Wooden Flute',
    descCs: 'Přírodní dvojtón evokující lesní procházku.',
    descEn: 'Natural dual tone reminiscent of a forest walk.',
  },
  {
    id: 'pluck-kalimba',
    nameCs: 'Africká kalimba',
    nameEn: 'Kalimba Pluck',
    descCs: 'Dvojitý palcový tón s příjemným teplem.',
    descEn: 'Dual thumb-piano pluck with earthy warmth.',
  },
  {
    id: 'subtle-pop',
    nameCs: 'Decentní dopaminový ťuk',
    nameEn: 'Subtle Pop',
    descCs: 'Krátký, čistý a tlumený zvuk bez pískání.',
    descEn: 'Short, tactile, unobtrusive feedback.',
  },
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;
  private volume = 0.8;
  private highlightProfile: HighlightSoundProfile = 'warm-marimba';

  constructor() {
    try {
      const saved = localStorage.getItem('myinat_highlight_sound') as HighlightSoundProfile | null;
      if (saved && HIGHLIGHT_SOUND_PROFILES.some(p => p.id === saved)) {
        this.highlightProfile = saved;
      }
    } catch (_) {
      // Ignore local storage error
    }
  }

  getHighlightProfile(): HighlightSoundProfile {
    return this.highlightProfile;
  }

  setHighlightProfile(profile: HighlightSoundProfile) {
    this.highlightProfile = profile;
    try {
      localStorage.setItem('myinat_highlight_sound', profile);
    } catch (_) {
      // Ignore
    }
  }

  previewHighlightSound(profile?: HighlightSoundProfile) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const chosen = profile || this.highlightProfile;
    const t = this.ctx.currentTime + 0.02;
    SoundEngine.renderHighlightSound(this.ctx, this.masterGain, t, 0.45, chosen);
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
    SoundEngine.renderCueIntoContext(this.ctx, this.masterGain, cue, t, this.highlightProfile);
  }

  // 10 distinct synthesizers for highlight moments
  static renderHighlightSound(
    ctx: BaseAudioContext,
    destination: AudioNode,
    startTime: number,
    gainAmount: number,
    profile: HighlightSoundProfile = 'warm-marimba'
  ) {
    if (profile === 'warm-marimba') {
      // 1. Teplá marimba: F4 (349Hz) + C5 (523Hz)
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
    } else if (profile === 'crystal-drop') {
      // 2. Křišťálová kapka: 880Hz -> 680Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(680, startTime + 0.05);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.16, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    } else if (profile === 'celeste-chord') {
      // 3. Nebeská čelesta: C5, E5, G5
      const chord = [
        { f: 523.25, delay: 0.0 },
        { f: 659.25, delay: 0.03 },
        { f: 783.99, delay: 0.06 },
      ];
      for (const c of chord) {
        const t = startTime + c.delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.f, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(gainAmount * 0.11, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(t);
        osc.stop(t + 0.55);
      }
    } else if (profile === 'harp-gliss') {
      // 4. Harfové arpeggio: D5, F#5, A5, D6
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
        gain.gain.linearRampToValueAtTime(gainAmount * 0.12, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        osc.start(t);
        osc.stop(t + 0.3);
      }
    } else if (profile === 'bamboo-strike') {
      // 5. Bambusový zvonek: dutý rezonující dřevěný tón
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, startTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(740, startTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, startTime);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.20, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.25);
      osc2.stop(startTime + 0.25);
    } else if (profile === 'gentle-bell') {
      // 6. Tichý chrámový zvon: G4 (392Hz) + jemný 3. harmonický
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(392.0, startTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1176.0, startTime);

      gain1.gain.setValueAtTime(0.0001, startTime);
      gain1.gain.linearRampToValueAtTime(gainAmount * 0.16, startTime + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.75);

      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.linearRampToValueAtTime(gainAmount * 0.04, startTime + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(destination);
      gain2.connect(destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.8);
      osc2.stop(startTime + 0.45);
    } else if (profile === 'synth-sparkle') {
      // 7. Ambientní třpyt: B5, E6, G#6
      const spark = [
        { f: 987.77, delay: 0.0 },
        { f: 1318.51, delay: 0.045 },
        { f: 1661.22, delay: 0.09 },
      ];
      for (const s of spark) {
        const t = startTime + s.delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(s.f, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(gainAmount * 0.08, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(t);
        osc.stop(t + 0.32);
      }
    } else if (profile === 'nature-flute') {
      // 8. Dřevěná píšťala: E5 -> A5 glide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, startTime);
      osc.frequency.exponentialRampToValueAtTime(880.0, startTime + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.36);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    } else if (profile === 'pluck-kalimba') {
      // 9. Africká kalimba: D4 (293.7Hz) + A4 (440Hz)
      const kalimbaNotes = [293.66, 440.0];
      for (const f of kalimbaNotes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(gainAmount * 0.15, startTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      }
    } else {
      // 10. Decentní dopaminový ťuk: 480Hz -> 240Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, startTime);
      osc.frequency.exponentialRampToValueAtTime(240, startTime + 0.045);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmount * 0.18, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    }
  }

  // Pure static synthesizer method that works both in live AudioContext and OfflineAudioContext!
  static renderCueIntoContext(
    ctx: BaseAudioContext,
    destination: AudioNode,
    cue: SoundCue,
    startTime: number,
    highlightProfile?: HighlightSoundProfile
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
      const profile = highlightProfile || globalSoundEngine.getHighlightProfile();
      SoundEngine.renderHighlightSound(ctx, destination, startTime, gainAmount, profile);
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
    const activeProfile = globalSoundEngine.getHighlightProfile();

    for (const cue of cues) {
      if (cue.t >= 0 && cue.t < durationSeconds) {
        SoundEngine.renderCueIntoContext(offlineCtx, offlineCtx.destination, cue, cue.t, activeProfile);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const globalSoundEngine = new SoundEngine();

