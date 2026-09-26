import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y } from '../config';
import { explosion } from '../gfx/effects';
import type { GameScene } from '../scenes/GameScene';
import { Boss, HurtZone } from './Boss';

const THIGH = 40;
const SHIN = 46;
const HIP_H = 72; // altura do quadril em relação ao chão
const STRIDE = 34;

type Img = Phaser.GameObjects.Image;

interface Leg { thigh: Img; shin: Img; foot: Img; knee: Img; footX: number; lift: number; stepping: boolean }
interface Missile { s: Img; marker?: Img; x: number; phase: 'up' | 'wait' | 'down'; t: number }
interface Wave { s: Img; vx: number; until: number }

/** MISSÃO 1 — Sentinela: mecha bípede de patrulha com metralhadora, mísseis e pisão. */
export class Sentinel extends Boss {
  private x: number;
  private y = -200; // entra caindo do céu
  private vy = 0;
  private facing = -1;
  private targetX: number;
  private hipY = GROUND_Y - HIP_H;
  private crouch = 0;
  private speed = 45;
  private busy = true;
  private nextAttack = 0;
  private gunFiring = false;
  private hull: Img;
  private gun: Phaser.GameObjects.Sprite;
  private pod: Img;
  private legs: Leg[];
  private hullZone: HurtZone;
  /** Quadril e coxas: alcançáveis pelos tiros retos do herói. */
  private legZone: HurtZone;
  private missiles: Missile[] = [];
  private waves: Wave[] = [];
  private visor: Img;

  constructor(gs: GameScene, arenaX: number, hp: number) {
    super(gs, 'SENTINELA S-01', hp, arenaX);
    this.x = arenaX + 380;
    this.targetX = this.x;
    const d = 5;
    const mkLeg = (tint: number): Leg => ({
      thigh: gs.add.image(0, 0, 'sent_thigh').setOrigin(0.5, 0).setDepth(d).setTint(tint),
      shin: gs.add.image(0, 0, 'sent_shin').setOrigin(0.5, 0).setDepth(d).setTint(tint),
      knee: gs.add.image(0, 0, 'sent_joint').setDepth(d + 0.1).setTint(tint),
      foot: gs.add.image(0, 0, 'sent_foot').setOrigin(0.5, 1).setDepth(d).setTint(tint),
      footX: this.x,
      lift: 0,
      stepping: false,
    });
    this.legs = [mkLeg(0x8890a0), mkLeg(0xffffff)];
    this.legs[0].footX = this.x + 14;
    this.legs[1].footX = this.x - 14;
    this.hull = gs.add.image(0, 0, 'sent_hull').setDepth(d + 0.2);
    this.pod = gs.add.image(0, 0, 'sent_pod').setDepth(d + 0.3);
    this.gun = gs.add.sprite(0, 0, 'sent_gun', 0).setOrigin(0, 0.5).setDepth(d + 0.3);
    this.visor = gs.add.image(0, 0, 'eye_glow').setScale(2.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.4);
    this.hullZone = this.addZone(86, 50, true);
    this.legZone = this.addZone(54, 52, true);
    this.layout(0);
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    const p = this.gs.player;

    // queda inicial
    if (this.y < this.hipY) {
      this.vy += 900 * dt;
      this.y = Math.min(this.hipY, this.y + this.vy * dt);
      if (this.y >= this.hipY) {
        this.gs.cameras.main.shake(300, 0.015);
        this.gs.dust(this.x - 30, GROUND_Y, 1.4);
        this.gs.dust(this.x + 30, GROUND_Y, 1.4);
        this.spawnWaves(0.8);
        this.nextAttack = time + 900;
        this.busy = false;
      }
      this.layout(time);
      return;
    }
    if (this.dying) {
      this.layout(time);
      return;
    }

    if (!this.busy) {
      this.facing = p.x < this.x ? -1 : 1;
      if (Math.abs(this.targetX - this.x) < 6) {
        // escolhe uma nova posição mantendo distância do herói
        const left = this.arenaX + 70;
        const right = this.arenaX + GAME_WIDTH - 70;
        const away = p.x < this.arenaX + GAME_WIDTH / 2 ? right - Phaser.Math.Between(0, 120) : left + Phaser.Math.Between(0, 120);
        this.targetX = Phaser.Math.Clamp(away, left, right);
      }
      this.x += Math.sign(this.targetX - this.x) * Math.min(Math.abs(this.targetX - this.x), this.speed * dt);
      if (time > this.nextAttack) this.attack(time);
    }

    this.walkLegs(dt);
    this.updateMissiles(time, dt);
    this.updateWaves(time, dt);
    this.layout(time);

    // contato com o casco e os pés
    const hull = this.hullZone.getBounds();
    if (this.playerTouches(hull)) this.gs.hurtPlayer(1, this.x);
    for (const l of this.legs) {
      if (this.playerTouches(new Phaser.Geom.Rectangle(l.footX - 14, GROUND_Y - 12 - l.lift, 28, 12))) this.gs.hurtPlayer(1, l.footX);
    }
  }

