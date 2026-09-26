import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';
import type { EnemyDef } from './enemyTypes';

const MAX_AIM_ANGLE = 0.45;

/** Robô-esqueleto corrompido. Comportamentos: 'shooter' (Exterminador) e 'hunter' (Rastreador). */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  dying = false;
  facing = -1;
  private nextShot: number;
  private nextClaw = 0;
  private attacking = false;
  private eyeGlow: Phaser.GameObjects.Image;

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
    this.eyeGlow = gs.add.image(x, y, 'eye_glow').setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    gs.tweens.add({ targets: this.eyeGlow, alpha: { from: 0.5, to: 1 }, duration: 400, yoyo: true, repeat: -1 });
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimComplete, this);
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onAnimFrame, this);
  }

  /** Chamar depois de adicionar ao grupo de física (o grupo reseta o corpo). */
  setupBody() {
    this.body.setSize(14, 46).setOffset(12, 9);
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

    if (!this.attacking && dist < this.def.range && !p.dead) {
      this.facing = Math.sign(dx) || this.facing;

      if (this.def.behavior === 'shooter') {
        if (dist > 170) vx = this.facing * this.def.speed;
        else if (dist < 90) vx = -this.facing * this.def.speed * 0.6;

        if (onScreen && onGround && time > this.nextShot) {
          this.startAttack();
          this.nextShot = time + (this.def.fireRate ?? 2000) * Phaser.Math.FloatBetween(0.7, 1.3);
        }
      } else {
        const reach = this.def.clawReach ?? 26;
        if (dist > reach - 4) vx = this.facing * this.def.speed;
        if (dist < reach && onGround && time > this.nextClaw && Math.abs(p.y - this.y) < 30) {
          this.startAttack();
          this.nextClaw = time + (this.def.clawCooldown ?? 900);
        }
      }
    }

    this.setVelocityX(this.attacking ? 0 : vx);
    this.setFlipX(this.facing < 0);
    if (!this.attacking) this.anims.play(`${this.def.texture}-${!onGround ? 'jump' : vx ? 'run' : 'idle'}`, true);

    // "Surto" do vírus: pisca vermelho de vez em quando
    if (Math.random() < 0.004) {
      this.setTint(0xff5a5a);
      this.gs.time.delayedCall(70, () => this.active && !this.dying && this.clearTint());
    }
    this.followEye();
  }

  private followEye() {
    this.eyeGlow.setPosition(this.x + this.def.eye.x * this.facing, this.y + this.def.eye.y);
  }

  private startAttack() {
    this.attacking = true;
    this.anims.play(`${this.def.texture}-attack`);
  }

  /** O disparo / golpe acontece no quadro 10 da animação de ataque. */
  private onAnimFrame(anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) {
    if (this.dying || !anim.key.endsWith('-attack') || frame.index !== 2) return;
    if (this.def.behavior === 'shooter') this.shoot();
    else this.claw();
  }

  private onAnimComplete(anim: Phaser.Animations.Animation) {
    if (anim.key.endsWith('-attack')) this.attacking = false;
    if (anim.key.endsWith('-die')) {
      this.gs.tweens.add({ targets: this, alpha: 0, delay: 500, duration: 400, onComplete: () => this.destroy() });
    }
  }

  private shoot() {
    const p = this.gs.player;
    const m = this.def.muzzle ?? { x: 16, y: -4 };
    const mx = this.x + m.x * this.facing;
    const my = this.y + m.y;
    const base = this.facing > 0 ? 0 : Math.PI;
    const toPlayer = Phaser.Math.Angle.Between(mx, my, p.x, p.y - 4);
    const diff = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(toPlayer - base), -MAX_AIM_ANGLE, MAX_AIM_ANGLE);
    this.gs.spawnEnemyBullet(mx, my, base + diff, this.def.bulletSpeed ?? 150);
  }

  private claw() {
    const p = this.gs.player;
    this.gs.clawSlash(this.x + this.facing * 16, this.y - 6, this.facing);
    const dx = (p.x - this.x) * this.facing;
    if (dx > -6 && dx < (this.def.clawReach ?? 26) + 6 && Math.abs(p.y - this.y) < 30) this.gs.hurtPlayer();
  }

  hit(damage: number) {
    if (this.dying) return;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.die();
      return;
    }
    this.setTintFill(0xffffff);
    this.gs.time.delayedCall(50, () => this.active && !this.dying && this.clearTint());
  }

  private die() {
    this.dying = true;
    this.attacking = false;
    this.body.enable = false;
    this.clearTint();
    this.gs.addScore(this.def.score, this.x, this.y - 30);
    this.gs.robotDestroyed(this);
    this.eyeGlow.destroy();
    this.anims.play(`${this.def.texture}-die`);
  }

  destroy(fromScene?: boolean) {
    this.eyeGlow?.destroy();
    super.destroy(fromScene);
  }
}
