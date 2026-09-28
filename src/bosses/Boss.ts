import Phaser from 'phaser';
import { explosion, floatingText, impactSpark } from '../gfx/effects';
import type { GameScene } from '../scenes/GameScene';
import { audio } from '../audio/Audio';

export type HurtZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body };

/**
 * Base dos chefes. Cada chefe tem zonas de acerto: as "fracas" recebem dano,
 * as blindadas só soltam faíscas. Abaixo de 50% de vida entra na fase 2.
 */
export abstract class Boss {
  hp: number;
  readonly maxHp: number;
  dying = false;
  phase2 = false;
  protected zones: HurtZone[] = [];
  private lastBlockedMsg = 0;

  constructor(
    protected gs: GameScene,
    readonly name: string,
    hp: number,
    /** scrollX da câmera travada na arena (borda esquerda da tela). */
    protected arenaX: number,
  ) {
    this.hp = hp;
    this.maxHp = hp;
  }

  /** Cria uma zona de acerto que segue alguma peça do chefe (posicionar em update). */
  protected addZone(w: number, h: number, weak: boolean): HurtZone {
    const zone = this.gs.add.zone(0, 0, w, h) as HurtZone;
    this.gs.physics.add.existing(zone);
    zone.body.setAllowGravity(false).setImmovable(true);
    zone.setData({ boss: this, weak });
    this.gs.bossHurt.add(zone);
    this.zones.push(zone);
    return zone;
  }

  protected setWeak(zone: HurtZone, weak: boolean) {
    zone.setData('weak', weak);
  }

  abstract update(time: number, delta: number): void;
  /** Área ocupada (para as explosões finais). */
  protected abstract bounds(): Phaser.Geom.Rectangle;
  /** Pisca as peças ao levar dano. */
  protected abstract flash(): void;
  /** Troca para a fase 2 (mais rápido/agressivo). */
  protected abstract onPhase2(): void;
  /** Remove tudo que o chefe criou. */
  protected abstract cleanup(): void;

  /** Dano vindo de projéteis, EMP ou golpe. Retorna false se bateu na blindagem. */
  hit(damage: number, x: number, y: number, zone?: Phaser.GameObjects.Zone) {
    if (this.dying) return false;
    if (zone && !zone.getData('weak')) {
      impactSpark(this.gs, x, y);
      if (this.gs.time.now - this.lastBlockedMsg > 900) {
        this.lastBlockedMsg = this.gs.time.now;
        floatingText(this.gs, x, y - 12, 'BLOQUEADO', '#8a95a4');
      }
      return false;
    }
    this.hp -= damage;
    this.flash();
    this.gs.hud.setBossRatio(this.hp / this.maxHp);
    if (!this.phase2 && this.hp <= this.maxHp / 2) {
      this.phase2 = true;
      this.gs.cameras.main.flash(150, 255, 60, 60);
      floatingText(this.gs, x, y - 20, 'FASE 2', '#ff5a5a');
      audio.play('roar');
      this.onPhase2();
    }
    if (this.hp <= 0) this.die();
    return true;
  }

  /** Zona sob um ponto, preferindo a fraca quando há sobreposição (ex.: núcleo dentro do corpo). */
  zoneAt(x: number, y: number) {
    const hits = this.zones.filter((z) => z.active && z.body.enable && z.getBounds().contains(x, y));
    return hits.find((z) => z.getData('weak')) ?? hits[0];
  }

  /** Zona de acerto mais próxima de um ponto (para EMP e golpe). */
  zoneNear(x: number, y: number, radius: number) {
    let best: Phaser.GameObjects.Zone | undefined;
    let bestD = Infinity;
    for (const z of this.zones) {
      if (!z.active) continue;
      const b = z.getBounds();
      const dx = Math.max(b.left - x, 0, x - b.right);
      const dy = Math.max(b.top - y, 0, y - b.bottom);
      const d = Math.hypot(dx, dy);
      // prefere zonas fracas quando empatadas
      const score = d - (z.getData('weak') ? 0.5 : 0);
      if (d < radius && score < bestD) {
        bestD = score;
        best = z;
      }
    }
    return best;
  }

  protected playerTouches(rect: Phaser.Geom.Rectangle) {
    const p = this.gs.player;
    if (!p.isVulnerable(this.gs.time.now)) return false;
    const b = p.body;
    return Phaser.Geom.Intersects.RectangleToRectangle(rect, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height));
  }

  private die() {
    this.dying = true;
    for (const z of this.zones) z.body.enable = false;
    const r = this.bounds();
    const gs = this.gs;
    for (let i = 0; i < 12; i++) {
      gs.time.delayedCall(i * 130, () => {
        explosion(gs, Phaser.Math.Between(r.left, r.right), Phaser.Math.Between(r.top, r.bottom), Phaser.Math.FloatBetween(0.6, 1.2));
        gs.cameras.main.shake(100, 0.008);
      });
    }
    gs.time.delayedCall(12 * 130 + 100, () => {
      explosion(gs, r.centerX, r.centerY, 2.2);
      gs.cameras.main.flash(300, 255, 255, 255);
      gs.cameras.main.shake(400, 0.02);
      this.cleanup();
      for (const z of this.zones) z.destroy();
      gs.bossDefeated(this, r.centerX, r.centerY);
    });
  }
}
