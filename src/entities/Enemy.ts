import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';
import type { EnemyDef } from './enemyTypes';

const MAX_AIM_ANGLE = 0.45;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  dying = false;
  facing = -1;
  private nextShot: number;
  private weapon?: Phaser.GameObjects.Image;

  constructor(
    private gs: GameScene,
    x: number,
    y: number,
    readonly def: EnemyDef,
  ) {
    super(gs, x, y, def.texture, 0);
    this.hp = def.hp;
    this.nextShot = gs.time.now + 1000;
    gs.add.existing(this);
    this.setDepth(9);
    if (def.weapon) this.weapon = gs.add.image(x, y, def.weapon).setOrigin(0.15, 0.5).setDepth(9);
  }

  /** Chamar depois de adicionar ao grupo de física (o grupo reseta o corpo). */
  setupBody() {
    this.body.setSize(14, 30).setOffset(9, 6);
  }

  update(time: number) {
    if (this.dying || !this.body || this.gs.state !== 'playing') return;

    const cam = this.gs.cameras.main;
    if (this.x < cam.scrollX - 120 || this.y > GAME_HEIGHT + 60) {
      this.destroy();
      return;
    }

    const p = this.gs.player;
    const dx = p.x - this.x;
    const dist = Math.abs(dx);
    const onGround = this.body.blocked.down;
    const onScreen = this.x < cam.scrollX + GAME_WIDTH - 8;
    let vx = 0;

    if (dist < this.def.range && !p.dead) {
      this.facing = Math.sign(dx) || this.facing;

      if (this.def.behavior === 'shooter') {
        if (dist > 170) vx = this.facing * this.def.speed;
        else if (dist < 90) vx = -this.facing * this.def.speed * 0.6;

        if (onScreen && onGround && time > this.nextShot) {
          this.shoot();
          this.nextShot = time + (this.def.fireRate ?? 2000) * Phaser.Math.FloatBetween(0.7, 1.3);
        }
      } else {
        vx = this.facing * this.def.speed;
      }
    }

    this.setVelocityX(vx);
    this.setFlipX(this.facing < 0);
    this.anims.play(`${this.def.texture}-${!onGround ? 'jump' : vx ? 'run' : 'idle'}`, true);
    this.weapon
      ?.setPosition(this.x + this.facing * 3, this.y + 2)
      .setRotation(this.facing < 0 ? Math.PI : 0)
      .setFlipY(this.facing < 0);
  }

  private shoot() {
    const p = this.gs.player;
    const mx = this.x + this.facing * 22;
    const my = this.y + 1;
    const base = this.facing > 0 ? 0 : Math.PI;
    const toPlayer = Phaser.Math.Angle.Between(mx, my, p.x, p.y - 4);
    const diff = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(toPlayer - base), -MAX_AIM_ANGLE, MAX_AIM_ANGLE);
    this.gs.spawnEnemyBullet(mx, my, base + diff, this.def.bulletSpeed ?? 150);
  }

  hit(damage: number) {
    if (this.dying) return;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.die();
      return;
    }
    this.setTintFill(0xffffff);
    this.gs.time.delayedCall(50, () => this.active && this.clearTint());
  }

  private die() {
    this.dying = true;
    this.body.enable = false;
    this.gs.addScore(this.def.score, this.x, this.y - 20);
    this.anims.play(`${this.def.texture}-jump`);
    this.setTint(0xffaaaa);
    this.weapon?.destroy();
    this.weapon = undefined;
    this.gs.tweens.add({
      targets: this,
      angle: -this.facing * 90,
      y: this.y + 8,
      alpha: 0,
      duration: 550,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean) {
    this.weapon?.destroy();
    super.destroy(fromScene);
  }
}
