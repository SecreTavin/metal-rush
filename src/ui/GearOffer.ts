import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GEAR, GEAR_RARITY_COLOR, GEAR_RARITY_LABEL, GearId, Loadout } from '../run/gear';
import { audio } from '../audio/Audio';

const DEPTH = 300;
const PANEL_W = 300;
const PANEL_H = 222;

const KIND_LABEL = { weapon: 'ARMA', skill: 'SKILL ATIVA', grenade: 'GRANADA (L)' } as const;

/**
 * Item encontrado: mostra o equipamento e onde equipar.
 * Arma: slot 1 (clique esquerdo) ou 2 (clique direito). Skill: Q ou E. Granada: substitui a atual.
 * Navega com cima/baixo ou mouse; confirma com J / ENTER / clique; ESC deixa o item no chão.
 * `onDone(slot)` recebe o slot escolhido ou null.
 */
export class GearOffer {
  private root: Phaser.GameObjects.Container;
  private rows: { bg: Phaser.GameObjects.Rectangle; slot: number | null }[] = [];
  private index = 0;
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private readyAt: number;
  private closed = false;

  constructor(
    private scene: Phaser.Scene,
    id: GearId,
    loadout: Loadout,
    private onDone: (slot: number | null) => void,
  ) {
    const def = GEAR[id];
    const color = GEAR_RARITY_COLOR[def.rarity];
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    this.readyAt = scene.time.now + 250;
    const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.root = root;
    const cx = GAME_WIDTH / 2;
    const top = (GAME_HEIGHT - PANEL_H) / 2;
    const text = (x: number, y: number, str: string, size: number, col: string, wrap?: number) =>
      scene.add
        .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color: col, wordWrap: wrap ? { width: wrap } : undefined, lineSpacing: 3 })
        .setStroke('#000000', 3);

    root.add(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.75).setOrigin(0));
    const panel = scene.add.graphics();
    panel.fillStyle(0x0c0a18, 0.97).fillRect(cx - PANEL_W / 2, top, PANEL_W, PANEL_H);
    panel.fillStyle(colorNum, 0.12).fillRect(cx - PANEL_W / 2, top, PANEL_W, 22);
    panel.lineStyle(2, colorNum, 1).strokeRect(cx - PANEL_W / 2, top, PANEL_W, PANEL_H);
    root.add(panel);
    root.add(text(cx, top + 7, 'ITEM ENCONTRADO', 8, '#ffffff').setOrigin(0.5, 0));

    // ícone ampliado + texto
    const iconBox = scene.add.graphics();
    iconBox.fillStyle(0x16122a, 1).fillRect(cx - PANEL_W / 2 + 10, top + 30, 80, 70);
    root.add(iconBox);
    const icon = scene.add.image(cx - PANEL_W / 2 + 50, top + 65, def.icon.key, def.icon.frame).setScale(def.icon.key === 'usb' ? 5 : 2.6);
    root.add(icon);
    scene.tweens.add({ targets: icon, y: icon.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const tx = cx - PANEL_W / 2 + 100;
    root.add(text(tx, top + 32, def.name, 8, '#ffffff', PANEL_W - 110));
    root.add(text(tx, top + 46, `${GEAR_RARITY_LABEL[def.rarity]} - ${KIND_LABEL[def.kind]}`, 8, color));
    root.add(text(tx, top + 62, def.desc, 8, '#b8b0d8', PANEL_W - 110));

    // opções
    const name = (g: GearId | null) => (g ? GEAR[g].name : 'VAZIO');
    const options: { label: string; slot: number | null }[] = [];
    if (def.kind === 'weapon') {
      options.push({ label: `ARMA 1 (ESQ): ${name(loadout.weapons[0])}`, slot: 0 });
      options.push({ label: `ARMA 2 (DIR): ${name(loadout.weapons[1])}`, slot: 1 });
    } else if (def.kind === 'skill') {
      options.push({ label: `SKILL Q: ${name(loadout.abilities[0])}`, slot: 0 });
      options.push({ label: `SKILL E: ${name(loadout.abilities[1])}`, slot: 1 });
      // com um slot livre, ele vem selecionado
      if (loadout.abilities[0] && !loadout.abilities[1]) this.index = 1;
    } else {
      options.push({ label: `EQUIPAR (SAI ${name(loadout.grenade)})`, slot: 0 });
    }
    options.push({ label: 'DEIXAR NO CHAO', slot: null });
    if (def.kind === 'weapon' && loadout.weapons[0] && !loadout.weapons[1]) this.index = 1;

    options.forEach((o, i) => {
      const y = top + 140 + i * 19;
      const bg = scene.add.rectangle(cx, y, PANEL_W - 20, 16, 0x16122a, 1).setStrokeStyle(1, 0x3a3350);
      const label = text(cx - PANEL_W / 2 + 18, y - 4, o.label, 8, o.slot === null ? '#8a84a8' : '#e8e0ff');
      root.add([bg, label]);
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        this.index = i;
        this.refresh();
      });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
        if (p.button !== 0) return;
        this.index = i;
        this.confirm();
      });
      this.rows.push({ bg, slot: o.slot });
    });
    root.add(text(cx, top + PANEL_H - 12, 'CIMA/BAIXO   J/ENTER: OK   ESC: SAIR', 8, '#6a6488').setOrigin(0.5, 0));

    root.setAlpha(0);
    scene.tweens.add({ targets: root, alpha: 1, duration: 150 });

    const kb = scene.input.keyboard!;
    const bind = (codes: string[], fn: () => void) => {
      for (const code of codes) {
        const key = kb.addKey(code, true);
        key.on('down', fn);
        this.keys.push(key);
      }
    };
    bind(['UP', 'W'], () => this.move(-1));
    bind(['DOWN', 'S'], () => this.move(1));
    bind(['J', 'Z', 'ENTER', 'SPACE'], () => this.confirm());
    bind(['ESC'], () => this.close(null));
    this.refresh();
  }

  private move(d: number) {
    if (this.closed) return;
    this.index = (this.index + d + this.rows.length) % this.rows.length;
    audio.play('select');
    this.refresh();
  }

  private refresh() {
    this.rows.forEach((r, i) => {
      const sel = i === this.index;
      r.bg.setFillStyle(sel ? 0x2a2050 : 0x16122a, 1).setStrokeStyle(1, sel ? 0xffcf3a : 0x3a3350);
    });
  }

  private confirm() {
    if (this.scene.time.now < this.readyAt) return;
    this.close(this.rows[this.index].slot);
  }

  private close(slot: number | null) {
    if (this.closed) return;
    this.closed = true;
    audio.play(slot === null ? 'back' : 'confirm');
    for (const k of this.keys) k.removeAllListeners();
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.root.destroy();
        this.onDone(slot);
      },
    });
  }
}
