import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_VERSION, GAME_WIDTH } from '../config';
import { MISSION_COUNT } from '../level/missions';
import type { GameInit } from './GameScene';
import { RunState } from '../run/RunState';
import { loadSave } from '../run/save';
import { EYE_R, generateMenuArt, LOGO_M, ROOF_X, ROOF_Y } from '../gfx/art/menuArt';
import { HERO_BOB } from '../gfx/art/heroFx';
import { Action, bindingLabel } from '../input/Controls';
import { loadSettings } from '../run/settings';
import { audio } from '../audio/Audio';

const EYE = { x: 372, y: 80 };
const LOGO_POS = { x: 16, y: 18 };
const HERO_X = 312;
/** Quanto a íris e a pupila podem se afastar do centro do olho. */
const IRIS_RANGE = 16;
const PUPIL_RANGE = 22;

const D = {
  sky: 0,
  backlight: 1,
  glow: 2,
  bolt: 3,
  eye: 4,
  far: 5,
  rainFar: 6,
  near: 7,
  roof: 8,
  robots: 9,
  aura: 10,
  hero: 11,
  laptop: 12,
  rain: 13,
  ui: 20,
  overlay: 30,
};

type Item = { label: string; action: () => void };

/** Linhas do painel de controles (os atalhos vêm das configurações do jogador). */
const CONTROLS: [string, Action[]][] = [
  ['ESQUERDA', ['left']],
  ['DIREITA', ['right']],
  ['MIRAR', ['up']],
  ['ARMA 1', ['primary']],
  ['ARMA 2', ['secondary']],
  ['PULAR', ['jump']],
  ['GRANADA', ['grenade']],
  ['SKILL 1', ['skill1']],
  ['SKILL 2', ['skill2']],
  ['ESQUIVA', ['dash']],
];

/**
 * Tela inicial: logo, menu e uma cena viva (chuva, raios, o olho da IA que segue o cursor
 * e pulsa fazendo a tela tremer, herói com aura reativa e robôs à espreita).
 */