  // ------------------------------------------------------------ ataques

  private attack(time: number) {
    this.busy = true;
    const options = ['burst', 'missiles', 'stomp'] as const;
    const pick = options[Math.floor(Math.random() * options.length)];
    const done = (pause: number) => {
      this.busy = false;
      this.nextAttack = this.gs.time.now + pause * (this.phase2 ? 0.6 : 1);
    };
    if (pick === 'burst') this.burst(() => done(1200));
    else if (pick === 'missiles') this.launchMissiles(() => done(1400));
    else this.stomp(() => done(1300));
    void time;
  }

  /** Rajada: canos brilham (aviso) e disparam plasma no herói. */
  private burst(done: () => void) {
    const gs = this.gs;
    const warn = gs.add.image(0, 0, 'eye_glow').setScale(2).setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    const follow = gs.time.addEvent({ delay: 16, loop: true, callback: () => warn.setPosition(this.gunTip().x, this.gunTip().y).setAlpha(Math.random()) });
    const shots = this.phase2 ? 14 : 10;
    gs.time.delayedCall(this.phase2 ? 380 : 600, () => {
      follow.remove();
      warn.destroy();
      if (this.dying) return;
      this.gunFiring = true;
      for (let i = 0; i < shots; i++) {
        gs.time.delayedCall(i * 85, () => {
          if (this.dying) return;
          const tip = this.gunTip();
          const p = gs.player;
          const a = Phaser.Math.Angle.Between(tip.x, tip.y, p.x, p.y - 4) + Phaser.Math.FloatBetween(-0.12, 0.12);
          gs.spawnEnemyBullet(tip.x, tip.y, a, 230);
          this.gun.setFrame(i % 2);
        });
      }
      gs.time.delayedCall(shots * 85 + 100, () => {
        this.gunFiring = false;
        done();
      });
    });
  }

  /** Mísseis: sobem, alvos piscam no chão e caem explodindo. */
  private launchMissiles(done: () => void) {
    const gs = this.gs;
    const n = this.phase2 ? 6 : 4;
    for (let i = 0; i < n; i++) {
      gs.time.delayedCall(i * 140, () => {
        if (this.dying) return;
        const s = gs.add.image(this.pod.x, this.pod.y - 6, 'missile').setDepth(7);
        gs.dust(this.pod.x, this.pod.y, 0.5);
        const spread = i === 0 ? 0 : Phaser.Math.Between(-110, 110);
        const tx = Phaser.Math.Clamp(gs.player.x + spread, this.arenaX + 20, this.arenaX + GAME_WIDTH - 20);
        this.missiles.push({ s, x: tx, phase: 'up', t: 0 });
      });
    }
    gs.time.delayedCall(n * 140 + 1900, done);
  }

