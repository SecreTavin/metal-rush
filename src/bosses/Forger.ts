import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y } from '../config';
import { explosion } from '../gfx/effects';
import type { GameScene } from '../scenes/GameScene';
import { Boss, HurtZone } from './Boss';

type Img = Phaser.GameObjects.Image;

const RAIL_Y = 12;
const HAMMER_REST = GROUND_Y - 150;
const HAMMER_DOWN = GROUND_Y - 18;

interface Arm { trolley: Img; shaft: Phaser.GameObjects.TileSprite; hammer: Img; marker: Img; zone: HurtZone; x: number; y: number; busy: boolean; lethal: boolean }
interface Blob { s: Img; vx: number; vy: number }
interface Fire { s: Phaser.GameObjects.Sprite; until: number }
interface Ball { s: Img; vx: number; vy: number; until: number }

/** MISSÃO 2 — Forjador: a fornalha-mãe da fábrica, com martelos no teto e um núcleo derretido. */
export class Forger extends Boss {
  private body: Img;
  private core: Img;
  private coreGlow: Img;
  private shutterL: Img;
  private shutterR: Img;
  private coreZone: HurtZone;
  private bodyZone: HurtZone;
  private arms: Arm[];
  private blobs: Blob[] = [];
  private fires: Fire[] = [];
  private balls: Ball[] = [];
  private open = false;
  private nextAttack = 0;
  private busy = true;
  private cx: number;
  /** Ataques seguidos sem abrir o núcleo (garante janelas de dano). */
  private sinceOpen = 0;
  private cy: number;

  constructor(gs: GameScene, arenaX: number, hp: number) {
    super(gs, 'FORJADOR', hp, arenaX);
    const bx = arenaX + GAME_WIDTH - 90;
    this.body = gs.add.image(bx + 200, GROUND_Y + 4, 'forge_body').setOrigin(0.5, 1).setDepth(4);
    const top = GROUND_Y + 4 - 200;
    this.cx = bx - 90 + 60;
    this.cy = top + 158;
    this.coreGlow = gs.add.image(this.cx, this.cy, 'eye_glow').setScale(5).setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.1);
    this.core = gs.add.image(this.cx, this.cy, 'forge_core').setDepth(4.2);
    this.shutterL = gs.add.image(this.cx - 15, this.cy, 'forge_shutter').setDepth(4.3);
    this.shutterR = gs.add.image(this.cx + 15, this.cy, 'forge_shutter').setDepth(4.3).setFlipX(true);
    this.coreZone = this.addZone(44, 44, false);
    this.coreZone.setPosition(this.cx, this.cy);
    // blindagem só na parte de trás: os tiros chegam ao núcleo pela frente
    this.bodyZone = this.addZone(96, 190, false);
    this.bodyZone.setPosition(bx + 42, GROUND_Y + 4 - 95);

    this.arms = [arenaX + 90, arenaX + 210].map((x) => {
      const trolley = gs.add.image(x, RAIL_Y, 'forge_trolley').setDepth(4.5);
      const shaft = gs.add.tileSprite(x, RAIL_Y + 6, 16, 10, 'forge_shaft').setOrigin(0.5, 0).setDepth(4.4);
      const hammer = gs.add.image(x, HAMMER_REST, 'forge_hammer').setDepth(8.5);
      const marker = gs.add.image(x, GROUND_Y - 2, 'target_marker').setDepth(7).setScale(1.6, 1).setVisible(false);
      const zone = this.addZone(52, 30, false);
      return { trolley, shaft, hammer, marker, zone, x, y: HAMMER_REST, busy: false, lethal: false };
    });
    // trilho do teto
    gs.add.rectangle(arenaX, RAIL_Y - 5, GAME_WIDTH, 4, 0x07080c).setOrigin(0).setDepth(4.4);

