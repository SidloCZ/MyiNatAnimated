/**
 * Nepoužívané / archivní procedurální syntetizéry zvukových efektů pro MyiNatAnimated.
 * 
 * Tento soubor slouží jako archiv pro vyřazené zvukové profily, které byly vytvořeny
 * v rámci ladění zvukového designu pro animace pozorování.
 * 
 * Aktivní zvuky v jádře aplikace (src/engine/soundEngine.ts):
 * - Pozorování s oblíbením (Favorites): Harfové arpeggio (Harp Arpeggio)
 * - Výběr / Highlight: Teplá marimba (Warm Marimba)
 * - Běžné pozorování: Pentatonické bubliny (Pop)
 * - Přelet kamery: Filmový aerodynamický přelet (Whoosh)
 */

export interface ArchivedSoundProfile {
  id: string;
  nameCs: string;
  nameEn: string;
  descCs: string;
  descEn: string;
}

export const ARCHIVED_SOUND_PROFILES: ArchivedSoundProfile[] = [
  {
    id: 'crystal-drop',
    nameCs: 'Křišťálová kapka',
    nameEn: 'Crystal Drop',
    descCs: 'Jemná kapka vody s tichým dozvukem (880 Hz -> 680 Hz).',
    descEn: 'Subtle water droplet with clean resonance (880 Hz -> 680 Hz).',
  },
  {
    id: 'celeste-chord',
    nameCs: 'Nebeská čelesta',
    nameEn: 'Celeste Chord',
    descCs: 'Hladký dur akord s dlouhým poklidným dozněním (C5, E5, G5).',
    descEn: 'Smooth major chord with gentle sustain (C5, E5, G5).',
  },
  {
    id: 'bamboo-strike',
    nameCs: 'Bambusový zvonek',
    nameEn: 'Bamboo Chime',
    descCs: 'Organický dutý bambus s lehkou ozvěnou (440 Hz + 740 Hz, bandpass).',
    descEn: 'Hollow organic bamboo with overtone decay (440 Hz + 740 Hz, bandpass).',
  },
  {
    id: 'gentle-bell',
    nameCs: 'Tichý chrámový zvon',
    nameEn: 'Temple Bell',
    descCs: 'Hlubší klidný tón tibetské mísy, neruší (293 Hz + 587 Hz).',
    descEn: 'Deeper mellow singing bowl, calm and quiet (293 Hz + 587 Hz).',
  },
  {
    id: 'synth-sparkle',
    nameCs: 'Ambientní třpyt',
    nameEn: 'Ambient Sparkle',
    descCs: 'Měkký analogový třpyt v tiché dynamice (523 Hz, 784 Hz, 1046 Hz).',
    descEn: 'Soft warm analog shimmer at low volume (523 Hz, 784 Hz, 1046 Hz).',
  },
  {
    id: 'nature-flute',
    nameCs: 'Dřevěná píšťala',
    nameEn: 'Wooden Flute',
    descCs: 'Přírodní dvojtón evokující lesní procházku (587 Hz -> 659 Hz).',
    descEn: 'Natural dual tone reminiscent of a forest walk (587 Hz -> 659 Hz).',
  },
  {
    id: 'pluck-kalimba',
    nameCs: 'Africká kalimba',
    nameEn: 'Kalimba Pluck',
    descCs: 'Dvojitý palcový tón s příjemným teplem (440 Hz + 880 Hz).',
    descEn: 'Dual thumb-piano pluck with earthy warmth (440 Hz + 880 Hz).',
  },
  {
    id: 'subtle-pop',
    nameCs: 'Decentní dopaminový ťuk',
    nameEn: 'Subtle Pop',
    descCs: 'Krátký, čistý a tlumený zvuk bez pískání (480 Hz -> 240 Hz).',
    descEn: 'Short, tactile, unobtrusive feedback (480 Hz -> 240 Hz).',
  },
];

// 1. Křišťálová kapka
export function renderCrystalDrop(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
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
}

// 2. Nebeská čelesta
export function renderCelesteChord(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
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
}

// 3. Bambusový zvonek
export function renderBambooStrike(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
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
  filter.Q.setValueAtTime(4.0, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainAmount * 0.18, startTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + 0.25);
  osc2.stop(startTime + 0.25);
}

// 4. Tichý chrámový zvon
export function renderGentleBell(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
  const osc = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(293.66, startTime); // D4
  oscHarmonic.type = 'sine';
  oscHarmonic.frequency.setValueAtTime(587.33, startTime); // D5

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainAmount * 0.16, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

  osc.connect(filter);
  oscHarmonic.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  oscHarmonic.start(startTime);
  osc.stop(startTime + 0.65);
  oscHarmonic.stop(startTime + 0.65);
}

// 5. Ambientní třpyt
export function renderSynthSparkle(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
  const sparkle = [
    { f: 523.25, delay: 0.0 },
    { f: 783.99, delay: 0.025 },
    { f: 1046.5, delay: 0.05 },
  ];
  for (const s of sparkle) {
    const t = startTime + s.delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(s.f, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(gainAmount * 0.1, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(t);
    osc.stop(t + 0.38);
  }
}

// 6. Dřevěná píšťala
export function renderNatureFlute(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, startTime); // D5
  osc.frequency.linearRampToValueAtTime(659.25, startTime + 0.08); // E5

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainAmount * 0.15, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(startTime + 0.38);
}

// 7. Africká kalimba
export function renderPluckKalimba(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
  const freqs = [440.0, 880.0];
  for (const f of freqs) {
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
}

// 8. Decentní dopaminový ťuk
export function renderSubtlePop(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  gainAmount = 0.2
) {
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

