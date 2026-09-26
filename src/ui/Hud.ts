import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';

const DEPTH = 100;

/** HUD no estilo arcade: pontuação + barra, ARMS/BOMB, cronômetro central e vidas. */
export class Hud {
  private score: Phaser.GameObjects.Text;
  private gaugeFill: Phaser.GameObjects.Image;
  private lives: Phaser.GameObjects.Text;
  private armsInf: Phaser.GameObjects.Image;
  private armsText: Phaser.GameObjects.Text;
  private bombText: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;

  constructor(private gs: GameScene, missionLabel: string) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => {
      o.setScrollFactor(0);
      o.setDepth(DEPTH);
      return o;
    };
    const text = (x: number, y: number, size: number, color: string, stroke = '#000000') =>
      fixed(gs.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color }).setStroke(stroke, 3));

    // Bloco esquerdo: pontuação sobre a barra
    this.score = text(106, 5, 8, '#ffffff').setOrigin(1, 0);
    fixed(gs.add.image(6, 15, 'hud_gauge').setOrigin(0));
    this.gaugeFill = fixed(gs.add.image(8, 17, 'hud_gauge_fill').setOrigin(0));
    this.lives = text(8, 28, 8, '#ffd84a', '#1f3f8f');

    // ARMS / BOMB
    text(114, 5, 8, '#ffffff', '#1f3f8f').setText('ARMS');
    text(154, 5, 8, '#ffffff', '#1f3f8f').setText('BOMB');
    this.armsInf = fixed(gs.add.image(121, 17, 'hud_inf').setOrigin(0));
    this.armsText = text(114, 16, 8, '#ffd84a');
    this.bombText = text(158, 16, 8, '#ffd84a');

    // Cronômetro
    this.timer = text(GAME_WIDTH / 2, 3, 16, '#ffcf3a', '#8b1e10').setOrigin(0.5, 0);
    this.timer.setShadow(2, 2, '#000000', 0, true, true);

    // Rodapé
    text(8, GAME_HEIGHT - 12, 8, '#ffffff').setText(missionLabel).setAlpha(0.85);
  }

  update() {
    const p = this.gs.player;
    this.score.setText(String(this.gs.score));
    const ratio = p.ammo === Infinity ? 1 : p.ammo / p.weapon.ammo;
    this.gaugeFill.setCrop(0, 0, 96 * Phaser.Math.Clamp(ratio, 0, 1), 6);
    this.lives.setText(`1UP=${this.gs.lives}`);
    const inf = p.ammo === Infinity;
    this.armsInf.setVisible(inf);
    this.armsText.setVisible(!inf).setText(String(p.ammo));
    this.bombText.setText(String(p.bombs));
    this.timer.setText(String(this.gs.timeLeft).padStart(2, '0'));
    this.timer.setColor(this.gs.timeLeft <= 10 ? '#ff5a3a' : '#ffcf3a');
  }
}
