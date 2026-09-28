import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y } from '../config';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../themes/Theme';
import { Boss, HurtZone } from './Boss';
import { audio } from '../audio/Audio';

type Img = Phaser.GameObjects.Image;
type Point = { x: number; y: number };

const SEGMENTS = 11;
const SPACING = 24;
/** Tudo abaixo desta altura está enterrado (escondido atrás do chão). */
const BURIED = GROUND_Y + 8;
/** Deslocamento do injetor (ponto fraco) em relação ao centro da cabeça, virada para a direita. */
const CORE_OFFSET = { x: -12, y: -14 };
/** Zona de acerto do injetor: cobre o meio da cabeça (tiros de baixo, de lado e de cima acertam). */
const CORE_ZONE = 36;

interface Glob {
  img: Img;
  vx: number;
  vy: number;
}

/**
 * MISSÃO 3 — Verme-Mãe: verme mecânico gigante que espalha o worm.
 * Vive sob o chão da arena: rachaduras brilham onde ela vai sair, morde saltando em arco,
 * sobe para cuspir vírus (poças no chão) e "fabrica" Infectados. O ponto fraco é o injetor
 * na cabeça; o corpo blindado só solta faíscas.
 */
export class Worm extends Boss {
  private head: Point = { x: 0, y: 0 };
  private heading = -Math.PI / 2;
  private trail: Point[] = [];
  private headImg: Img;
  private coreImg: Img;
  private coreGlow: Img;
  private jawTop: Img;
  private jawBot: Img;
  private segs: Img[] = [];
  private crack: Img;
  private globs: Glob[] = [];
  private coreZone: HurtZone;
  private busy = true;
  private nextAttack = 0;
  private jawOpen = 0;
  private speedMul = 1;
  private path: { curve: Phaser.Curves.Spline; t: number; duration: number; onDone: () => void } | null = null;
  private sway = 0;
  private lastAttack = '';

