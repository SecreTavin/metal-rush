import Phaser from 'phaser';
import { loadSettings, onSettingsChange, Settings } from '../run/settings';

/*
 * Som do jogo, todo sintetizado em tempo real (Web Audio), sem arquivos:
 * efeitos curtos (tiros, explosões, pulos...) e trilhas synthwave/chiptune por missão,
 * tocadas por um sequenciador simples (baixo, arpejo, acordes, melodia e bateria).
 */

export type SfxName =
  | 'shoot' | 'shootHeavy' | 'hit' | 'enemyShot' | 'claw' | 'swing' | 'whip' | 'crack' | 'throw'
  | 'explode' | 'explodeSmall' | 'emp' | 'jump' | 'dash' | 'hurt' | 'block' | 'shieldBreak'
  | 'coin' | 'heal' | 'pickup' | 'power' | 'select' | 'confirm' | 'back' | 'alarm' | 'roar'
  | 'rumble' | 'thunder' | 'pulse' | 'win' | 'lose' | 'teleport' | 'splat';

export type TrackName = 'menu' | 'city' | 'factory' | 'contagion' | 'core' | 'boss' | 'lab';

/** Intervalo mínimo entre repetições do mesmo efeito (evita "metralhar" o mixer). */
const MIN_GAP: Partial<Record<SfxName, number>> = { shoot: 45, shootHeavy: 40, hit: 35, coin: 40, enemyShot: 60, splat: 80 };

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Track {
  bpm: number;
  /** Acordes (nota MIDI da fundamental + intervalos), um por compasso. */
  chords: [number, number[]][];
  bass: string;
  arp: string;
  kick: string;
  snare: string;
  hat: string;
  /** Melodia: graus do acorde (0-2) ou '.' por passo, repetida a cada 2 compassos. */
  lead?: string;
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  /** Brilho (frequência do filtro do baixo). */
  cutoff: number;
}

const MIN: number[] = [0, 3, 7];
const MAJ: number[] = [0, 4, 7];

