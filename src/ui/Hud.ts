import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';
import { RARITY_COLOR, SKILL_BY_ID } from '../run/skills';
import { GEAR, GEAR_RARITY_COLOR, GearId } from '../run/gear';
import { Action, bindingLabel } from '../input/Controls';
import { loadSettings } from '../run/settings';

const DEPTH = 100;
const SLOT = 24;
/** Barra de equipamento: arma 1, arma 2, granada, skill Q, skill E. */
const GEAR_SLOTS: { label: string; x: number; action?: Action }[] = [
  { label: '1', x: 6 },
  { label: '2', x: 32 },
  { label: 'L', x: 64, action: 'grenade' },
  { label: 'Q', x: 96, action: 'skill1' },
  { label: 'E', x: 122, action: 'skill2' },
];

/** Tecla atual da ação (se couber no canto do slot), senão o rótulo padrão. */
function slotLabel(slot: (typeof GEAR_SLOTS)[number]) {
  if (!slot.action) return slot.label;
  const key = loadSettings().bindings[slot.action]?.find((b) => b.kind === 'key');
  const name = bindingLabel(key);
  return key && name.length <= 2 ? name : slot.label;
}
const GEAR_Y = GAME_HEIGHT - 44;

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
  private bombInf: Phaser.GameObjects.Image;
  private gearGfx: Phaser.GameObjects.Graphics;
  private gearIcons: Phaser.GameObjects.Image[] = [];
  private gearTexts: Phaser.GameObjects.Text[] = [];
  private gearKey = '';
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
    this.bombInf = fixed(gs.add.image(161, 16, 'hud_inf').setOrigin(0).setVisible(false));

    // Equipamento (rodapé esquerdo)
    this.gearGfx = fixed(gs.add.graphics());
    GEAR_SLOTS.forEach((s) => {
      text(s.x + SLOT - 7, GEAR_Y + SLOT - 8, 8, '#6a6488').setText(slotLabel(s)).setDepth(DEPTH + 1);
      this.gearTexts.push(text(s.x + SLOT / 2, GEAR_Y + 8, 8, '#ffffff').setOrigin(0.5, 0).setDepth(DEPTH + 1));
    });

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
    const pi = run.loadout.grenade === 'raspberry';
    this.bombInf.setVisible(pi);
    this.bombText.setVisible(!pi).setText(String(run.bombs));
    this.drawGear();
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

  private gearIds(): (GearId | null)[] {
    const l = this.gs.run.loadout;
    return [l.weapons[0], l.weapons[1], l.grenade, l.abilities[0], l.abilities[1]];
  }

  private drawGear() {
    const ids = this.gearIds();
    const key = ids.join(',');
    if (key !== this.gearKey) {
      this.gearKey = key;
      this.gearIcons.forEach((i) => i.destroy());
      this.gearIcons = ids.map((id, i) => {
        const s = GEAR_SLOTS[i];
        const img = this.gs.add.image(s.x + SLOT / 2, GEAR_Y + SLOT / 2, id ? GEAR[id].icon.key : 'gear_icons', id ? GEAR[id].icon.frame : 0);
        const big = Math.max(img.width, img.height);
        img.setScale(id === 'pendrive' ? 1.6 : Math.min(1, (SLOT - 4) / big)).setVisible(id !== null).setScrollFactor(0).setDepth(DEPTH);
        return img;
      });
    }
    const now = this.gs.time.now;
    const arsenal = this.gs.player.arsenal;
    const g = this.gearGfx.clear();
    ids.forEach((id, i) => {
      const s = GEAR_SLOTS[i];
      const color = id ? Phaser.Display.Color.HexStringToColor(GEAR_RARITY_COLOR[GEAR[id].rarity]).color : 0x3a3350;
      g.fillStyle(0x0c0a18, 0.8).fillRect(s.x, GEAR_Y, SLOT, SLOT);
      let border = color;
      let overlay = 0;
      let label = '';
      if (id === 'shield144') {
        const st = arsenal.shieldState(now);
        if (st.cooldown) {
          overlay = st.ratio;
          label = String(Math.ceil((st.ratio * 8000) / 1000));
        } else {
          // golpes restantes antes da tela rachar
          for (let k = 0; k < 5; k++) g.fillStyle(k < 5 - st.hits ? 0x8ff0ff : 0x2a2d3a, 1).fillRect(s.x + 3 + k * 4, GEAR_Y + SLOT - 4, 3, 2);
        }
      }
      if (i >= 3 && id) {
        const st = arsenal.abilityState(i - 3, now);
        if (st.state === 'active') {
          border = Math.floor(now / 150) % 2 ? 0xffffff : color;
          g.fillStyle(0xffcf3a, 1).fillRect(s.x + 1, GEAR_Y + SLOT - 3, (SLOT - 2) * st.ratio, 2);
        } else if (st.state === 'cooldown') {
          overlay = st.ratio;
          label = String(Math.ceil(st.left / 1000));
        }
      }
      this.gearIcons[i]?.setAlpha(overlay ? 0.45 : 1);
      if (overlay) g.fillStyle(0x000000, 0.55).fillRect(s.x, GEAR_Y + SLOT * (1 - overlay), SLOT, SLOT * overlay);
      g.lineStyle(1, border, id ? 1 : 0.6).strokeRect(s.x + 0.5, GEAR_Y + 0.5, SLOT - 1, SLOT - 1);
      this.gearTexts[i].setText(label);
    });
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
