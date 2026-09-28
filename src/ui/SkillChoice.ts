import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { RARITY_COLOR, SkillDef } from '../run/skills';
import { audio } from '../audio/Audio';

const CARD_W = 136;
const CARD_H = 150;
const DEPTH = 300;

const RARITY_LABEL = { common: 'COMUM', rare: 'RARA', epic: 'EPICA' } as const;

/**
 * Sobreposição "escolha 1 de 3". Navega com esquerda/direita e confirma com tiro/ENTER.
 * A cena deve pausar o jogo enquanto estiver aberta.
 */
export class SkillChoice {
  private root: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Container[] = [];
  private frames: Phaser.GameObjects.Graphics[] = [];
  private index = 1;
  private readyAt: number;
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private closed = false;

  constructor(
    private scene: Phaser.Scene,
    private options: SkillDef[],
    private levels: Record<string, number>,
    private onPick: (skill: SkillDef) => void,
    title = 'ESCOLHA UMA SKILL',
  ) {
    this.readyAt = scene.time.now + 350;
    this.index = Math.floor(options.length / 2);
    const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.root = root;

    root.add(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.78).setOrigin(0));
    root.add(
      scene.add
        .text(GAME_WIDTH / 2, 22, title, { fontFamily: FONT, fontSize: '12px', color: '#ffcf3a' })
        .setOrigin(0.5)
        .setStroke('#6b1a10', 4),
    );
    root.add(
      scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '< > OU MOUSE: ESCOLHER    J / ENTER / CLIQUE: CONFIRMAR', { fontFamily: FONT, fontSize: '8px', color: '#b8b0d8' })
        .setOrigin(0.5),
    );

    const gap = 12;
    const total = options.length * CARD_W + (options.length - 1) * gap;
    options.forEach((skill, i) => {
      const x = GAME_WIDTH / 2 - total / 2 + i * (CARD_W + gap) + CARD_W / 2;
      const card = this.buildCard(skill, x, GAME_HEIGHT / 2 + 4);
      root.add(card);
      this.cards.push(card);
      // mouse: passar por cima seleciona, clique esquerdo confirma
      card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        if (this.index !== i && !this.closed) {
          this.index = i;
          this.refresh();
        }
      });
      card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
        if (p.button !== 0) return;
        this.index = i;
        this.confirm();
      });
    });

    // entrada animada dos cartões
    this.cards.forEach((c, i) => {
      const y = c.y;
      c.y = y + 40;
      c.alpha = 0;
      scene.tweens.add({ targets: c, y, alpha: 1, duration: 220, delay: i * 70, ease: 'Back.easeOut' });
    });

    const kb = scene.input.keyboard!;
    const bind = (codes: string[], fn: () => void) => {
      for (const code of codes) {
        const key = kb.addKey(code, true);
        key.on('down', fn);
        this.keys.push(key);
      }
    };
    bind(['LEFT', 'A'], () => this.move(-1));
    bind(['RIGHT', 'D'], () => this.move(1));
    bind(['J', 'Z', 'ENTER', 'SPACE'], () => this.confirm());
    this.refresh();
  }

  private buildCard(skill: SkillDef, x: number, y: number) {
    const s = this.scene;
    const color = Phaser.Display.Color.HexStringToColor(RARITY_COLOR[skill.rarity]).color;
    const card = s.add.container(x, y);
    const g = s.add.graphics();
    g.fillStyle(0x0c0a18, 0.96).fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
    g.fillStyle(color, 0.12).fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 30);
    card.add(g);
    const frame = s.add.graphics();
    card.add(frame);
    this.frames.push(frame);
    frame.setData('color', color);

    const lvl = this.levels[skill.id] ?? 0;
    const text = (ty: number, str: string, size: number, col: string, wrap = CARD_W - 14) =>
      s.add
        .text(0, ty, str, { fontFamily: FONT, fontSize: `${size}px`, color: col, align: 'center', wordWrap: { width: wrap } })
        .setOrigin(0.5, 0);
    card.add(text(-CARD_H / 2 + 6, RARITY_LABEL[skill.rarity], 8, RARITY_COLOR[skill.rarity]));
    card.add(text(-CARD_H / 2 + 36, skill.icon, 16, RARITY_COLOR[skill.rarity]).setStroke('#000000', 3));
    card.add(text(-CARD_H / 2 + 64, skill.name, 8, '#ffffff'));
    card.add(text(-CARD_H / 2 + 90, skill.desc, 8, '#b8b0d8'));
    card.add(text(CARD_H / 2 - 16, lvl ? `NIVEL ${lvl} > ${lvl + 1}` : 'NOVA', 8, lvl ? '#ffcf3a' : '#7aff9a'));
    return card;
  }

  private move(d: number) {
    if (this.closed) return;
    this.index = (this.index + d + this.options.length) % this.options.length;
    audio.play('select');
    this.refresh();
  }

  private refresh() {
    this.cards.forEach((card, i) => {
      const sel = i === this.index;
      const frame = this.frames[i];
      const color = frame.getData('color') as number;
      frame.clear();
      frame.lineStyle(sel ? 2 : 1, sel ? color : 0x3a3350, 1).strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      if (sel) frame.lineStyle(1, 0xffffff, 0.5).strokeRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, CARD_W - 6, CARD_H - 6);
      this.scene.tweens.add({ targets: card, scale: sel ? 1.04 : 0.94, alpha: sel ? 1 : 0.6, duration: 120 });
    });
  }

  private confirm() {
    if (this.closed || this.scene.time.now < this.readyAt) return;
    this.closed = true;
    audio.play('power');
    const skill = this.options[this.index];
    const chosen = this.cards[this.index];
    this.scene.tweens.add({ targets: chosen, scale: 1.2, duration: 160, yoyo: true });
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      delay: 260,
      duration: 200,
      onComplete: () => {
        this.destroy();
        this.onPick(skill);
      },
    });
  }

  destroy() {
    for (const k of this.keys) k.removeAllListeners();
    this.root.destroy();
  }
}
