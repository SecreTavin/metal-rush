import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Controls } from '../input/Controls';
import { WEAPONS, WeaponDef, WeaponKey } from './weapons';
import { HERO_BOB } from '../gfx/art/heroFx';

const SPEED = 110;
const JUMP_VELOCITY = -360;
const TAP_FIRE_DELAY = 90;
const START_BOMBS = 10;
/** Ombro em relação ao centro do quadro (virado para a direita). */
const SHOULDER = { x: 1, y: -1 };
/** Distância do ombro até a borda da tela do MacBook. */
const LAPTOP_REACH = 25;
const MELEE_DURATION = 170;
/** Na mira para cima o MacBook inclina para frente para não cobrir o rosto. */
const UP_TILT = 0.45;

type Aim = 'forward' | 'up' | 'down';

/**
 * Personagem principal: dev de moletom com óculos inteligentes e um MacBook como arma.
 * O corpo é um spritesheet ('hero'); o braço + MacBook é uma peça separada que gira para mirar.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing = 1;
  aim: Aim = 'forward';
  weapon: WeaponDef = WEAPONS.code;
  ammo = Infinity;
  bombs = START_BOMBS;
  dead = false;
  invulnerableUntil = 0;

  private lastShot = 0;
  private flashUntil = 0;
  private meleeStart = -Infinity;
  private wasOnGround = true;
  private nextDust = 0;
  private nextTrail = 0;
  private laptop: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Sprite;
  private scan: Phaser.GameObjects.Image;

  constructor(
    private gs: GameScene,
    x: number,
    y: number,
    private controls: Controls,
  ) {
    super(gs, x, y, 'hero', 0);
    gs.add.existing(this);
    gs.physics.add.existing(this);
    this.body.setSize(12, 36).setOffset(10, 11);
    this.setDepth(10);

    this.aura = gs.add.image(x, y, 'hero_aura').setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    gs.tweens.add({ targets: this.aura, alpha: { from: 0.55, to: 1 }, scale: { from: 0.95, to: 1.05 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ring = gs.add.sprite(x, y, 'hero_ring').setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    this.ring.play('hero_ring');
    this.scan = gs.add.image(x, y, 'scanline').setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    gs.time.addEvent({ delay: 2200, loop: true, callback: () => this.sweepScanline() });

    this.laptop = gs.add.image(x, y, 'hero_laptop', 0).setOrigin(1 / 28, 8.5 / 16).setDepth(11);
  }

  update(time: number) {
    this.followEffects(time);
    if (this.dead) {
      this.setVelocityX(this.body.velocity.x * 0.95);
      return;
    }

    const c = this.controls;
    const onGround = this.body.blocked.down || this.body.touching.down;

    let dir = 0;
    if (c.isDown('left')) dir -= 1;
    if (c.isDown('right')) dir += 1;
    if (dir) this.facing = dir;
    this.setVelocityX(dir * SPEED);

    const feet = this.body.bottom;
    if (onGround && !this.wasOnGround) this.gs.dust(this.x, feet, 1);
    if (onGround && dir && time > this.nextDust) {
      this.gs.dust(this.x - this.facing * 6, feet, 0.6);
      this.nextDust = time + 260;
    }
    if (onGround && c.justDown('jump')) {
      this.setVelocityY(JUMP_VELOCITY);
      this.gs.dust(this.x, feet, 0.8);
    }
    this.wasOnGround = onGround;

    this.aim = c.isDown('up') ? 'up' : c.isDown('down') && !onGround ? 'down' : 'forward';
    this.setFlipX(this.facing < 0);

    if (!onGround) this.anims.play(this.body.velocity.y < 0 ? 'hero-jump' : 'hero-fall', true);
    else if (dir) this.anims.play('hero-run', true);
    else this.anims.play('hero-idle', true);

    // Rastro holográfico ao se mover
    if ((dir || !onGround) && time > this.nextTrail) {
      this.gs.afterimage(this);
      this.nextTrail = time + 70;
    }

    const tapped = c.justDown('shoot');
    const since = time - this.lastShot;
    if ((tapped && since > TAP_FIRE_DELAY) || (c.isDown('shoot') && since > this.weapon.fireRate)) {
      this.attack(time);
    }

    if (c.justDown('grenade') && this.bombs > 0) {
      this.bombs--;
      this.gs.throwGrenade(this.x + this.facing * 8, this.y - 10, this.facing, this.body.velocity.x);
    }

    const blinking = time < this.invulnerableUntil && Math.floor(time / 70) % 2 === 1;
    this.setAlpha(blinking ? 0.35 : 1);
    this.laptop.setAlpha(this.alpha);
    this.updateLaptop(time);
  }

  // ---------- MacBook ----------

  private aimVector() {
    if (this.aim === 'up') return { x: 0, y: -1 };
    if (this.aim === 'down') return { x: 0, y: 1 };
    return { x: this.facing, y: 0 };
  }

  private pivot() {
    const frame = Number(this.frame.name) || 0;
    const bob = HERO_BOB[frame] ?? 0;
    const upShift = this.aim === 'up' ? { x: 4, y: -3 } : { x: 0, y: 0 };
    return {
      x: this.x + (SHOULDER.x + upShift.x) * this.facing,
      y: this.y + SHOULDER.y + bob + upShift.y,
    };
  }

  /** Ângulo em que o MacBook é desenhado (pode diferir da direção do tiro). */
  private laptopAngle() {
    const d = this.aimVector();
    const angle = Math.atan2(d.y, d.x);
    return this.aim === 'up' ? angle + this.facing * UP_TILT : angle;
  }

  private updateLaptop(time: number) {
    const p = this.pivot();
    let angle = this.laptopAngle();

    // Golpe com o MacBook: arco de cima para baixo
    const t = (time - this.meleeStart) / MELEE_DURATION;
    if (t >= 0 && t <= 1) angle += this.facing * Phaser.Math.DegToRad(-120 + 150 * Phaser.Math.Easing.Cubic.Out(t));

    // Recuo curto após o disparo
    const recoil = time < this.flashUntil ? 2 : 0;
    const frame = time < this.flashUntil ? 1 : this.weapon.laptopFrame;
    this.laptop
      .setFrame(frame)
      .setPosition(p.x - Math.cos(angle) * recoil, p.y - Math.sin(angle) * recoil)
      .setRotation(angle)
      .setFlipY(this.facing < 0)
      .setVisible(!this.dead);
  }

  private attack(time: number) {
    this.lastShot = time;

    // Inimigo colado: golpe com o MacBook
    if (this.aim === 'forward') {
      const target = this.gs.enemyInMeleeRange(this.x, this.y, this.facing);
      if (target) {
        this.meleeStart = time;
        this.gs.meleeSlash(this.x + this.facing * 18, this.y - 4, this.facing);
        target.hit(3);
        return;
      }
    }

    const d = this.aimVector();
    const p = this.pivot();
    const angle = Math.atan2(d.y, d.x) + Phaser.Math.FloatBetween(-this.weapon.spread, this.weapon.spread);
    const visual = this.laptopAngle();
    const tip = { x: p.x + Math.cos(visual) * LAPTOP_REACH, y: p.y + Math.sin(visual) * LAPTOP_REACH };
    this.gs.spawnPlayerBullet(tip.x, tip.y, angle, this.weapon);
    this.gs.emitBits(p.x + d.x * 14, p.y + d.y * 14 - 3, this.weapon.bitsTint);
    this.flashUntil = time + 60;

    if (this.ammo !== Infinity && --this.ammo <= 0) this.setWeapon('code');
  }

  setWeapon(key: WeaponKey) {
    this.weapon = WEAPONS[key];
    this.ammo = this.weapon.ammo;
  }

  // ---------- Aura / efeitos cibernéticos ----------

  private followEffects(time: number) {
    this.aura.setPosition(this.x, this.y + 2).setVisible(!this.dead);
    this.ring.setPosition(this.x, this.body.bottom).setVisible(!this.dead);
    if (this.scan.alpha > 0) this.scan.x = this.x;
    // cor da aura acompanha a arma
    this.aura.setTint(this.weapon === WEAPONS.overclock ? 0xff8cf5 : 0xffffff);
    if (time < this.invulnerableUntil) this.ring.setAlpha(0.4);
    else this.ring.setAlpha(0.8);
  }

  private sweepScanline() {
    if (this.dead) return;
    const top = this.body.top;
    const bottom = this.body.bottom;
    this.scan.setPosition(this.x, bottom).setAlpha(0.9);
    this.gs.tweens.add({ targets: this.scan, y: top - 4, duration: 380, ease: 'Sine.easeIn', onComplete: () => this.scan.setAlpha(0) });
  }

  // ---------- Vida ----------

  isVulnerable(time: number) {
    return !this.dead && time >= this.invulnerableUntil;
  }

  die() {
    this.dead = true;
    this.setVelocity(-this.facing * 80, -220);
    this.setTint(0xff5aff);
    this.anims.play('hero-hurt');
    this.laptop.setVisible(false);
    this.gs.glitchBurst(this.x, this.y);
  }

  respawn(x: number, y: number, time: number) {
    this.dead = false;
    this.clearTint();
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.invulnerableUntil = time + 2500;
    this.setWeapon('code');
    this.bombs = Math.max(this.bombs, START_BOMBS);
    this.gs.teleportBeam(x);
  }

  destroy(fromScene?: boolean) {
    this.laptop?.destroy();
    this.aura?.destroy();
    this.ring?.destroy();
    this.scan?.destroy();
    super.destroy(fromScene);
  }
}
