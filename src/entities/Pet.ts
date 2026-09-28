import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import { impactSpark } from '../gfx/effects';
import { audio } from '../audio/Audio';

const SIGHT = 160;
const FOLLOW_SPEED = 150;
const CHASE_SPEED = 190;
const BITE_RANGE = 16;
const BITE_COOLDOWN = 420;
const BITE_DAMAGE = 2;

type Target = { kind: 'enemy'; enemy: Enemy } | { kind: 'boss'; zone: Phaser.GameObjects.Zone };

/**
 * Skill "Sênior Vibe Coding": filhote holográfico imortal.
 * Segue o herói fofinho; ao ver um robô fica vermelho e parte para morder.
 */
export class Pet extends Phaser.GameObjects.Sprite {
  private nextBite = 0;
  private leaving = false;

  constructor(private gs: GameScene, x: number, y: number) {
    super(gs, x, y, 'gear_dog', 0);
    gs.add.existing(this);
    this.setDepth(10).setAlpha(0);
    if (!gs.anims.exists('pet-cute')) {
      gs.anims.create({ key: 'pet-cute', frames: gs.anims.generateFrameNumbers('gear_dog', { frames: [0, 1] }), frameRate: 6, repeat: -1 });
      gs.anims.create({ key: 'pet-angry', frames: gs.anims.generateFrameNumbers('gear_dog', { frames: [2, 3] }), frameRate: 10, repeat: -1 });
    }
    this.play('pet-cute');
    gs.glitchBars(x, y, [0x8ff0ff, 0xffffff]);
    gs.tweens.add({ targets: this, alpha: 0.9, duration: 250 });
  }

  update(time: number, delta: number) {
    if (this.leaving) return;
    const dt = delta / 1000;
    const p = this.gs.player;
    const target = this.findTarget();
    let tx: number;
    let ty: number;
    let speed: number;
    if (target) {
      const pos = target.kind === 'enemy' ? { x: target.enemy.x, y: target.enemy.y + 6 } : target.zone.getCenter();
      tx = pos.x;
      ty = pos.y;
      speed = CHASE_SPEED;
      this.play('pet-angry', true);
      if (Phaser.Math.Distance.Between(this.x, this.y, tx, ty) < BITE_RANGE && time > this.nextBite) this.bite(target, time);
    } else {
      tx = p.x - p.facing * 24;
      ty = p.body.bottom - 10;
      speed = FOLLOW_SPEED;
      this.play('pet-cute', true);
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) {
      const step = Math.min(d, speed * dt * (d > 80 ? 1.8 : 1));
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (Math.abs(dx) > 2) this.setFlipX(dx < 0);
    } else if (!target) {
      this.setFlipX(p.facing < 0);
    }
    // cintilação de holograma
    this.setAlpha(0.78 + Math.random() * 0.17);
  }

  private findTarget(): Target | null {
    const p = this.gs.player;
    const view = this.gs.cameras.main.worldView;
    let best: Enemy | null = null;
    let bestD = SIGHT;
    for (const o of this.gs.enemies.getChildren()) {
      const e = o as Enemy;
      if (e.dying || !view.contains(e.x, e.y)) continue;
      const d = Math.min(Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y), Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y));
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) return { kind: 'enemy', enemy: best };
    const boss = this.gs.boss;
    if (boss && !boss.dying) {
      const zone = boss.zoneNear(this.x, this.y, SIGHT * 1.5);
      if (zone) return { kind: 'boss', zone };
    }
    return null;
  }

  private bite(target: Target, time: number) {
    this.nextBite = time + BITE_COOLDOWN;
    impactSpark(this.gs, this.x + (this.flipX ? -8 : 8), this.y, 'bolt_hit');
    audio.play('claw', 1.5);
    if (target.kind === 'enemy') target.enemy.hit(BITE_DAMAGE);
    else this.gs.boss?.hit(BITE_DAMAGE, this.x, this.y, target.zone);
    // pulinho da mordida
    this.gs.tweens.add({ targets: this, y: this.y - 5, duration: 80, yoyo: true });
  }

  /** Fim da skill: o holograma se desfaz. */
  dismiss() {
    if (this.leaving) return;
    this.leaving = true;
    this.gs.glitchBars(this.x, this.y, [0x8ff0ff, 0xff5aff]);
    this.gs.tweens.add({ targets: this, alpha: 0, scaleY: 0.1, duration: 250, onComplete: () => this.destroy() });
  }
}
