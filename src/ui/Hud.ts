import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';
import { RARITY_COLOR, SKILL_BY_ID } from '../run/skills';

const DEPTH = 100;

/**
 * HUD estilo arcade adaptado à run:
 * pontos + integridade (vida), ARMS/BOMB, relógio da run, fragmentos, skills e barra de chefe.
 */
export class Hud {
  private score: Phaser.GameObjects.Text;
  private hpCells: Phaser.GameObjects.Graphics;
  private armsInf: Phaser.GameObjects.Image;
  private armsText: Phaser.GameObjects.Text;
  private bombText: Phaser.GameObjects.Text;
  private clock: Phaser.GameObjects.Text;
  private frags: Phaser.GameObjects.Text;
  private skillRow: Phaser.GameObjects.Container;
  private skillKey = '';
  private boss?: { name: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Graphics; ratio: number };

  constructor(private gs: GameScene, missionLabel: string) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => {
      o.setScrollFactor(0);
      o.setDepth(DEPTH);
      return o;
    };
    const text = (x: number, y: number, size: number, color: string, stroke = '#000000') =>
      fixed(gs.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color }).setStroke(stroke, 3));

    // Pontos e integridade
    this.score = text(106, 4, 8, '#ffffff').setOrigin(1, 0);
    text(6, 14, 8, '#8ff0ff', '#1f3f8f').setText('HP');
    this.hpCells = fixed(gs.add.graphics());

    // ARMS / BOMB
    text(114, 4, 8, '#ffffff', '#1f3f8f').setText('ARMS');
    text(154, 4, 8, '#ffffff', '#1f3f8f').setText('BOMB');
    this.armsInf = fixed(gs.add.image(121, 16, 'hud_inf').setOrigin(0));
    this.armsText = text(114, 15, 8, '#ffd84a');
    this.bombText = text(158, 15, 8, '#ffd84a');

    // Relógio da run
    this.clock = text(GAME_WIDTH / 2, 3, 16, '#ffcf3a', '#8b1e10').setOrigin(0.5, 0);
    this.clock.setShadow(2, 2, '#000000', 0, true, true);

    // Fragmentos
    fixed(gs.add.sprite(GAME_WIDTH - 12, 9, 'frag').play('frag'));
    this.frags = text(GAME_WIDTH - 20, 5, 8, '#8ff0ff').setOrigin(1, 0);

    // Rodapé: missão e skills
    text(6, GAME_HEIGHT - 12, 8, '#ffffff').setText(missionLabel).setAlpha(0.85);
    this.skillRow = fixed(gs.add.container(GAME_WIDTH - 6, GAME_HEIGHT - 8));
  }

  update() {
    const run = this.gs.run;
    const p = this.gs.player;
    this.score.setText(String(run.score));
    this.drawHp(run.hp, run.maxHp);
    const inf = p.ammo === Infinity;
    this.armsInf.setVisible(inf);
    this.armsText.setVisible(!inf).setText(String(p.ammo));
    this.bombText.setText(String(run.bombs));
    const s = Math.floor(run.timeMs / 1000);
    this.clock.setText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    this.frags.setText(String(run.fragments));
    const key = JSON.stringify(run.skills);
    if (key !== this.skillKey) {
      this.skillKey = key;
      this.drawSkills();
    }
    if (this.boss) this.drawBossBar();
  }

  private drawHp(hp: number, max: number) {
    const g = this.hpCells.clear();
    const low = hp <= Math.max(1, Math.floor(max / 4));
    const blink = low && Math.floor(this.gs.time.now / 200) % 2 === 0;
    for (let i = 0; i < max; i++) {
      const x = 24 + i * 7;
      g.fillStyle(0x0c1020, 1).fillRect(x, 15, 6, 8);
      g.lineStyle(1, 0x3a4c74, 1).strokeRect(x + 0.5, 15.5, 5, 7);
      if (i < hp) {
        g.fillStyle(low ? (blink ? 0xff5a5a : 0xb02020) : 0x4fa8ff, 1).fillRect(x + 1, 16, 4, 6);
        g.fillStyle(0xffffff, 0.5).fillRect(x + 1, 16, 4, 1);
      }
    }
  }

  private drawSkills() {
    this.skillRow.removeAll(true);
    const entries = Object.entries(this.gs.run.skills);
    let x = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      const [id, lvl] = entries[i];
      const def = SKILL_BY_ID[id];
      if (!def) continue;
      const label = lvl > 1 ? `${def.icon}${lvl}` : def.icon;
      const t = this.gs.add
        .text(x, 0, label, { fontFamily: FONT, fontSize: '8px', color: RARITY_COLOR[def.rarity] })
        .setOrigin(1, 1)
        .setStroke('#000000', 3);
      this.skillRow.add(t);
      x -= t.width + 6;
    }
  }

  /** Mostra a barra de vida de um chefe. */
  showBoss(name: string) {
    this.hideBoss();
    const nameText = this.gs.add
      .text(GAME_WIDTH / 2, 30, name, { fontFamily: FONT, fontSize: '8px', color: '#ff5a5a' })
      .setOrigin(0.5, 0)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    const bar = this.gs.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.boss = { name: nameText, bar, ratio: 1 };
  }

  setBossRatio(ratio: number) {
    if (this.boss) this.boss.ratio = Phaser.Math.Clamp(ratio, 0, 1);
  }

  hideBoss() {
    this.boss?.name.destroy();
    this.boss?.bar.destroy();
    this.boss = undefined;
  }

  private drawBossBar() {
    const b = this.boss!;
    const w = 200;
    const x = GAME_WIDTH / 2 - w / 2;
    b.bar.clear();
    b.bar.fillStyle(0x07080c, 1).fillRect(x - 2, 41, w + 4, 8);
    b.bar.fillStyle(0x3a0a10, 1).fillRect(x, 43, w, 4);
    b.bar.fillStyle(0xff3a3a, 1).fillRect(x, 43, w * b.ratio, 4);
    b.bar.fillStyle(0xffb0a0, 1).fillRect(x, 43, w * b.ratio, 1);
  }
}