const TRACKS: Record<TrackName, Track> = {
  menu: {
    bpm: 92, chords: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ]],
    bass: 'x...x...x...x.x.', arp: 'x.x.x.x.x.x.x.x.', kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.',
    lead: '0.....2...1.....0.......2.1.0...', bassWave: 'sawtooth', leadWave: 'triangle', cutoff: 600,
  },
  lab: {
    bpm: 84, chords: [[48, MAJ], [45, MIN], [41, MAJ], [43, MAJ]],
    bass: 'x.......x.......', arp: 'x..x..x.x..x..x.', kick: 'x.......x.......', snare: '................', hat: '....x.......x...',
    bassWave: 'triangle', leadWave: 'triangle', cutoff: 500,
  },
  city: {
    bpm: 118, chords: [[38, MIN], [46, MAJ], [41, MAJ], [48, MAJ]],
    bass: 'x.xxx.xxx.xxx.xx', arp: 'xxxxxxxxxxxxxxxx', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    lead: '0...1...2.1.0...2...1...0.......', bassWave: 'sawtooth', leadWave: 'square', cutoff: 900,
  },
  factory: {
    bpm: 128, chords: [[40, MIN], [48, MAJ], [38, MAJ], [40, MIN]],
    bass: 'x.x.x.x.x.x.x.x.', arp: 'x..x..x..x..x.x.', kick: 'x...x...x...x...', snare: '....x..x....x...', hat: 'xxxxxxxxxxxxxxxx',
    lead: '0.0.2...1.1.0...................', bassWave: 'square', leadWave: 'sawtooth', cutoff: 700,
  },
  contagion: {
    bpm: 108, chords: [[37, MIN], [38, MAJ], [37, MIN], [35, MAJ]],
    bass: 'x..x..x.x..x..x.', arp: 'x.x.xx.x.x.xx.x.', kick: 'x.....x...x.....', snare: '....x.......x..x', hat: '..x.x...x.x...x.',
    lead: '2.......1.0.....2...1...0.1.....', bassWave: 'sawtooth', leadWave: 'triangle', cutoff: 520,
  },
  core: {
    bpm: 136, chords: [[42, MIN], [38, MAJ], [40, MAJ], [37, MAJ]],
    bass: 'xxx.xxx.xxx.xx.x', arp: 'xxxxxxxxxxxxxxxx', kick: 'x...x...x...x...', snare: '....x.......x...', hat: '.x.x.x.x.x.x.x.x',
    lead: '0.1.2...2.1.0...1...2...0.......', bassWave: 'sawtooth', leadWave: 'square', cutoff: 1100,
  },
  boss: {
    bpm: 150, chords: [[45, MIN], [45, MIN], [41, MAJ], [43, MAJ]],
    bass: 'xxxxxxxxxxxxxxxx', arp: 'x.xxx.xxx.xxx.xx', kick: 'x..xx...x..xx...', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx',
    lead: '0.0.1.2.2.1.0...2.2.1.0.1.......', bassWave: 'square', leadWave: 'sawtooth', cutoff: 1300,
  },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private last = new Map<SfxName, number>();

  private track: Track | null = null;
  private trackName: TrackName | null = null;
  private musicGain: GainNode | null = null;
  private step = 0;
  private nextTime = 0;

  /** Liga o áudio usando o contexto do Phaser (chamar uma vez, no Boot). */
  init(game: Phaser.Game) {
    if (this.ctx) return;
    const mgr = game.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = mgr.context as AudioContext | undefined;
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    // compressor suave: segura picos quando muita coisa explode junto
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes(loadSettings());
    onSettingsChange((s) => this.applyVolumes(s));
    // navegadores só liberam o som depois de um clique/tecla
    const resume = () => ctx.state !== 'running' && ctx.resume();
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    window.setInterval(() => this.schedule(), 25);
  }

  applyVolumes(s: Settings) {
    if (!this.ctx) return;
    const v = (n: number) => Math.pow(Phaser.Math.Clamp(n, 0, 10) / 10, 1.6);
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(v(s.volume.master), t, 0.02);
    this.musicBus.gain.setTargetAtTime(v(s.volume.music) * 0.55, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(v(s.volume.sfx), t, 0.02);
  }

  // ------------------------------------------------------------ blocos de síntese

  private env(g: GainNode, t: number, vol: number, attack: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, attack = 0.005) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, vol, attack, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hiss(out: AudioNode, t: number, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.004, dur);
    src.connect(bq).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ efeitos

  play(name: SfxName, pitch = 1) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    const gap = MIN_GAP[name] ?? 20;
    if (now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);
    const t = ctx.currentTime + 0.005;
    const o = this.sfxBus;
    const p = pitch * Phaser.Math.FloatBetween(0.96, 1.04);
    switch (name) {
      case 'shoot':
        this.tone(o, t, 'square', 1400 * p, 420 * p, 0.08, 0.12);
        this.tone(o, t, 'sine', 700 * p, 200 * p, 0.06, 0.08);
        break;
      case 'shootHeavy':
        this.tone(o, t, 'sawtooth', 900 * p, 260 * p, 0.06, 0.1);
        this.hiss(o, t, 0.04, 0.08, 'highpass', 3000);
        break;
      case 'hit':
        this.hiss(o, t, 0.05, 0.12, 'bandpass', 2400 * p, 900, 2);
        this.tone(o, t, 'square', 320 * p, 120, 0.05, 0.06);
        break;
      case 'enemyShot':
        this.tone(o, t, 'sawtooth', 520 * p, 160, 0.14, 0.08);
        this.tone(o, t, 'sine', 260 * p, 90, 0.14, 0.08);
        break;
      case 'claw':
        this.hiss(o, t, 0.12, 0.16, 'bandpass', 3500, 1200, 3);
        break;
      case 'swing':
        this.hiss(o, t, 0.1, 0.14, 'bandpass', 900, 2600, 1.5);
        this.tone(o, t + 0.03, 'square', 180, 90, 0.07, 0.1);
        break;
      case 'whip':
        this.hiss(o, t, 0.12, 0.1, 'bandpass', 600, 3000, 1);
        break;
      case 'crack':
        this.hiss(o, t, 0.06, 0.3, 'highpass', 2500, 5000);
        this.tone(o, t, 'square', 2000, 800, 0.04, 0.12);
        break;
      case 'throw':
        this.hiss(o, t, 0.14, 0.08, 'bandpass', 1200, 2800, 2);
        this.tone(o, t, 'triangle', 500, 900, 0.1, 0.05);
        break;
      case 'explode':
        this.hiss(o, t, 0.7, 0.45, 'lowpass', 2400, 120);
        this.tone(o, t, 'sine', 120, 35, 0.5, 0.45);
        break;
      case 'explodeSmall':
        this.hiss(o, t, 0.35, 0.28, 'lowpass', 2000 * p, 200);
        this.tone(o, t, 'sine', 160 * p, 50, 0.25, 0.25);
        break;
      case 'emp':
        this.tone(o, t, 'sawtooth', 80, 1600, 0.25, 0.14, 0.01);
        this.tone(o, t + 0.2, 'square', 1600, 60, 0.5, 0.14);
        this.hiss(o, t + 0.2, 0.5, 0.18, 'bandpass', 3000, 300, 2);
        break;
      case 'jump':
        this.tone(o, t, 'square', 220, 520, 0.12, 0.07);
        break;
      case 'dash':
        this.hiss(o, t, 0.18, 0.14, 'bandpass', 800, 4000, 1.5);
        this.tone(o, t, 'sine', 300, 900, 0.12, 0.06);
        break;
      case 'hurt':
        this.tone(o, t, 'square', 600, 90, 0.25, 0.16);
        this.hiss(o, t, 0.2, 0.12, 'bandpass', 1500, 400, 2);
        break;
      case 'block':
        this.tone(o, t, 'square', 1800, 1500, 0.06, 0.1);
        this.tone(o, t, 'triangle', 900, 700, 0.12, 0.12);
        break;
      case 'shieldBreak':
        this.hiss(o, t, 0.4, 0.3, 'highpass', 1500, 6000);
        this.tone(o, t, 'sawtooth', 700, 80, 0.4, 0.12);
        break;
      case 'coin':
        this.tone(o, t, 'square', 1320, 1320, 0.05, 0.05);
        this.tone(o, t + 0.05, 'square', 1760, 1760, 0.08, 0.05);
        break;
      case 'heal':
        [660, 880, 1100, 1320].forEach((f, i) => this.tone(o, t + i * 0.06, 'triangle', f, f, 0.12, 0.1));
        break;
      case 'pickup':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(o, t + i * 0.05, 'square', f, f, 0.08, 0.07));
        break;
      case 'power':
        this.tone(o, t, 'sawtooth', 200, 1200, 0.45, 0.12, 0.02);
        [0, 4, 7, 12].forEach((s, i) => this.tone(o, t + 0.1 + i * 0.07, 'square', midi(72 + s), midi(72 + s), 0.12, 0.06));
        break;
      case 'select':
        this.tone(o, t, 'square', 880, 880, 0.04, 0.05);
        break;
      case 'confirm':
        this.tone(o, t, 'square', 660, 660, 0.05, 0.07);
        this.tone(o, t + 0.06, 'square', 990, 990, 0.1, 0.07);
        break;
      case 'back':
        this.tone(o, t, 'square', 660, 440, 0.1, 0.06);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.tone(o, t + i * 0.36, 'square', 880, 660, 0.3, 0.09);
        }
        break;
      case 'roar':
        this.tone(o, t, 'sawtooth', 90, 45, 1.1, 0.3, 0.08);
        this.tone(o, t, 'square', 140, 60, 1.0, 0.12, 0.08);
        this.hiss(o, t, 1.0, 0.25, 'lowpass', 900, 200);
        break;
      case 'rumble':
        this.hiss(o, t, 0.7, 0.3, 'lowpass', 260, 90);
        this.tone(o, t, 'sine', 55, 40, 0.7, 0.25, 0.1);
        break;
      case 'thunder':
        this.hiss(o, t, 1.6, 0.35, 'lowpass', 1200, 60);
        this.tone(o, t, 'sine', 70, 30, 1.2, 0.25, 0.02);
        break;
      case 'pulse':
        this.tone(o, t, 'sine', 180, 45, 0.8, 0.35, 0.01);
        this.tone(o, t, 'sawtooth', 360, 90, 0.4, 0.06);
        break;
      case 'win':
        [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone(o, t + i * 0.11, 'square', midi(64 + s), midi(64 + s), 0.16, 0.08));
        break;
      case 'lose':
        [7, 5, 3, 0, -5].forEach((s, i) => this.tone(o, t + i * 0.18, 'triangle', midi(57 + s), midi(57 + s) * 0.97, 0.26, 0.1));
        break;
      case 'teleport':
        this.tone(o, t, 'sine', 300, 2400, 0.3, 0.08);
        this.hiss(o, t, 0.3, 0.06, 'highpass', 4000);
        break;
      case 'splat':
        this.hiss(o, t, 0.2, 0.18, 'lowpass', 900, 200);
        this.tone(o, t, 'sine', 200, 60, 0.15, 0.1);
        break;
    }
  }

  // ------------------------------------------------------------ música

  /** Troca a trilha (com fade). null para silêncio. */
  music(name: TrackName | null) {
    const ctx = this.ctx;
    if (!ctx || name === this.trackName) return;
    this.trackName = name;
    const t = ctx.currentTime;
    if (this.musicGain) {
      const old = this.musicGain;
      old.gain.setTargetAtTime(0.0001, t, 0.25);
      window.setTimeout(() => old.disconnect(), 1500);
    }
    this.track = name ? TRACKS[name] : null;
    if (!this.track) {
      this.musicGain = null;
      return;
    }
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.0001, t);
    this.musicGain.gain.setTargetAtTime(1, t + 0.1, 0.4);
    this.musicGain.connect(this.musicBus);
    this.step = 0;
    this.nextTime = t + 0.1;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.musicGain || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    const stepDur = 60 / this.track.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(this.track, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % (16 * this.track.chords.length);
    }
  }

  private playStep(tr: Track, step: number, t: number, d: number) {
    const out = this.musicGain!;
    const s = step % 16;
    const [root, chord] = tr.chords[Math.floor(step / 16) % tr.chords.length];
    const on = (pat: string) => pat[s] === 'x';
    // bateria
    if (on(tr.kick)) this.tone(out, t, 'sine', 150, 42, 0.22, 0.5, 0.002);
    if (on(tr.snare)) {
      this.hiss(out, t, 0.16, 0.22, 'bandpass', 1800, 1200, 0.8);
      this.tone(out, t, 'triangle', 220, 160, 0.08, 0.12);
    }
    if (on(tr.hat)) this.hiss(out, t, 0.035, s % 4 === 2 ? 0.07 : 0.045, 'highpass', 7000);
    // baixo (com filtro)
    if (on(tr.bass)) {
      const ctx = this.ctx!;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(tr.cutoff * 2, t);
      lp.frequency.exponentialRampToValueAtTime(tr.cutoff * 0.6, t + d * 1.6);
      lp.Q.value = 6;
      lp.connect(out);
      const note = root - 12 + (s % 8 === 6 ? 12 : 0);
      this.tone(lp, t, tr.bassWave, midi(note), midi(note), d * 1.7, 0.2);
    }
    // arpejo pelas notas do acorde
    if (on(tr.arp)) {
      const n = root + 12 + chord[s % chord.length] + (Math.floor(s / 3) % 2) * 12;
      this.tone(out, t, 'square', midi(n), midi(n), d * 0.8, 0.028);
    }
    // acorde de fundo, no começo de cada compasso
    if (s === 0) {
      for (const iv of chord) this.tone(out, t, 'triangle', midi(root + 12 + iv), midi(root + 12 + iv), d * 15, 0.03, 0.2);
    }
    // melodia
    if (tr.lead) {
      const c = tr.lead[step % tr.lead.length];
      if (c !== '.') {
        const n = root + 24 + chord[Number(c) % chord.length];
        this.tone(out, t, tr.leadWave, midi(n), midi(n), d * 3, 0.045, 0.01);
      }
    }
  }
}

/** Instância única do áudio. */
export const audio = new AudioEngine();
