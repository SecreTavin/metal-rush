import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Action, Controls } from '../input/Controls';
import { Arsenal } from './Arsenal';
import { WEAPONS, WeaponDef, WeaponKey } from './weapons';
import { HERO_BOB } from '../gfx/art/heroFx';

const SPEED = 110;
const JUMP_VELOCITY = -360;
const TAP_FIRE_DELAY = 90;
/** Ombro em relação ao centro do quadro (virado para a direita). */
const SHOULDER = { x: 1, y: -1 };
/** Distância do ombro até a borda da tela do MacBook. */
const LAPTOP_REACH = 25;
const MELEE_DURATION = 170;
/** Na mira para cima o MacBook inclina para frente para não cobrir o rosto. */
const UP_TILT = 0.45;
const HURT_INVULNERABILITY = 1200;
const DASH_TIME = 190;
const DASH_SPEED = 380;
const DASH_COOLDOWN = 650;
/** Intervalo do golpe da arma secundária (MacBook, por enquanto). */
const BASH_COOLDOWN = 380;

type Aim = 'forward' | 'up' | 'down';

/**
 * Personagem principal: dev de moletom com óculos inteligentes e um MacBook como arma.
 * O corpo é um spritesheet ('hero'); o braço + MacBook é uma peça separada que gira para mirar.
 * Vida, pendrives e skills vêm da run atual (gs.run).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing = 1;
  aim: Aim = 'forward';
  weapon: WeaponDef = WEAPONS.code;
  ammo = Infinity;
  dead = false;
  invulnerableUntil = 0;
  /** Quando o escudo Firewall volta a ficar pronto. */
  shieldReadyAt = 0;

  private lastShot = 0;
  private flashUntil = 0;
  private meleeStart = -Infinity;
  private nextSecondary = 0;
  private wasOnGround = true;
  private jumpsLeft = 1;
  private dashUntil = 0;
  private nextDash = 0;
  private nextDust = 0;
  private nextTrail = 0;
  private laptop: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Sprite;
  private scan: Phaser.GameObjects.Image;
  private shield: Phaser.GameObjects.Image;
  /** Escudo, chicote, bumerangue, skills ativas e seus visuais. */
  arsenal: Arsenal;

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
    this.shield = gs.add.image(x, y, 'shield_bubble').setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

    this.laptop = gs.add.image(x, y, 'hero_laptop', 0).setOrigin(1 / 28, 8.5 / 16).setDepth(11);
    this.arsenal = new Arsenal(gs, this);
  }

  private get stats() {
    return this.gs.run.stats;
  }

  update(time: number, delta: number) {
    this.followEffects(time);
    if (this.dead) {
      this.setVelocityX(this.body.velocity.x * 0.95);
      this.updateLaptop(time);
      return;
    }

    const c = this.controls;
    const onGround = this.body.blocked.down || this.body.touching.down;
    const dashing = time < this.dashUntil;

    let dir = 0;
    if (c.isDown('left')) dir -= 1;
    if (c.isDown('right')) dir += 1;
    if (dir && !dashing) this.facing = dir;

    // Esquiva (skill Rollback): disparo rápido e invencível na direção do olhar
    if (this.stats.dash && c.justDown('dash') && time > this.nextDash) {
      this.dashUntil = time + DASH_TIME;
      this.nextDash = time + DASH_COOLDOWN;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, time + DASH_TIME + 60);
      this.body.setAllowGravity(false);
      this.setVelocityY(0);
      this.gs.dust(this.x - this.facing * 8, this.body.bottom, 0.8);
    }
    if (dashing) {
      this.setVelocityX(this.facing * DASH_SPEED);
      if (time > this.nextTrail - 50) {
        this.gs.afterimage(this);
        this.nextTrail = time + 25;
      }
    } else {
      if (!this.body.allowGravity) this.body.setAllowGravity(true);
      this.setVelocityX(dir * SPEED * this.arsenal.speedMul);
    }

    const feet = this.body.bottom;
    if (onGround) this.jumpsLeft = this.stats.doubleJump ? 2 : 1;
    if (onGround && !this.wasOnGround) this.gs.dust(this.x, feet, 1);
    if (onGround && dir && time > this.nextDust) {
      this.gs.dust(this.x - this.facing * 6, feet, 0.6);
      this.nextDust = time + 260;
    }
    if (c.justDown('jump') && !dashing) {
      if (onGround) {
        this.setVelocityY(JUMP_VELOCITY);
        this.jumpsLeft = this.stats.doubleJump ? 1 : 0;
        this.gs.dust(this.x, feet, 0.8);
      } else if (this.jumpsLeft > 0 && this.stats.doubleJump) {
        // pulo duplo: pequeno anel de energia sob os pés
        this.jumpsLeft = 0;
        this.setVelocityY(JUMP_VELOCITY * 0.9);
        this.gs.jumpRing(this.x, feet);
      }
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

    // Armas: slot 1 = clique esquerdo / J / Z, slot 2 = clique direito / U / V.
    // Escudo, chicote, Raspberry e skills (Q / E) ficam no Arsenal.
    this.arsenal.update(time, delta, c);
    const weapons = this.gs.run.loadout.weapons;
    const slots: Action[] = ['primary', 'secondary'];
    if (!this.arsenal.blocking) {
      weapons.forEach((w, i) => w === 'macbook' && this.fireMacbook(slots[i], time));
      // slot 2 vazio: golpe com o MacBook
      if (weapons[1] === null && weapons[0] === 'macbook') {
        const secondary = c.justDown('secondary');
        if ((secondary || c.isDown('secondary')) && time > this.nextSecondary) this.bash(time);
      }
    }

    if (this.gs.run.loadout.grenade === 'pendrive' && c.justDown('grenade') && this.gs.run.bombs > 0) {
      this.gs.run.bombs--;
      this.gs.throwGrenade(this.x + this.facing * 8, this.y - 10, this.facing, this.body.velocity.x);
    }

    const blinking = time < this.invulnerableUntil && !dashing && Math.floor(time / 70) % 2 === 1;
    this.setAlpha(blinking ? 0.35 : 1);
    this.laptop.setAlpha(this.alpha);
    this.updateLaptop(time);
  }

  // ---------- MacBook ----------

  private fireMacbook(action: Action, time: number) {
    const c = this.controls;
    const tapped = c.justDown(action);
    const since = time - this.lastShot;
    const rate = this.weapon.fireRate * this.stats.fireRateMul;
    if ((tapped && since > TAP_FIRE_DELAY * this.stats.fireRateMul) || (c.isDown(action) && since > rate)) {
      this.attack(time);
    }
  }

  private aimVector() {
    if (this.aim === 'up') return { x: 0, y: -1 };
    if (this.aim === 'down') return { x: 0, y: 1 };
    return { x: this.facing, y: 0 };
  }

  pivot() {
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
      .setVisible(this.arsenal.draw(time));
  }

  private attack(time: number) {
    this.lastShot = time;
    const s = this.stats;

    // Inimigo colado: golpe com o MacBook
    if (this.aim === 'forward') {
      const target = this.gs.enemyInMeleeRange(this.x, this.y, this.facing, s.meleeRange);
      if (target) {
        this.meleeStart = time;
        this.gs.meleeSlash(this.x + this.facing * 18, this.y - 4, this.facing);
        target.hit(3 * s.meleeMul);
        return;
      }
      if (this.gs.bossMelee(this.x, this.y, this.facing, s.meleeRange, 3 * s.meleeMul)) {
        this.meleeStart = time;
        this.gs.meleeSlash(this.x + this.facing * 18, this.y - 4, this.facing);
        return;
      }
    }

    const d = this.aimVector();
    const p = this.pivot();
    const base = Math.atan2(d.y, d.x) + Phaser.Math.FloatBetween(-this.weapon.spread, this.weapon.spread);
    const visual = this.laptopAngle();
    const tip = { x: p.x + Math.cos(visual) * LAPTOP_REACH, y: p.y + Math.sin(visual) * LAPTOP_REACH };
    // Multithread: leque de projéteis
    const n = 1 + s.extraShots;
    for (let i = 0; i < n; i++) {
      const offset = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.24 * (n - 1);
      this.gs.spawnPlayerBullet(tip.x, tip.y, base + offset, this.weapon, i === 0);
    }
    this.gs.emitBits(p.x + d.x * 14, p.y + d.y * 14 - 3, this.weapon.bitsTint);
    this.flashUntil = time + 60;

    if (this.ammo !== Infinity && --this.ammo <= 0) this.setWeapon('code');
  }

  /**
   * Arma secundária provisória: golpe com o MacBook a qualquer momento (sem precisar
   * do inimigo colado). Será substituída pelo sistema de armas.
   */
  private bash(time: number) {
    const s = this.stats;
    this.nextSecondary = time + BASH_COOLDOWN;
    this.meleeStart = time;
    this.gs.meleeSlash(this.x + this.facing * 18, this.y - 4, this.facing);
    const range = s.meleeRange + 12;
    const damage = 3 * s.meleeMul;
    const target = this.gs.enemyInMeleeRange(this.x, this.y, this.facing, range);
    if (target) target.hit(damage);
    else this.gs.bossMelee(this.x, this.y, this.facing, range, damage);
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
    this.ring.setAlpha(time < this.invulnerableUntil ? 0.4 : 0.8);
    const shieldOn = this.stats.shieldCooldown !== null && time >= this.shieldReadyAt && !this.dead;
    this.shield.setVisible(shieldOn).setPosition(this.x, this.y + 1).setAlpha(0.5 + Math.sin(time / 150) * 0.2);
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

  /**
   * Recebe dano. Retorna true se o golpe contou (não estava invencível nem com escudo).
   * `fromX` empurra o herói para longe da fonte do dano.
   */
  hurt(amount: number, time: number, fromX?: number) {
    if (!this.isVulnerable(time)) return false;
    // Tá na hora de Morfar: imortal
    if (this.arsenal.immortal(time)) {
      this.invulnerableUntil = time + 300;
      this.gs.glitchBars(this.x, this.y, [0xff3b3b, 0xffd83a, 0x3a8cff]);
      return false;
    }
    // Escudo 144Hz erguido e o golpe veio da frente
    if (this.arsenal.tryBlock(fromX, time)) {
      this.invulnerableUntil = time + 250;
      this.setVelocityX(-this.facing * 90);
      return false;
    }
    const s = this.stats;
    if (s.shieldCooldown !== null && time >= this.shieldReadyAt) {
      this.shieldReadyAt = time + s.shieldCooldown;
      this.invulnerableUntil = time + 600;
      this.gs.shieldBreak(this.x, this.y);
      return false;
    }
    const run = this.gs.run;
    run.hp = Math.max(0, run.hp - amount);
    this.invulnerableUntil = time + HURT_INVULNERABILITY;
    const away = fromX === undefined ? -this.facing : Math.sign(this.x - fromX) || -this.facing;
    this.setVelocity(away * 140, -200);
    this.gs.glitchBurst(this.x, this.y);
    this.gs.cameras.main.shake(120, 0.006);
    this.setTintFill(0xff5aff);
    this.gs.time.delayedCall(80, () => this.active && !this.dead && this.clearTint());
    if (s.panic) this.gs.panicBlast(this.x, this.y);
    if (run.hp <= 0) this.die();
    return true;
  }

  die() {
    this.dead = true;
    this.body.setAllowGravity(true);
    this.setVelocity(-this.facing * 80, -220);
    this.setTint(0xff5aff);
    this.anims.play('hero-hurt');
    this.laptop.setVisible(false);
    this.gs.glitchBurst(this.x, this.y);
  }

  /** Volta a um ponto seguro (usado ao cair num buraco). */
  warpTo(x: number, y: number, time: number) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + 1500);
    this.gs.teleportBeam(x);
  }

  destroy(fromScene?: boolean) {
    this.laptop?.destroy();
    this.aura?.destroy();
    this.ring?.destroy();
    this.scan?.destroy();
    this.shield?.destroy();
    this.arsenal?.destroy();
    super.destroy(fromScene);
  }
}