export class MenuScene extends Phaser.Scene {
  private items: Item[] = [];
  private rows: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text }[] = [];
  private index = 0;
  private overlay: Phaser.GameObjects.Container | null = null;
  private leaving = false;

  private eyeGlow!: Phaser.GameObjects.Image;
  private eyeBase!: Phaser.GameObjects.Image;
  private iris!: Phaser.GameObjects.Image;
  private pupil!: Phaser.GameObjects.Image;
  private look = new Phaser.Math.Vector2(0, 0);
  private lastPointerMove = -Infinity;

  private hero!: Phaser.GameObjects.Sprite;
  private laptop!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Image;
  private ring!: Phaser.GameObjects.Sprite;
  /** Energia da aura (sobe com eventos, desce com o tempo). */
  private energy = 0;
  private auraColor = new Phaser.Display.Color(143, 240, 255);

  private backlight!: Phaser.GameObjects.Rectangle;
  private bolt!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Menu');
  }

  create() {
    this.items = [];
    this.rows = [];
    this.index = 0;
    this.overlay = null;
    this.leaving = false;
    this.energy = 0;
    generateMenuArt(this);

    this.buildScene();
    this.buildEye();
    this.buildActors();
    this.buildRain();
    this.buildLogo();
    this.buildMenu();
    this.bindInput();
    this.scheduleLightning();
    this.scheduleEyePulse();
    this.cameras.main.fadeIn(400);
    audio.music('menu');
  }

  // ---------------------------------------------------------------- cena

  private buildScene() {
    this.add.image(0, 0, 'menu_sky').setOrigin(0).setDepth(D.sky);
    // clarão do raio: acende o céu atrás das silhuetas
    this.backlight = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xc8d8ff, 0).setOrigin(0).setDepth(D.backlight);
    this.bolt = this.add.graphics().setDepth(D.bolt).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(0, 0, 'menu_far').setOrigin(0).setDepth(D.far);
    this.add.image(0, 0, 'menu_near').setOrigin(0).setDepth(D.near);
    this.add.image(ROOF_X, ROOF_Y - 22, 'menu_roof').setOrigin(0).setDepth(D.roof);
    // vinheta leve nas bordas
    const v = this.add.graphics().setDepth(D.rain + 1);
    for (let i = 0; i < 14; i++) v.lineStyle(1, 0x000000, 0.05).strokeRect(i, i, GAME_WIDTH - i * 2, GAME_HEIGHT - i * 2);
  }

  private buildEye() {
    this.eyeGlow = this.add.image(EYE.x, EYE.y, 'menu_eye_glow').setDepth(D.glow).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.eyeGlow, alpha: { from: 0.75, to: 1 }, scale: { from: 0.95, to: 1.05 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.eyeBase = this.add.image(EYE.x, EYE.y, 'menu_eye').setDepth(D.eye);
    this.iris = this.add.image(EYE.x, EYE.y, 'menu_iris').setDepth(D.eye);
    this.pupil = this.add.image(EYE.x, EYE.y, 'menu_pupil').setDepth(D.eye);
    // o anel externo gira devagar, como um scanner
    this.tweens.add({ targets: this.eyeBase, angle: 360, duration: 60000, repeat: -1 });
  }

  private buildActors() {
    // robôs na mesma escala do herói (2x), olhando para ele
    [
      { x: 404, frame: 0 },
      { x: 448, frame: 2 },
    ].forEach((r, i) => {
      const bot = this.add
        .sprite(r.x, ROOF_Y - 52, 'bot_soldier', r.frame)
        .setScale(2)
        .setFlipX(true)
        .setTint(0x6a5a8a)
        .setDepth(D.robots);
      bot.play({ key: 'bot_soldier-idle', startFrame: r.frame });
      const eye = this.add
        .image(r.x - 12, ROOF_Y - 94, 'eye_glow')
        .setDepth(D.robots + 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.time.addEvent({
        delay: 2400 + i * 900,
        loop: true,
        callback: () => this.tweens.add({ targets: eye, alpha: 0.1, duration: 70, yoyo: true, repeat: 1 }),
      });
      this.tweens.add({ targets: eye, scale: { from: 0.9, to: 1.2 }, duration: 500, yoyo: true, repeat: -1 });
    });

    // herói (2x) com aura e anel reativos
    const heroY = ROOF_Y - 44;
    this.aura = this.add.image(HERO_X, heroY + 4, 'hero_aura').setScale(2).setDepth(D.aura).setBlendMode(Phaser.BlendModes.ADD);
    this.ring = this.add.sprite(HERO_X, ROOF_Y, 'hero_ring').setScale(2).setDepth(D.aura).setBlendMode(Phaser.BlendModes.ADD);
    this.ring.play('hero_ring');
    this.hero = this.add.sprite(HERO_X, heroY, 'hero', 0).setScale(2).setDepth(D.hero);
    this.hero.play('hero-idle');
    this.laptop = this.add.image(HERO_X, heroY, 'hero_laptop', 0).setOrigin(1 / 28, 8.5 / 16).setScale(2).setDepth(D.laptop);
  }

  private buildRain() {
    const rain = (depth: number, alpha: number, speed: number, qty: number) =>
      this.add
        .particles(0, -10, 'menu_drop', {
          x: { min: -40, max: GAME_WIDTH + 60 },
          speedY: { min: speed, max: speed + 80 },
          speedX: { min: -70, max: -50 },
          rotate: 10,
          lifespan: 900,
          quantity: qty,
          frequency: 16,
          alpha,
          scaleY: { min: 0.8, max: 1.4 },
        })
        .setDepth(depth);
    rain(D.rainFar, 0.35, 330, 1);
    rain(D.rain, 0.7, 420, 2);
    // respingos no telhado
    this.add
      .particles(0, ROOF_Y - 1, 'menu_splash', {
        x: { min: ROOF_X, max: GAME_WIDTH },
        lifespan: 160,
        frequency: 30,
        quantity: 1,
        alpha: { start: 0.9, end: 0 },
        speedY: { min: -20, max: -8 },
      })
      .setDepth(D.rain);
  }

  private buildLogo() {
    const logo = this.add.image(LOGO_POS.x, LOGO_POS.y, 'menu_logo').setOrigin(0).setDepth(D.ui);
    const mFlash = this.add.image(LOGO_POS.x, LOGO_POS.y, 'menu_logo_m').setOrigin(0).setDepth(D.ui + 0.1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setAlpha(0);
    const star = this.add.image(0, 0, 'menu_star').setDepth(D.ui + 0.2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const star2 = this.add.image(0, 0, 'menu_star').setDepth(D.ui + 0.2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setTint(0xfff0a0);
    // entrada do logo
    logo.setY(LOGO_POS.y - 30).setAlpha(0);
    this.tweens.add({ targets: logo, y: LOGO_POS.y, alpha: 1, duration: 600, ease: 'Back.easeOut' });

    // de tempos em tempos o "M" brilha como uma joia
    const m = { x: LOGO_POS.x + LOGO_M.x, y: LOGO_POS.y + LOGO_M.y, s: LOGO_M.size };
    const sparkle = () => {
      mFlash.setAlpha(0);
      this.tweens.add({ targets: mFlash, alpha: 0.55, duration: 140, yoyo: true, hold: 60 });
      star.setPosition(m.x + 7, m.y + 5).setScale(0).setAlpha(1).setAngle(0);
      this.tweens.add({ targets: star, scale: 1.2, angle: 90, duration: 260, yoyo: true, ease: 'Sine.easeOut' });
      star2.setPosition(m.x + m.s - 6, m.y + m.s - 8).setScale(0).setAlpha(1);
      this.tweens.add({ targets: star2, scale: 0.6, duration: 200, delay: 180, yoyo: true });
      this.time.delayedCall(Phaser.Math.Between(3200, 5200), sparkle);
    };
    this.time.delayedCall(1400, sparkle);

    // faixa do subtítulo
    const y = 104;
    const band = this.add.graphics().setDepth(D.ui);
    band.fillStyle(0x0c0a18, 0.85).fillRect(20, y, 222, 13);
    band.fillStyle(0x59c2f4, 1).fillRect(20, y, 222, 1).fillRect(20, y + 12, 222, 1);
    this.add.text(26, y + 3, 'O ULTIMO DEV CONTRA AS IAS', { fontFamily: FONT, fontSize: '8px', color: '#8ff0ff' }).setDepth(D.ui);
  }

  private buildMenu() {
    this.items = [
      { label: 'INICIAR RUN', action: () => this.leave('Game', { run: new RunState() } satisfies GameInit) },
      { label: 'LABORATORIO', action: () => this.leave('Lab') },
      { label: 'CONTROLES', action: () => this.openControls() },
      { label: 'OPCOES', action: () => this.leave('Options') },
    ];
    this.items.forEach((it, i) => {
      const y = 138 + i * 17;
      const bg = this.add.rectangle(20, y - 4, 150, 15, 0x2a1a50, 0).setOrigin(0).setDepth(D.ui);
      const mark = this.add.text(28, y, '>', { fontFamily: FONT, fontSize: '8px', color: '#ffcf3a' }).setDepth(D.ui);
      const text = this.add.text(42, y, it.label, { fontFamily: FONT, fontSize: '8px', color: '#b8b0d8' }).setDepth(D.ui);
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.select(i));
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
        if (p.button === 0 && !this.overlay) {
          this.select(i);
          this.confirm();
        }
      });
      this.rows.push({ bg, text, mark });
    });
    this.select(0, true);

    // progresso
    const save = loadSave();
    const box = this.add.graphics().setDepth(D.ui);
    box.fillStyle(0x0c0a18, 0.8).fillRect(20, 214, 172, 26);
    box.lineStyle(1, 0x3a3350, 1).strokeRect(20.5, 214.5, 171, 25);
    const best = save.runs === 0 ? 'PRIMEIRA RUN' : `MELHOR: MISSAO ${Math.min(save.bestMission + (save.wins ? 0 : 1), MISSION_COUNT)}/${MISSION_COUNT}`;
    this.add.text(26, 218, best, { fontFamily: FONT, fontSize: '8px', color: '#7aff9a' }).setDepth(D.ui);
    this.add.text(26, 229, `FRAGMENTOS: ${save.fragments}`, { fontFamily: FONT, fontSize: '8px', color: '#8ff0ff' }).setDepth(D.ui);

    const hint = { fontFamily: FONT, fontSize: '8px', color: '#6a6488' };
    this.add.text(20, GAME_HEIGHT - 14, 'CIMA/BAIXO + ENTER OU MOUSE', hint).setDepth(D.ui);
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 14, `V${GAME_VERSION}`, hint).setOrigin(1, 0).setDepth(D.ui);
  }

  private select(i: number, silent = false) {
    if (this.overlay) return;
    const changed = i !== this.index;
    this.index = i;
    this.rows.forEach((r, k) => {
      const sel = k === i;
      r.bg.setFillStyle(0x2a1a50, sel ? 0.9 : 0);
      r.bg.setStrokeStyle(sel ? 1 : 0, 0xffcf3a, sel ? 0.8 : 0);
      r.text.setColor(sel ? '#ffcf3a' : '#b8b0d8');
      r.mark.setVisible(sel);
    });
    if (changed && !silent) {
      audio.play('select');
      this.pump(0.35, 0x8ff0ff);
      const t = this.rows[i].text;
      this.tweens.add({ targets: t, x: { from: 46, to: 42 }, duration: 120 });
    }
  }

  private confirm() {
    if (this.leaving || this.overlay) return;
    this.pump(1.2, 0xffcf3a);
    audio.play('confirm');
    this.items[this.index].action();
  }

  private leave(scene: string, data?: object) {
    this.leaving = true;
    this.cameras.main.flash(120, 255, 230, 150);
    this.cameras.main.fadeOut(350);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  // ---------------------------------------------------------------- painéis

  private panel(title: string, lines: string[], color = '#ffcf3a') {
    const w = 352;
    const h = 36 + lines.length * 14 + 20;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const root = this.add.container(0, 0).setDepth(D.overlay);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.75).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x0c0a18, 0.97).fillRect(x, y, w, h);
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1).strokeRect(x, y, w, h);
    const t = this.add.text(GAME_WIDTH / 2, y + 10, title, { fontFamily: FONT, fontSize: '8px', color }).setOrigin(0.5, 0);
    const body = this.add.text(x + 16, y + 32, lines.join('\n'), { fontFamily: FONT, fontSize: '8px', color: '#e8e0ff', lineSpacing: 6 });
    const close = this.add.text(GAME_WIDTH / 2, y + h - 14, 'ESC / ENTER / CLIQUE: VOLTAR', { fontFamily: FONT, fontSize: '8px', color: '#6a6488' }).setOrigin(0.5, 0);
    root.add([shade, g, t, body, close]);
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 150 });
    shade.once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closeOverlay());
    this.overlay = root;
  }

  private openControls() {
    const width = 15;
    const b = loadSettings().bindings;
    const keys = (a: Action) => (b[a] ?? []).slice(0, 2).map(bindingLabel).join(' / ') || '---';
    const lines = CONTROLS.map(([label, actions]) => {
      const k = actions.map(keys).join('  ');
      return `${label} ${'.'.repeat(Math.max(2, width - label.length))} ${k}`;
    });
    lines.push('', 'TROQUE EM OPCOES > ATALHOS');
    this.panel('CONTROLES', lines);
  }

  private closeOverlay() {
    const o = this.overlay;
    if (!o) return;
    audio.play('back');
    // espera o clique/tecla terminar antes de reabilitar o menu
    this.time.delayedCall(60, () => (this.overlay = null));
    this.tweens.add({ targets: o, alpha: 0, duration: 120, onComplete: () => o.destroy() });
  }

  // ---------------------------------------------------------------- entrada

  private bindInput() {
    const kb = this.input.keyboard!;
    const on = (keys: string[], fn: () => void) => keys.forEach((k) => kb.on(`keydown-${k}`, fn));
    on(['UP', 'W'], () => this.select((this.index + this.items.length - 1) % this.items.length));
    on(['DOWN', 'S'], () => this.select((this.index + 1) % this.items.length));
    on(['ENTER', 'J', 'Z', 'SPACE'], () => (this.overlay ? this.closeOverlay() : this.confirm()));
    on(['ESC', 'BACKSPACE'], () => this.closeOverlay());
    this.input.on(Phaser.Input.Events.POINTER_MOVE, () => (this.lastPointerMove = this.time.now));

    // Atalho de desenvolvimento: teclas 1..N começam uma run direto na missão
    if (import.meta.env.DEV) {
      Array.from({ length: MISSION_COUNT }).forEach((_, i) => {
        kb.once(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i]}`, () => {
          const run = new RunState();
          run.mission = i;
          this.scene.start('Game', { run } satisfies GameInit);
        });
      });
    }
  }

  // ---------------------------------------------------------------- eventos da cena

  /** Raios de tempos em tempos: o céu acende atrás dos prédios e o trovão treme a tela. */
  private scheduleLightning() {
    this.time.delayedCall(Phaser.Math.Between(2500, 7000), () => {
      this.lightning();
      this.scheduleLightning();
    });
  }

  private lightning() {
    const x0 = Phaser.Math.Between(40, GAME_WIDTH - 40);
    const yEnd = Phaser.Math.Between(110, 190);
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(x0, -4)];
    let x = x0;
    for (let y = 0; y < yEnd; y += Phaser.Math.Between(8, 16)) {
      x += Phaser.Math.Between(-10, 10);
      pts.push(new Phaser.Math.Vector2(x, y));
    }
    const branches: Phaser.Math.Vector2[][] = [];
    for (let b = 0; b < 2; b++) {
      const start = pts[Phaser.Math.Between(2, pts.length - 2)];
      const br = [start.clone()];
      let bx = start.x;
      const dir = Phaser.Math.RND.sign();
      for (let k = 0, by = start.y; k < 4; k++) {
        bx += dir * Phaser.Math.Between(4, 12);
        by += Phaser.Math.Between(6, 12);
        br.push(new Phaser.Math.Vector2(bx, by));
      }
      branches.push(br);
    }
    const draw = (alpha: number) => {
      this.bolt.clear();
      for (const line of [pts, ...branches]) {
        this.bolt.lineStyle(4, 0x6a8cff, 0.35 * alpha).strokePoints(line);
        this.bolt.lineStyle(1, 0xffffff, alpha).strokePoints(line);
      }
    };
    // pisca duas vezes e some
    const steps: [number, number, number][] = [
      [0, 1, 0.55],
      [60, 0, 0.1],
      [110, 1, 0.45],
      [190, 0.6, 0.25],
      [260, 0, 0],
    ];
    for (const [t, bolt, sky] of steps) {
      this.time.delayedCall(t, () => {
        draw(bolt);
        this.backlight.setAlpha(sky);
      });
    }
    this.pump(0.5, 0xffffff);
    this.time.delayedCall(Phaser.Math.Between(250, 600), () => {
      this.cameras.main.shake(260, 0.003);
      audio.play('thunder');
    });
  }

  /** O olho da IA pulsa: onda de choque vermelha e a tela treme. */
  private scheduleEyePulse() {
    this.time.delayedCall(Phaser.Math.Between(3500, 6500), () => {
      this.eyePulse();
      this.scheduleEyePulse();
    });
  }

  private eyePulse() {
    this.tweens.add({ targets: this.eyeGlow, scale: 1.45, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.pupil, scale: 0.55, duration: 120, yoyo: true, hold: 200 });
    this.iris.setTintFill(0xffffff);
    this.time.delayedCall(70, () => this.iris.clearTint());
    const wave = this.add.circle(EYE.x, EYE.y, EYE_R, 0xff2a4a, 0).setStrokeStyle(3, 0xff3a5a, 0.8).setDepth(D.near + 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: wave, radius: 360, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => wave.destroy() });
    const tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff1a3a, 0.14).setOrigin(0).setDepth(D.rain + 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: tint, alpha: 0, duration: 450, onComplete: () => tint.destroy() });
    this.cameras.main.shake(280, 0.007);
    audio.play('pulse');
    this.pump(0.9, 0xff5aff);
  }

  /** Energia para a aura e o anel do herói. */
  private pump(amount: number, color: number) {
    this.energy = Math.min(1.6, this.energy + amount);
    this.auraColor = Phaser.Display.Color.IntegerToColor(color);
  }

  // ---------------------------------------------------------------- quadro a quadro

  update(time: number, delta: number) {
    const dt = delta / 1000;
    this.updateEye(time, dt);
    this.updateHero(time, dt);
  }

  /** Íris segue o mouse; sem mexer o mouse, olha para a opção do menu selecionada. */
  private updateEye(_time: number, dt: number) {
    const p = this.input.activePointer;
    const usingMouse = this.time.now - this.lastPointerMove < 2500;
    let tx: number;
    let ty: number;
    if (usingMouse) {
      tx = p.x;
      ty = p.y;
    } else {
      const row = this.rows[this.index];
      tx = row.text.x + 30;
      ty = row.text.y;
    }
    const dir = new Phaser.Math.Vector2(tx - EYE.x, ty - EYE.y);
    const dist = dir.length();
    dir.normalize().scale(Math.min(1, dist / 160));
    this.look.lerp(dir, Math.min(1, dt * 8));
    this.iris.setPosition(EYE.x + this.look.x * IRIS_RANGE, EYE.y + this.look.y * IRIS_RANGE);
    this.pupil.setPosition(EYE.x + this.look.x * PUPIL_RANGE, EYE.y + this.look.y * PUPIL_RANGE);
  }

  private updateHero(time: number, dt: number) {
    // mouse perto do herói também energiza a aura
    const p = this.input.activePointer;
    const near = 1 - Phaser.Math.Clamp(Phaser.Math.Distance.Between(p.x, p.y, HERO_X, ROOF_Y - 44) / 110, 0, 1);
    if (near > 0 && this.time.now - this.lastPointerMove < 2500) {
      this.energy = Math.max(this.energy, near * 0.6);
      if (near > 0.3) this.auraColor = Phaser.Display.Color.IntegerToColor(0x8ff0ff);
    }
    this.energy = Math.max(0, this.energy - dt * 1.2);
    const e = this.energy;
    const base = Phaser.Display.Color.IntegerToColor(0xffffff);
    const mix = Phaser.Display.Color.Interpolate.ColorWithColor(base, this.auraColor, 100, Math.min(100, e * 100));
    const color = Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b);
    this.aura
      .setAlpha(Math.min(1, 0.55 + Math.sin(time / 300) * 0.15 + e * 0.45))
      .setScale(2 * (1 + e * 0.18))
      .setTint(color);
    this.ring.setScale(2 * (1 + e * 0.25)).setTint(color).setAlpha(0.7 + e * 0.3);
    this.ring.anims.timeScale = 1 + e * 4;

    const bob = HERO_BOB[Number(this.hero.frame.name) || 0] ?? 0;
    this.laptop.setPosition(HERO_X + 2, this.hero.y - 2 + bob * 2);
  }
}