  private updateMissiles(time: number, dt: number) {
    for (const m of this.missiles) {
      m.t += dt;
      if (m.phase === 'up') {
        m.s.y -= 420 * dt;
        if (m.s.y < -30) {
          m.phase = 'wait';
          m.t = 0;
          m.marker = this.gs.add.image(m.x, GROUND_Y - 2, 'target_marker').setDepth(7);
        }
      } else if (m.phase === 'wait') {
        m.marker!.setAlpha(Math.floor(time / 90) % 2 ? 1 : 0.3);
        if (m.t > 0.8) {
          m.phase = 'down';
          m.s.setPosition(m.x, -30).setFlipY(true);
        }
      } else {
        m.s.y += 520 * dt;
        if (m.s.y >= GROUND_Y - 8) {
          explosion(this.gs, m.x, GROUND_Y - 6, 0.8);
          this.gs.cameras.main.shake(80, 0.005);
          const p = this.gs.player;
          if (Math.abs(p.x - m.x) < 26 && p.body.bottom > GROUND_Y - 40) this.gs.hurtPlayer(1, m.x);
          m.marker?.destroy();
          m.s.destroy();
          m.phase = 'up';
          m.t = -1;
        }
      }
    }
    this.missiles = this.missiles.filter((m) => m.t >= 0);
  }

  /** Pisão: agacha, salta em direção ao herói e solta ondas de choque ao cair. */
  private stomp(done: () => void) {
    const gs = this.gs;
    gs.tweens.add({
      targets: this,
      crouch: 12,
      duration: this.phase2 ? 250 : 400,
      onComplete: () => {
        if (this.dying) return;
        const startX = this.x;
        const endX = Phaser.Math.Clamp(gs.player.x, this.arenaX + 70, this.arenaX + GAME_WIDTH - 70);
        const jump = { t: 0 };
        gs.tweens.add({
          targets: jump,
          t: 1,
          duration: 700,
          onUpdate: () => {
            this.x = Phaser.Math.Linear(startX, endX, jump.t);
            this.crouch = -Math.sin(jump.t * Math.PI) * 70;
            this.legs.forEach((l, i) => (l.footX = this.x + (i ? -14 : 14)));
          },
          onComplete: () => {
            this.crouch = 8;
            this.targetX = this.x;
            gs.cameras.main.shake(250, 0.014);
            gs.dust(this.x - 30, GROUND_Y, 1.4);
            gs.dust(this.x + 30, GROUND_Y, 1.4);
            this.spawnWaves(1);
            gs.tweens.add({ targets: this, crouch: 0, duration: 300, onComplete: done });
          },
        });
      },
    });
  }

  private spawnWaves(scale: number) {
    for (const dir of [-1, 1]) {
      const s = this.gs.add.image(this.x + dir * 20, GROUND_Y, 'shockwave').setOrigin(0.5, 1).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(7);
      this.waves.push({ s, vx: dir * (this.phase2 ? 280 : 220), until: this.gs.time.now + 1600 });
    }
  }

  private updateWaves(time: number, dt: number) {
    for (const w of this.waves) {
      w.s.x += w.vx * dt;
      w.s.setAlpha(0.7 + Math.random() * 0.3);
      const p = this.gs.player;
      if (Math.abs(p.x - w.s.x) < 16 && p.body.bottom >= GROUND_Y - 6) this.gs.hurtPlayer(1, w.s.x - w.vx);
      if (time > w.until) {
        w.s.destroy();
        w.until = -1;
      }
    }
    this.waves = this.waves.filter((w) => w.until >= 0);
  }

  // ------------------------------------------------------------ corpo