    // entrada: a parede desliza para dentro
    gs.tweens.add({
      targets: this.body,
      x: bx,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        gs.cameras.main.shake(300, 0.012);
        this.busy = false;
        this.nextAttack = gs.time.now + 800;
      },
    });
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    this.coreGlow.setAlpha(this.open ? 0.9 + Math.random() * 0.1 : 0.35 + Math.sin(time / 200) * 0.1);
    this.core.setScale(this.open ? 1 + Math.sin(time / 60) * 0.04 : 1);
    for (const a of this.arms) this.layoutArm(a);
    this.updateBlobs(dt);
    this.updateFires(time);
    this.updateBalls(time, dt);
    if (this.dying) return;

    if (!this.busy && time > this.nextAttack) this.attack();

    for (const a of this.arms) {
      if (a.lethal && this.playerTouches(a.zone.getBounds())) this.gs.hurtPlayer(2, a.x);
    }
    const hull = this.body.getBounds();
    hull.x += 8;
    hull.width -= 8;
    if (this.playerTouches(hull)) this.gs.hurtPlayer(1, this.body.x);
  }

  // ------------------------------------------------------------ ataques

  private attack() {
    this.busy = true;
    const done = (pause: number) => {
      this.busy = false;
      this.nextAttack = this.gs.time.now + pause * (this.phase2 ? 0.6 : 1);
    };
    const r = this.sinceOpen >= 2 ? 1 : Math.random();
    if (r >= 0.65) this.sinceOpen = 0;
    else this.sinceOpen++;
    if (r < 0.4) {
      this.slam(this.arms[Math.random() < 0.5 ? 0 : 1], () => {
        if (this.phase2 && !this.dying) this.slam(this.arms[0].busy ? this.arms[1] : this.arms[0], () => done(700));
        else done(900);
      });
    } else if (r < 0.65) {
      this.spit(() => done(1100));
    } else {
      this.openCore(() => done(1000));
    }
  }

  /** Martelo: corre pelo trilho até o herói, marca o chão e esmaga. */
  private slam(arm: Arm, done: () => void) {
    if (arm.busy) return done();
    arm.busy = true;
    const gs = this.gs;
    const tx = Phaser.Math.Clamp(gs.player.x, this.arenaX + 30, this.cx - 60);
    gs.tweens.add({
      targets: arm,
      x: tx,
      duration: this.phase2 ? 380 : 560,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        arm.marker.setPosition(tx, GROUND_Y - 2).setVisible(true);
        const blink = gs.time.addEvent({ delay: 70, loop: true, callback: () => arm.marker.setAlpha(arm.marker.alpha > 0.5 ? 0.3 : 1) });
        gs.time.delayedCall(this.phase2 ? 380 : 520, () => {
          blink.remove();
          arm.marker.setVisible(false);
          if (this.dying) return;
          arm.lethal = true;
          gs.tweens.add({
            targets: arm,
            y: HAMMER_DOWN,
            duration: 110,
            ease: 'Quad.easeIn',
            onComplete: () => {
              gs.cameras.main.shake(180, 0.014);
              gs.dust(arm.x - 22, GROUND_Y, 1.2);
              gs.dust(arm.x + 22, GROUND_Y, 1.2);
              gs.time.delayedCall(200, () => (arm.lethal = false));
              // cravado no chão: o martelo vira ponto fraco por um instante
              this.setWeak(arm.zone, true);
              arm.hammer.setTint(0xffb0a0);
              gs.time.delayedCall(this.phase2 ? 900 : 1200, () => {
                this.setWeak(arm.zone, false);
                arm.hammer.clearTint();
                gs.tweens.add({
                  targets: arm,
                  y: HAMMER_REST,
                  duration: 600,
                  onComplete: () => {
                    arm.busy = false;
                    done();
                  },
                });
              });
            },
          });
        });
      },
    });
  }

  /** Cospe metal derretido em arco; onde cai, fica fogo por um tempo. */
  private spit(done: () => void) {
    const gs = this.gs;
    const n = this.phase2 ? 5 : 3;
    const mouth = { x: this.body.x - 90 + 59, y: GROUND_Y + 4 - 200 + 75 };
    for (let i = 0; i < n; i++) {
      gs.time.delayedCall(i * 180, () => {
        if (this.dying) return;
        const target = Phaser.Math.Clamp(gs.player.x + Phaser.Math.Between(-70, 50), this.arenaX + 20, mouth.x - 40);
        const t = 0.9;
        const g = 600;
        const vx = (target - mouth.x) / t;
        const vy = (GROUND_Y - 6 - mouth.y - 0.5 * g * t * t) / t;
        const s = gs.add.image(mouth.x, mouth.y, 'blob').setDepth(8);
        this.blobs.push({ s, vx, vy });
        explosion(gs, mouth.x, mouth.y, 0.3);
      });
    }
    gs.time.delayedCall(n * 180 + 900, done);
  }

  private updateBlobs(dt: number) {
    for (const b of this.blobs) {
      b.vy += 600 * dt;
      b.s.x += b.vx * dt;
      b.s.y += b.vy * dt;
      b.s.rotation += dt * 8;
      if (b.s.y >= GROUND_Y - 6) {
        const fire = this.gs.add.sprite(b.s.x, GROUND_Y + 1, 'fire_patch').setOrigin(0.5, 1).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        fire.play('fire_patch');
        this.fires.push({ s: fire, until: this.gs.time.now + 2600 });
        b.s.destroy();
        b.vy = NaN;
      } else if (this.playerTouches(new Phaser.Geom.Rectangle(b.s.x - 5, b.s.y - 5, 10, 10))) {
        this.gs.hurtPlayer(1, b.s.x);
      }
    }
    this.blobs = this.blobs.filter((b) => !Number.isNaN(b.vy));
  }

  private updateFires(time: number) {
    for (const f of this.fires) {
      if (this.playerTouches(new Phaser.Geom.Rectangle(f.s.x - 14, GROUND_Y - 14, 28, 14))) this.gs.hurtPlayer(1, f.s.x);
      if (time > f.until) {
        this.gs.tweens.add({ targets: f.s, alpha: 0, duration: 200, onComplete: () => f.s.destroy() });
        f.until = Infinity;
        f.s.setData('gone', true);
      }
    }
    this.fires = this.fires.filter((f) => !f.s.getData('gone'));
  }

  /** Abre as comportas: o núcleo fica exposto (ponto fraco) e dispara bolas de fogo. */
  private openCore(done: () => void) {
    const gs = this.gs;
    this.open = true;
    this.setWeak(this.coreZone, true);
    gs.tweens.add({ targets: this.shutterL, x: this.cx - 44, duration: 250 });
    gs.tweens.add({ targets: this.shutterR, x: this.cx + 44, duration: 250 });
    const shots = this.phase2 ? 5 : 3;
    for (let i = 0; i < shots; i++) {
      gs.time.delayedCall(500 + i * 450, () => {
        if (this.dying) return;
        const p = gs.player;
        const a = Phaser.Math.Angle.Between(this.cx, this.cy, p.x, p.y - 6);
        const s = gs.add.image(this.cx, this.cy, 'blob').setScale(1.4).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        this.balls.push({ s, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, until: gs.time.now + 3000 });
      });
    }
    gs.time.delayedCall(this.phase2 ? 3000 : 3600, () => {
      this.open = false;
      this.setWeak(this.coreZone, false);
      gs.tweens.add({ targets: this.shutterL, x: this.cx - 15, duration: 200 });
      gs.tweens.add({ targets: this.shutterR, x: this.cx + 15, duration: 200 });
      done();
    });
  }

  private updateBalls(time: number, dt: number) {
    for (const b of this.balls) {
      b.s.x += b.vx * dt;
      b.s.y += b.vy * dt;
      if (this.playerTouches(new Phaser.Geom.Rectangle(b.s.x - 6, b.s.y - 6, 12, 12))) {
        this.gs.hurtPlayer(1, b.s.x);
        b.until = 0;
      }
      if (time > b.until || b.s.y > GROUND_Y) {
        b.s.destroy();
        b.until = -1;
      }
    }
    this.balls = this.balls.filter((b) => b.until >= 0);
  }

  private layoutArm(a: Arm) {
    a.trolley.x = a.x;
    a.shaft.setPosition(a.x, RAIL_Y + 6);
    a.shaft.height = Math.max(4, a.y - RAIL_Y - 20);
    a.hammer.setPosition(a.x, a.y);
    a.zone.setPosition(a.x, a.y + 2);
  }

  protected bounds() {
    return new Phaser.Geom.Rectangle(this.body.x - 80, GROUND_Y - 190, 160, 180);
  }

  protected flash() {
    this.core.setTintFill(0xffffff);
    this.gs.time.delayedCall(50, () => this.core.active && this.core.clearTint());
  }

  protected onPhase2() {
    this.gs.spawnEnemy('hunter', this.arenaX + 30, undefined, true);
    this.gs.spawnEnemy('exterminator', this.arenaX + 160, undefined, true);
    this.coreGlow.setTint(0xff3a2a);
  }

  protected cleanup() {
    [this.body, this.core, this.coreGlow, this.shutterL, this.shutterR].forEach((o) => o.destroy());
    for (const a of this.arms) {
      [a.trolley, a.shaft, a.marker].forEach((o) => o.destroy());
      // o martelo cai no chão
      this.gs.tweens.add({ targets: a.hammer, y: HAMMER_DOWN, angle: Phaser.Math.Between(-20, 20), duration: 500, ease: 'Bounce.easeOut' });
    }
    this.blobs.forEach((b) => b.s.destroy());
    this.balls.forEach((b) => b.s.destroy());
    this.fires.forEach((f) => f.s.destroy());
  }
}
