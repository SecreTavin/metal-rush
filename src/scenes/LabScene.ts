import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { RunState } from '../run/RunState';
import { loadSave, META_UPGRADES, upgradeLevel, writeSave } from '../run/save';
import { RARITY_COLOR, SKILLS } from '../run/skills';
import type { GameInit } from './GameScene';

type Item =
  | { kind: 'start' }
  | { kind: 'upgrade'; id: string }
  | { kind: 'skill'; id: string };

const ROW_H = 13;
const LIST_Y = 46;
/** Caixa de descrição (à direita); cresce com o texto, sem invadir o herói. */
const INFO = { x: 294, y: 38, w: 178, minH: 70, maxH: 112, pad: 8 };

/**
 * Laboratório: entre as runs, gasta os fragmentos de dados em melhorias permanentes
 * e em novas skills para o sorteio. Daqui começa cada run.
 */
export class LabScene extends Phaser.Scene {
  private items: Item[] = [];
  private index = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private bank!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private infoBox!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;

  constructor() {
    super('Lab');
  }

  create() {
    this.index = 0;
    this.drawBackground();

    this.add.text(16, 10, 'LABORATORIO', { fontFamily: FONT, fontSize: '16px', color: '#ffcf3a' }).setStroke('#6b1a10', 4);
    this.add.sprite(GAME_WIDTH - 14, 17, 'frag').play('frag');
    this.bank = this.add.text(GAME_WIDTH - 22, 12, '', { fontFamily: FONT, fontSize: '8px', color: '#8ff0ff' }).setOrigin(1, 0).setStroke('#000000', 3);

    // Herói esperando no laboratório
    this.add.image(390, 196, 'hero_aura').setBlendMode(Phaser.BlendModes.ADD).setScale(1.6);
    this.add.sprite(390, 200, 'hero', 0).setScale(2).play('hero-idle');
    this.add.image(390, 244, 'hero_ring').setScale(2).setBlendMode(Phaser.BlendModes.ADD);

    this.items = [{ kind: 'start' }, ...META_UPGRADES.map((u) => ({ kind: 'upgrade' as const, id: u.id })), ...SKILLS.filter((s) => s.unlockCost > 0).map((s) => ({ kind: 'skill' as const, id: s.id }))];
    const n = META_UPGRADES.length;
    const rowY = (i: number) => LIST_Y + i * ROW_H + (i >= 1 ? 14 : 0) + (i > n ? 14 : 0);
    this.rows = this.items.map((_, i) => this.add.text(26, rowY(i), '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setStroke('#000000', 3));
    const header = (y: number, t: string) => this.add.text(26, y, t, { fontFamily: FONT, fontSize: '8px', color: '#b890ff' }).setAlpha(0.8);
    header(rowY(1) - 13, 'MELHORIAS PERMANENTES');
    header(rowY(n + 1) - 13, 'SKILLS PARA O SORTEIO');
    this.cursor = this.add.text(14, 0, '>', { fontFamily: FONT, fontSize: '8px', color: '#ffcf3a' });
    this.tweens.add({ targets: this.cursor, x: 17, duration: 300, yoyo: true, repeat: -1 });

    this.info = this.add
      .text(INFO.x + INFO.pad, INFO.y + INFO.pad, '', {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#e8e0ff',
        wordWrap: { width: INFO.w - INFO.pad * 2 - 2 },
        lineSpacing: 3,
      })
      .setStroke('#000000', 3);
    this.toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', { fontFamily: FONT, fontSize: '8px', color: '#ffcf3a' }).setOrigin(0.5).setStroke('#000000', 3);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'CIMA/BAIXO ESCOLHER   J/ENTER CONFIRMAR   ESC MENU', { fontFamily: FONT, fontSize: '8px', color: '#8a82b0' })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    const on = (codes: string[], fn: () => void) => codes.forEach((c) => kb.on(`keydown-${c}`, fn));
    on(['UP', 'W'], () => this.move(-1));
    on(['DOWN', 'S'], () => this.move(1));
    on(['J', 'Z', 'ENTER', 'SPACE'], () => this.confirm());
    on(['ESC', 'BACKSPACE'], () => this.scene.start('Menu'));

    this.refresh();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x07061a, 0x07061a, 0x1c1440, 0x1c1440, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.lineStyle(1, 0x2a2458, 0.6);
    for (let x = 0; x < GAME_WIDTH; x += 20) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 20) g.lineBetween(0, y, GAME_WIDTH, y);
    g.fillStyle(0x0c0a18, 0.85).fillRect(8, 38, 280, 206);
    g.lineStyle(1, 0x4a2a6a, 1).strokeRect(8.5, 38.5, 280, 206);
    this.infoBox = this.add.graphics();
    // tubos de dados subindo no fundo
    this.add
      .particles(0, 0, 'bits', {
        frame: [0, 1],
        x: { min: 300, max: 470 },
        y: GAME_HEIGHT,
        speedY: { min: -40, max: -20 },
        lifespan: 5000,
        alpha: { start: 0.6, end: 0 },
        tint: [0x8ff0ff, 0xb890ff],
        frequency: 160,
      });
  }

  private move(d: number) {
    this.index = (this.index + d + this.items.length) % this.items.length;
    this.refresh();
  }

  private refresh() {
    const save = loadSave();
    this.bank.setText(String(save.fragments));
    this.items.forEach((item, i) => {
      const row = this.rows[i];
      const sel = i === this.index;
      if (item.kind === 'start') {
        row.setText(save.runs ? `INICIAR RUN #${save.runs + 1}` : 'INICIAR RUN').setColor(sel ? '#7aff9a' : '#c8f8d0');
      } else if (item.kind === 'upgrade') {
        const u = META_UPGRADES.find((m) => m.id === item.id)!;
        const lvl = upgradeLevel(save, u.id);
        const maxed = lvl >= u.costs.length;
        const cost = maxed ? 'MAX' : `${u.costs[lvl]}`;
        row.setText(`${u.name.padEnd(16, ' ')} ${lvl}/${u.costs.length}  ${cost}`).setColor(maxed ? '#6a6480' : sel ? '#ffffff' : '#c8c0e8');
      } else {
        const s = SKILLS.find((k) => k.id === item.id)!;
        const has = save.unlocked.includes(s.id);
        row.setText(`${s.name.padEnd(18, ' ')} ${has ? 'OK' : s.unlockCost}`).setColor(has ? '#6a6480' : sel ? RARITY_COLOR[s.rarity] : '#c8c0e8');
      }
    });
    const r = this.rows[this.index];
    this.cursor.setY(r.y);
    this.info.setText(this.describe(this.items[this.index]));
    const h = Phaser.Math.Clamp(Math.ceil(this.info.height) + INFO.pad * 2, INFO.minH, INFO.maxH);
    this.infoBox
      .clear()
      .fillStyle(0x0c0a18, 0.85)
      .fillRect(INFO.x, INFO.y, INFO.w, h)
      .lineStyle(1, 0x4a2a6a, 1)
      .strokeRect(INFO.x + 0.5, INFO.y + 0.5, INFO.w, h);
  }

  private describe(item: Item) {
    const save = loadSave();
    if (item.kind === 'start') {
      return `NOVA RUN NA MISSÃO 1.\n\nRUNS: ${save.runs}\nVITORIAS: ${save.wins}\nMELHOR: MISSÃO ${Math.max(1, save.bestMission)}`;
    }
    if (item.kind === 'upgrade') {
      const u = META_UPGRADES.find((m) => m.id === item.id)!;
      const lvl = upgradeLevel(save, u.id);
      const next = lvl >= u.costs.length ? 'NIVEL MAXIMO' : `CUSTO: ${u.costs[lvl]}`;
      return `${u.name}\n\n${u.desc}\n\n${next}`;
    }
    const s = SKILLS.find((k) => k.id === item.id)!;
    const status = save.unlocked.includes(s.id) ? 'JA NO SORTEIO' : `CUSTO: ${s.unlockCost}`;
    return `${s.name}\n\n${s.desc}\n\n${status}`;
  }

  private confirm() {
    const item = this.items[this.index];
    const save = loadSave();
    if (item.kind === 'start') {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Game', { run: new RunState() } satisfies GameInit);
      });
      return;
    }
    let cost: number | null = null;
    if (item.kind === 'upgrade') {
      const u = META_UPGRADES.find((m) => m.id === item.id)!;
      const lvl = upgradeLevel(save, u.id);
      if (lvl >= u.costs.length) return this.say('JA ESTA NO MAXIMO');
      cost = u.costs[lvl];
      if (save.fragments < cost) return this.say('FRAGMENTOS INSUFICIENTES', true);
      save.upgrades[u.id] = lvl + 1;
    } else {
      const s = SKILLS.find((k) => k.id === item.id)!;
      if (save.unlocked.includes(s.id)) return this.say('JA LIBERADA');
      cost = s.unlockCost;
      if (save.fragments < cost) return this.say('FRAGMENTOS INSUFICIENTES', true);
      save.unlocked.push(s.id);
    }
    save.fragments -= cost;
    writeSave(save);
    this.say('INSTALADO!');
    this.cameras.main.flash(120, 140, 240, 255);
    this.refresh();
  }

  private say(msg: string, bad = false) {
    this.toast.setText(msg).setColor(bad ? '#ff5a5a' : '#ffcf3a').setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 900, duration: 300 });
    if (bad) this.cameras.main.shake(100, 0.004);
  }
}