  constructor(gs: GameScene, arenaX: number, hp: number) {
    super(gs, 'VERME-MAE', hp, arenaX);
    const d = DEPTH.ground - 0.5;
    for (let i = 0; i < SEGMENTS; i++) {
      const tail = i >= SEGMENTS - 3;
      this.segs.push(gs.add.image(0, 0, tail ? 'worm_tail' : 'worm_seg').setDepth(d - i * 0.001).setScale(tail ? 1 - (i - (SEGMENTS - 3)) * 0.15 : 1));
    }
    this.jawTop = gs.add.image(0, 0, 'worm_jaw').setOrigin(0.1, 0.5).setDepth(d + 0.01);
    this.jawBot = gs.add.image(0, 0, 'worm_jaw').setOrigin(0.1, 0.5).setFlipY(true).setDepth(d + 0.01);
    this.headImg = gs.add.image(0, 0, 'worm_head').setDepth(d + 0.02);
    this.coreGlow = gs.add.image(0, 0, 'eye_glow').setScale(2.4).setTint(0x5aff5a).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.03);
    this.coreImg = gs.add.image(0, 0, 'worm_core').setDepth(d + 0.04);
    this.crack = gs.add.image(0, GROUND_Y - 2, 'worm_crack').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lip + 0.5).setAlpha(0);
    gs.tweens.add({ targets: this.coreGlow, alpha: { from: 0.5, to: 1 }, duration: 380, yoyo: true, repeat: -1 });

    this.coreZone = this.addZone(CORE_ZONE, CORE_ZONE, true);

    // começa enterrada no meio da arena e faz a entrada rugindo
    const cx = arenaX + GAME_WIDTH / 2;
    this.head = { x: cx, y: GROUND_Y + 140 };
    for (let i = 0; i < SEGMENTS * SPACING; i += 4) this.trail.push({ x: cx, y: GROUND_Y + 140 + i });
    this.telegraph(cx, 700, () =>
      this.follow([{ x: cx - 30, y: GROUND_Y + 120 }, { x: cx, y: GROUND_Y - 120 }, { x: cx + 60, y: GROUND_Y - 150 }], 1300, () => {
        this.roar();
        gs.time.delayedCall(700, () =>
          this.follow([{ x: cx + 60, y: GROUND_Y - 150 }, { x: cx + 140, y: GROUND_Y - 40 }, { x: cx + 170, y: GROUND_Y + 150 }], 1100, () => this.ready(1000)),
        );
      }),
    );
  }

  // ------------------------------------------------------------ quadro a quadro

  update(time: number, delta: number) {
    const dt = delta / 1000;
    if (this.path && !this.dying) {
      const p = this.path;
      p.t = Math.min(1, p.t + (delta * this.speedMul) / p.duration);
      const pos = p.curve.getPoint(Phaser.Math.Easing.Sine.InOut(p.t));
      this.moveHead(pos.x, pos.y);
      if (p.t >= 1) {
        this.path = null;
        p.onDone();
      }
    } else if (this.sway > 0 && !this.dying) {
      // parada na superfície: a cabeça balança devagar
      this.sway += dt;
      this.moveHead(this.head.x + Math.cos(this.sway * 2.2) * 0.5, this.head.y + Math.sin(this.sway * 3.1) * 0.35);
    }
    this.layout(time);
    this.updateGlobs(dt);
    if (this.dying) return;
    if (!this.busy && time > this.nextAttack) this.attack();
    this.contactDamage();
  }

  private moveHead(x: number, y: number) {
    const dx = x - this.head.x;
    const dy = y - this.head.y;
    if (Math.hypot(dx, dy) > 0.3) this.heading = Math.atan2(dy, dx);
    this.head = { x, y };
    const last = this.trail[0];
    if (!last || Math.hypot(last.x - x, last.y - y) > 2) {
      this.trail.unshift({ x, y });
      if (this.trail.length > 260) this.trail.length = 260;
    }
  }

  /** Posição a `dist` px da cabeça, andando pelo rastro. */
  private along(dist: number): Point {
    let left = dist;
    let prev: Point = this.head;
    for (const p of this.trail) {
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (d >= left && d > 0) {
        const k = left / d;
        return { x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k };
      }
      left -= d;
      prev = p;
    }
    return prev;
  }

  private layout(time: number) {
    const h = this.head;
    const a = this.heading;
    const left = Math.cos(a) < 0;
    // corpo
    for (let i = 0; i < SEGMENTS; i++) {
      const p = this.along((i + 1) * SPACING);
      const q = this.along((i + 1) * SPACING + 6);
      this.segs[i].setPosition(p.x, p.y).setRotation(Math.atan2(p.y - q.y, p.x - q.x)).setVisible(p.y < BURIED + 30);
    }
    // cabeça, mandíbulas e injetor
    const open = 0.15 + this.jawOpen * 0.55 + Math.sin(time / 120) * 0.05;
    const jx = h.x + Math.cos(a) * 22;
    const jy = h.y + Math.sin(a) * 22;
    this.headImg.setPosition(h.x, h.y).setRotation(a).setFlipY(left);
    const sgn = left ? -1 : 1;
    this.jawTop.setPosition(jx - Math.sin(a) * -6 * sgn, jy + Math.cos(a) * -6 * sgn).setRotation(a - open * sgn).setFlipY(left);
    this.jawBot.setPosition(jx - Math.sin(a) * 6 * sgn, jy + Math.cos(a) * 6 * sgn).setRotation(a + open * sgn).setFlipY(!left);
    const cx = h.x + Math.cos(a) * CORE_OFFSET.x - Math.sin(a) * CORE_OFFSET.y * sgn;
    const cy = h.y + Math.sin(a) * CORE_OFFSET.x + Math.cos(a) * CORE_OFFSET.y * sgn;
    this.coreImg.setPosition(cx, cy).setRotation(a + Math.PI / 2);
    this.coreGlow.setPosition(cx, cy);
    const up = h.y < BURIED;
    for (const img of [this.headImg, this.jawTop, this.jawBot, this.coreImg, this.coreGlow]) img.setVisible(h.y < BURIED + 40);
    // zonas de acerto só valem fora do chão
    this.coreZone.setPosition((h.x + cx) / 2, (h.y + cy) / 2);
    this.coreZone.body.enable = up && !this.dying;
    this.coreZone.setActive(up && !this.dying);
  }

  private contactDamage() {
    if (this.head.y < BURIED - 6 && this.playerTouches(new Phaser.Geom.Rectangle(this.head.x - 24, this.head.y - 20, 48, 40))) {
      this.gs.hurtPlayer(1, this.head.x);
      return;
    }
    for (const s of this.segs) {
      if (s.visible && s.y < BURIED - 10 && this.playerTouches(new Phaser.Geom.Rectangle(s.x - 14, s.y - 14, 28, 28))) {
        this.gs.hurtPlayer(1, s.x);
        return;
      }
    }
  }

  /** Faz a cabeça seguir uma curva suave passando pelos pontos. */
  private follow(points: Point[], duration: number, onDone: () => void) {
    this.sway = 0;
    const pts = [new Phaser.Math.Vector2(this.head.x, this.head.y), ...points.map((p) => new Phaser.Math.Vector2(p.x, p.y))];
    this.path = { curve: new Phaser.Curves.Spline(pts), t: 0, duration, onDone };
  }

  // ------------------------------------------------------------ ataques

  private ready(pause: number) {
    this.busy = false;
    this.jawOpen = 0;
    this.nextAttack = this.gs.time.now + pause * (this.phase2 ? 0.6 : 1);
  }

  private attack() {
    this.busy = true;
    const summonOk = this.gs.enemies.countActive() < 3 && this.lastAttack !== 'summon';
    const r = Math.random();
    let kind = r < 0.45 ? 'bite' : r < 0.8 || !summonOk ? 'spit' : 'summon';
    if (kind === this.lastAttack && kind !== 'bite') kind = 'bite';
    this.lastAttack = kind;
    if (kind === 'bite') this.bite(this.phase2 ? 2 : 1);
    else if (kind === 'spit') this.spit();
    else this.summon();
  }

  private get left() {
    return this.arenaX + 40;
  }

  private get right() {
    return this.arenaX + GAME_WIDTH - 40;
  }

  /** Rachaduras brilhando no chão onde ela vai sair. */
  private telegraph(x: number, ms: number, then: () => void) {
    const gs = this.gs;
    this.crack.setPosition(x, GROUND_Y - 2).setAlpha(1);
    const blink = gs.tweens.add({ targets: this.crack, alpha: 0.25, duration: 90, yoyo: true, repeat: -1 });
    gs.cameras.main.shake(ms, 0.0025);
    audio.play('rumble');
    const dust = gs.time.addEvent({ delay: 160, repeat: Math.floor(ms / 160), callback: () => gs.dust(x + Phaser.Math.Between(-24, 24), GROUND_Y, 0.7) });
    gs.time.delayedCall(ms * (this.phase2 ? 0.7 : 1), () => {
      blink.stop();
      dust.remove();
      this.crack.setAlpha(0);
      gs.cameras.main.shake(160, 0.008);
      gs.dust(x - 16, GROUND_Y, 1.3);
      gs.dust(x + 16, GROUND_Y, 1.3);
      then();
    });
  }

  /** Mordida: sai do chão embaixo do herói num arco e mergulha do outro lado. */
  private bite(times: number) {
    const px = Phaser.Math.Clamp(this.gs.player.x, this.left + 20, this.right - 20);
    const dir = px < this.arenaX + GAME_WIDTH / 2 ? 1 : -1;
    this.moveUnder(px - dir * 60, () =>
      this.telegraph(px, 650, () => {
        this.jawOpen = 1;
        this.follow(
          [
            { x: px - dir * 30, y: GROUND_Y + 40 },
            { x: px, y: GROUND_Y - 120 },
            { x: px + dir * 90, y: GROUND_Y - 70 },
            { x: px + dir * 150, y: GROUND_Y + 140 },
          ],
          1250,
          () => (times > 1 ? this.bite(times - 1) : this.ready(900)),
        );
      }),
    );
  }

  /** Anda por baixo da terra até um ponto (sem aparecer). */
  private moveUnder(x: number, then: () => void) {
    const y = GROUND_Y + 130;
    this.follow([{ x: (this.head.x + x) / 2, y: y + 20 }, { x, y }], 500, then);
  }

  /** Sobe num canto da arena, fica exposta e cospe bolas de vírus em arco. */
  private spit() {
    const gs = this.gs;
    const fromLeft = gs.player.x > this.arenaX + GAME_WIDTH / 2;
    const bx = fromLeft ? this.left + 30 : this.right - 30;
    const dir = fromLeft ? 1 : -1;
    this.moveUnder(bx - dir * 30, () =>
      this.telegraph(bx, 500, () =>
        this.follow([{ x: bx, y: GROUND_Y - 40 }, { x: bx + dir * 30, y: GROUND_Y - 130 }], 900, () => {
          this.sway = 0.01;
          const shots = this.phase2 ? 5 : 3;
          for (let i = 0; i < shots; i++) {
            gs.time.delayedCall(350 + i * 380, () => {
              if (this.dying) return;
              this.jawOpen = 1;
              gs.time.delayedCall(140, () => (this.jawOpen = 0.2));
              this.spitGlob();
            });
          }
          gs.time.delayedCall(350 + shots * 380 + 900, () => {
            if (this.dying) return;
            this.follow([{ x: bx + dir * 60, y: GROUND_Y - 60 }, { x: bx + dir * 40, y: GROUND_Y + 140 }], 900, () => this.ready(800));
          });
        }),
      ),
    );
  }

  private spitGlob() {
    const gs = this.gs;
    const a = this.heading;
    const mx = this.head.x + Math.cos(a) * 34;
    const my = this.head.y + Math.sin(a) * 34;
    const target = gs.player.x + Phaser.Math.Between(-50, 50);
    const t = 1.05;
    const g = 420;
    const vx = (target - mx) / t;
    const vy = (GROUND_Y - my - 0.5 * g * t * t) / t;
    const img = gs.add.image(mx, my, 'worm_glob').setDepth(DEPTH.hazardFront);
    this.globs.push({ img, vx, vy });
    audio.play('enemyShot', 0.6);
    gs.emitBits(mx, my, 0x5aff5a);
  }

  private updateGlobs(dt: number) {
    const gs = this.gs;
    for (const gl of this.globs) {
      gl.vy += 420 * dt;
      gl.img.x += gl.vx * dt;
      gl.img.y += gl.vy * dt;
      gl.img.rotation += dt * 8;
      if (this.playerTouches(new Phaser.Geom.Rectangle(gl.img.x - 6, gl.img.y - 6, 12, 12))) {
        gs.hurtPlayer(1, gl.img.x);
        gl.img.destroy();
        continue;
      }
      if (gl.img.y >= GROUND_Y - 3) {
        gs.world.spawnOoze(gl.img.x, 36, this.phase2 ? 5000 : 3500);
        gs.glitchBars(gl.img.x, GROUND_Y - 6, [0x5aff5a, 0xc8ffb0]);
        gl.img.destroy();
      }
    }
    this.globs = this.globs.filter((g) => g.img.active);
  }

  /** Rugido: tela treme, mandíbulas abertas. */
  private roar() {
    audio.play('roar');
    this.jawOpen = 1;
    this.gs.cameras.main.shake(500, 0.01);
    this.gs.glitchBars(this.head.x, this.head.y, [0x5aff5a, 0xffffff]);
    this.gs.time.delayedCall(600, () => (this.jawOpen = 0.2));
  }

  /** Enfia cabos na sucata do chão e "fabrica" Infectados. */
  private summon() {
    const gs = this.gs;
    const cx = this.arenaX + GAME_WIDTH / 2;
    this.moveUnder(cx, () =>
      this.telegraph(cx, 450, () =>
        this.follow([{ x: cx, y: GROUND_Y - 90 }], 700, () => {
          this.sway = 0.01;
          this.roar();
          const spots = [this.left + 30, this.right - 30];
          spots.forEach((x, i) =>
            gs.time.delayedCall(300 + i * 250, () => {
              if (this.dying) return;
              gs.glitchBars(x, GROUND_Y - 20, [0x5aff5a, 0x1a5a24, 0xffffff]);
              gs.dust(x, GROUND_Y, 1.2);
              const e = gs.spawnEnemy('infected', x);
              e.setAlpha(0);
              gs.tweens.add({ targets: e, alpha: 1, duration: 250 });
            }),
          );
          gs.time.delayedCall(1300, () => {
            if (this.dying) return;
            this.follow([{ x: cx + 40, y: GROUND_Y - 30 }, { x: cx + 60, y: GROUND_Y + 140 }], 800, () => this.ready(1100));
          });
        }),
      ),
    );
  }

  // ------------------------------------------------------------ Boss

  protected bounds() {
    const pts = [this.head, ...this.segs.filter((s) => s.visible && s.y < BURIED).map((s) => ({ x: s.x, y: s.y }))];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => Math.min(p.y, BURIED - 20));
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    return new Phaser.Geom.Rectangle(minX, minY, Math.max(...xs) + 20 - minX, Math.max(40, Math.max(...ys) + 10 - minY));
  }

  protected flash() {
    const parts = [this.headImg, this.coreImg, this.jawTop, this.jawBot, ...this.segs];
    parts.forEach((p) => p.setTintFill(0xffffff));
    this.gs.time.delayedCall(60, () => parts.forEach((p) => p.active && p.clearTint()));
  }

  protected onPhase2() {
    this.speedMul = 1.3;
    this.coreGlow.setScale(3.2);
    this.roar();
  }

  protected cleanup() {
    for (const g of this.globs) g.img.destroy();
    this.globs = [];
    for (const img of [this.headImg, this.coreImg, this.coreGlow, this.jawTop, this.jawBot, this.crack, ...this.segs]) img.destroy();
  }
}
