import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Controls } from '../input/Controls';
import { WEAPONS, WeaponDef, WeaponKey } from './weapons';

const SPEED = 110;
const JUMP_VELOCITY = -360;
const TAP_FIRE_DELAY = 90;
const START_BOMBS = 10;

type Aim = 'forward' | 'up' | 'down';

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing = 1;
  aim: Aim = 'forward';
  weapon: WeaponDef = WEAPONS.pistol;
  ammo = Infinity;
  bombs = START_BOMBS;
  dead = false;
  invulnerableUntil = 0;

  private lastShot = 0;
  private gun: Phaser.GameObjects.Image;

  constructor(
    private gs: GameScene,
    x: number,
    y: number,
    private controls: Controls,
  ) {
    super(gs, x, y, 'player', 0);
    gs.add.existing(this);
    gs.physics.add.existing(this);
    this.body.setSize(14, 30).setOffset(9, 6);
    this.setDepth(10);
    this.gun = gs.add.image(x, y, this.weapon.texture).setOrigin(0.1, 0.5).setDepth(11);
  }

  update(time: number) {
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

    if (onGround && c.justDown('jump')) this.setVelocityY(JUMP_VELOCITY);

    this.aim = c.isDown('up') ? 'up' : c.isDown('down') && !onGround ? 'down' : 'forward';
    this.setFlipX(this.facing < 0);

    if (!onGround) this.anims.play('player-jump', true);
    else if (dir) this.anims.play('player-run', true);
    else this.anims.play('player-idle', true);

    this.updateGun();

    const tapped = c.justDown('shoot');
    const since = time - this.lastShot;
    if ((tapped && since > TAP_FIRE_DELAY) || (c.isDown('shoot') && since > this.weapon.fireRate)) {
      this.shoot(time);
    }

    if (c.justDown('grenade') && this.bombs > 0) {
      this.bombs--;
      this.gs.throwGrenade(this.x + this.facing * 8, this.y - 8, this.facing, this.body.velocity.x);
    }

    const blinking = time < this.invulnerableUntil && Math.floor(time / 70) % 2 === 1;
    this.setAlpha(blinking ? 0.35 : 1);
    this.gun.setAlpha(this.alpha);
  }

  private aimVector() {
    if (this.aim === 'up') return { x: 0, y: -1 };
    if (this.aim === 'down') return { x: 0, y: 1 };
    return { x: this.facing, y: 0 };
  }

  private updateGun() {
    const d = this.aimVector();
    const ox = this.aim === 'forward' ? this.facing * 2 : this.facing * 5;
    const oy = this.aim === 'up' ? -6 : 1;
    this.gun
      .setPosition(this.x + ox, this.y + oy)
      .setRotation(Math.atan2(d.y, d.x))
      .setFlipY(this.facing < 0)
      .setVisible(true);
  }

  private shoot(time: number) {
    this.lastShot = time;

    // Faca: inimigo colado na frente => ataque corpo a corpo.
    if (this.aim === 'forward') {
      const target = this.gs.enemyInMeleeRange(this.x, this.y, this.facing);
      if (target) {
        this.gs.meleeSlash(this.x + this.facing * 16, this.y, this.facing);
        target.hit(3);
        return;
      }
    }

    const d = this.aimVector();
    const len = this.gun.displayWidth * 0.9;
    const angle = Math.atan2(d.y, d.x) + Phaser.Math.FloatBetween(-this.weapon.spread, this.weapon.spread);
    this.gs.spawnPlayerBullet(this.gun.x + d.x * len, this.gun.y + d.y * len, angle, this.weapon);

    if (this.ammo !== Infinity && --this.ammo <= 0) this.setWeapon('pistol');
  }

  setWeapon(key: WeaponKey) {
    this.weapon = WEAPONS[key];
    this.ammo = this.weapon.ammo;
    this.gun.setTexture(this.weapon.texture);
  }

  isVulnerable(time: number) {
    return !this.dead && time >= this.invulnerableUntil;
  }

  die() {
    this.dead = true;
    this.setVelocity(-this.facing * 80, -220);
    this.setTint(0xff6060);
    this.anims.play('player-jump');
    this.gun.setVisible(false);
  }

  respawn(x: number, y: number, time: number) {
    this.dead = false;
    this.clearTint();
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.invulnerableUntil = time + 2500;
    this.setWeapon('pistol');
    this.bombs = Math.max(this.bombs, START_BOMBS);
  }
}