  /** Passos: um pé por vez vai para frente quando o quadril se afasta demais. */
  private walkLegs(dt: number) {
    const stepping = this.legs.some((l) => l.stepping);
    for (const l of this.legs) {
      const home = this.x + (l === this.legs[0] ? 14 : -14);
      if (!stepping && !l.stepping && Math.abs(home - l.footX) > STRIDE / 2) {
        l.stepping = true;
        const from = l.footX;
        const to = home + Math.sign(home - from) * (STRIDE / 3);
        const s = { t: 0 };
        this.gs.tweens.add({
          targets: s,
          t: 1,
          duration: 260,
          onUpdate: () => {
            l.footX = Phaser.Math.Linear(from, to, s.t);
            l.lift = Math.sin(s.t * Math.PI) * 12;
          },
          onComplete: () => {
            l.stepping = false;
            l.lift = 0;
            this.gs.cameras.main.shake(60, 0.003);
            this.gs.dust(l.footX, GROUND_Y, 0.6);
          },
        });
      }
    }
    void dt;
  }

  private gunTip() {
    return { x: this.gun.x + this.facing * 46, y: this.gun.y };
  }

  private layout(time: number) {
    const bob = Math.sin(time / 180) * 1.5;
    const hipY = Math.min(this.y, this.hipY) + this.crouch + bob;
    const f = this.facing;
    this.hull.setPosition(this.x, hipY - 28).setFlipX(f < 0);
    this.visor.setPosition(this.x + f * 34, hipY - 29).setAlpha(0.6 + Math.sin(time / 120) * 0.3);
    this.pod.setPosition(this.x - f * 22, hipY - 60).setFlipX(f < 0);
    this.gun
      .setPosition(this.x + f * 26, hipY - 6)
      .setFlipX(f < 0)
      .setOrigin(f < 0 ? 1 : 0, 0.5);
    if (!this.gunFiring) this.gun.setFrame(0);
    this.hullZone.setPosition(this.x, hipY - 26);
    this.legZone.setPosition(this.x, hipY + 24);

    const airborne = this.y < this.hipY || this.crouch < -2;
    this.legs.forEach((l, i) => {
      const hipX = this.x + (i ? -8 : 8) * f;
      const hip = new Phaser.Math.Vector2(hipX, hipY - 2);
      const ankle = new Phaser.Math.Vector2(airborne ? hipX + f * 6 : l.footX, airborne ? hipY + 70 : GROUND_Y - 10 - l.lift);
      // joelho dobra para trás (perna digitígrada)
      const d = Math.min(Phaser.Math.Distance.BetweenPoints(hip, ankle), THIGH + SHIN - 1);
      const a = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
      const b = Math.acos((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d));
      const knee = new Phaser.Math.Vector2(hip.x + Math.cos(a + b * f) * THIGH, hip.y + Math.sin(a + b * f) * THIGH);
      l.thigh.setPosition(hip.x, hip.y).setRotation(Math.atan2(knee.y - hip.y, knee.x - hip.x) - Math.PI / 2);
      l.shin.setPosition(knee.x, knee.y).setRotation(Math.atan2(ankle.y - knee.y, ankle.x - knee.x) - Math.PI / 2);
      l.knee.setPosition(knee.x, knee.y);
      l.foot.setPosition(ankle.x, ankle.y + 10).setFlipX(f < 0);
    });
  }

  protected bounds() {
    return new Phaser.Geom.Rectangle(this.x - 50, this.hipY - 60, 100, 120);
  }

  protected flash() {
    for (const o of [this.hull, this.pod, this.gun]) {
      o.setTintFill(0xffffff);
      this.gs.time.delayedCall(50, () => o.active && o.clearTint());
    }
  }

  protected onPhase2() {
    this.speed = 70;
    this.gs.spawnEnemy('hunter', this.arenaX + 40, undefined, true);
    this.gs.spawnEnemy('hunter', this.arenaX + GAME_WIDTH - 40, undefined, true);
    this.visor.setTint(0xff2a2a);
  }

  protected cleanup() {
    for (const l of this.legs) [l.thigh, l.shin, l.foot, l.knee].forEach((o) => o.destroy());
    [this.hull, this.gun, this.pod, this.visor].forEach((o) => o.destroy());
    this.missiles.forEach((m) => {
      m.s.destroy();
      m.marker?.destroy();
    });
    this.waves.forEach((w) => w.s.destroy());
  }
}
