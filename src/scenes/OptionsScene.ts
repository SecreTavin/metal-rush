import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { audio } from '../audio/Audio';
import {
  Action, ACTION_LABELS, Binding, bindingLabel, keyNameFromCode, mouseButtonFromIndex, RESERVED_KEYS, sameBinding,
} from '../input/Controls';
import { loadSettings, resetBindings, saveSettings } from '../run/settings';
import { generateMenuArt } from '../gfx/art/menuArt';

const SLOTS = 3;
const COL_X = [150, 260, 370];
const SLOT_W = 104;
const ROW_H = 15;

type Page = 'main' | 'keys';
type Row = { y: number; label: Phaser.GameObjects.Text; value?: Phaser.GameObjects.Text; bar?: Phaser.GameObjects.Graphics; hit: Phaser.GameObjects.Rectangle };

const text = (scene: Phaser.Scene, x: number, y: number, s: string, color = '#e8e0ff', size = 8) =>
  scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setStroke('#000000', 3);

/**
 * Opções: volumes (geral, música, efeitos), tela cheia e troca de atalhos.
 * Teclado: cima/baixo escolhe, esquerda/direita ajusta, ENTER confirma, ESC volta.
 * Mouse: passar por cima seleciona, clicar ativa (nos volumes, clicar na barra define o nível).
 * Nos atalhos: ENTER/clique numa célula e aperte a nova tecla ou botão do mouse; DELETE/clique direito limpa.
 */
export class OptionsScene extends Phaser.Scene {
  private page: Page = 'main';
  private root!: Phaser.GameObjects.Container;
  private index = 0;
  private col = 0;
  private rows: Row[] = [];
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];
  private cursor!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;
  private capturing: { action: Action; slot: number; since: number } | null = null;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('Options');
  }

  create() {
    generateMenuArt(this);
    this.add.image(0, 0, 'menu_sky').setOrigin(0);
    this.add.image(0, 0, 'menu_far').setOrigin(0);
    this.add.image(0, 0, 'menu_near').setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.72).setOrigin(0);
    this.capturing = null;
    this.buildPage('main');

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onPointerCapture(p));
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.refresh, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.refresh, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.refresh, this);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.refresh, this);
    });
    this.cameras.main.fadeIn(200);
  }

  // ---------------------------------------------------------------- páginas

  private buildPage(page: Page) {
    this.root?.destroy();
    this.page = page;
    this.rows = [];
    this.cells = [];
    this.cellText = [];
    this.index = 0;
    this.col = 0;
    this.root = this.add.container(0, 0);
    const title = text(this, GAME_WIDTH / 2, 14, page === 'main' ? 'OPCOES' : 'ATALHOS', '#ffcf3a', 16).setOrigin(0.5, 0).setStroke('#6b1a10', 4);
    this.cursor = this.add.rectangle(0, 0, 10, 10, 0x2a1a50, 0.9).setOrigin(0).setStrokeStyle(1, 0xffcf3a, 0.9);
    this.root.add([this.cursor, title]);
    this.hint = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 14, '', '#8a84a8').setOrigin(0.5, 0);
    this.status = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 28, '', '#ffcf3a').setOrigin(0.5, 0);
    this.root.add([this.hint, this.status]);
    if (page === 'main') this.buildMain();
    else this.buildKeys();
    this.refresh();
  }

  private addRow(y: number, label: string, x = 70, w = 340) {
    const hit = this.add.rectangle(x - 8, y - 4, w, 15, 0x000000, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
    const l = text(this, x, y, label);
    const row: Row = { y, label: l, hit };
    const i = this.rows.length;
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.select(i, this.col));
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.capturing || p.button !== 0) return;
      this.select(i, this.col);
      this.activate(p.x);
    });
    this.root.add([hit, l]);
    this.rows.push(row);
    return row;
  }

  private buildMain() {
    const labels = ['VOLUME GERAL', 'MUSICA', 'EFEITOS', 'TELA CHEIA', 'ATALHOS DO CONTROLE', 'VOLTAR'];
    labels.forEach((l, i) => {
      const row = this.addRow(64 + i * 24, l);
      if (i < 3) {
        row.bar = this.add.graphics();
        row.value = text(this, 380, row.y, '');
        this.root.add([row.bar, row.value]);
      } else if (i === 3) {
        row.value = text(this, 250, row.y, '');
        this.root.add(row.value);
      }
    });
    this.hint.setText('CIMA/BAIXO ESCOLHE   ESQ/DIR AJUSTA   ESC VOLTA');
  }

  private buildKeys() {
    const header = [text(this, 24, 34, 'ACAO', '#b890ff'), ...COL_X.map((x, i) => text(this, x + 4, 34, `ATALHO ${i + 1}`, '#b890ff'))];
    this.root.add(header);
    ACTION_LABELS.forEach(([action, label], i) => {
      const y = 48 + i * ROW_H;
      const l = text(this, 24, y, label);
      l.setData('action', action);
      this.root.add(l);
      const rowCells: Phaser.GameObjects.Rectangle[] = [];
      const rowTexts: Phaser.GameObjects.Text[] = [];
      for (let s = 0; s < SLOTS; s++) {
        const cell = this.add.rectangle(COL_X[s], y - 3, SLOT_W, 13, 0x16122a, 0.9).setOrigin(0).setStrokeStyle(1, 0x3a3350).setInteractive({ useHandCursor: true });
        const t = text(this, COL_X[s] + 4, y, '');
        cell.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => !this.capturing && this.select(i, s));
        cell.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
          if (this.capturing) return;
          this.select(i, s);
          if (p.button === 2) this.clearSlot(action, s);
          else if (p.button === 0) this.startCapture(action, s);
        });
        this.root.add([cell, t]);
        rowCells.push(cell);
        rowTexts.push(t);
      }
      this.cells.push(rowCells);
      this.cellText.push(rowTexts);
      this.rows.push({ y, label: l, hit: rowCells[0] });
    });
    const by = 48 + ACTION_LABELS.length * ROW_H + 6;
    this.addRow(by, 'RESTAURAR PADRAO', 30, 200);
    this.addRow(by + 15, 'VOLTAR', 30, 200);
    this.hint.setText('ENTER: TROCAR   DELETE: LIMPAR   ESC: VOLTAR');
  }

  // ---------------------------------------------------------------- estado

  private get keyRows() {
    return ACTION_LABELS.length;
  }

  private select(i: number, col = this.col) {
    const changed = i !== this.index || col !== this.col;
    this.index = i;
    this.col = col;
    if (changed) audio.play('select');
    this.refresh();
  }

  private refresh() {
    const s = loadSettings();
    if (this.page === 'main') {
      const vols = [s.volume.master, s.volume.music, s.volume.sfx];
      this.rows.forEach((row, i) => {
        row.label.setColor(i === this.index ? '#ffcf3a' : '#e8e0ff');
        if (row.bar) {
          const g = row.bar.clear();
          for (let k = 0; k < 10; k++) {
            g.fillStyle(k < vols[i] ? (i === this.index ? 0xffcf3a : 0x8ff0ff) : 0x2a2440, 1).fillRect(250 + k * 12, row.y, 10, 8);
          }
          row.value?.setText(String(vols[i]));
        }
        if (i === 3) row.value?.setText(this.scale.isFullscreen ? '< LIGADA >' : '< DESLIGADA >');
      });
      const r = this.rows[this.index];
      this.cursor.setPosition(60, r.y - 4).setSize(360, 15);
      return;
    }
    // atalhos
    ACTION_LABELS.forEach(([action], i) => {
      const list = s.bindings[action] ?? [];
      const empty = list.length === 0;
      this.rows[i].label.setColor(empty ? '#ff5a5a' : i === this.index ? '#ffcf3a' : '#e8e0ff');
      for (let k = 0; k < SLOTS; k++) {
        const sel = i === this.index && k === this.col;
        const cap = this.capturing && this.capturing.action === action && this.capturing.slot === k;
        this.cells[i][k].setFillStyle(cap ? 0x5a2a10 : sel ? 0x2a1a50 : 0x16122a, 0.95).setStrokeStyle(1, sel || cap ? 0xffcf3a : 0x3a3350);
        this.cellText[i][k].setText(cap ? 'APERTE...' : bindingLabel(list[k])).setColor(cap ? '#ffcf3a' : list[k] ? '#ffffff' : '#4a4468');
      }
    });
    const onButtons = this.index >= this.keyRows;
    this.cursor.setVisible(onButtons);
    if (onButtons) {
      const r = this.rows[this.index];
      this.cursor.setPosition(22, r.y - 4).setSize(200, 15);
    }
    this.rows.slice(this.keyRows).forEach((r, k) => r.label.setColor(this.index === this.keyRows + k ? '#ffcf3a' : '#e8e0ff'));
  }

  private say(msg: string, bad = false) {
    this.status.setText(msg).setColor(bad ? '#ff5a5a' : '#ffcf3a').setAlpha(1);
    this.tweens.killTweensOf(this.status);
    this.tweens.add({ targets: this.status, alpha: 0, delay: 1600, duration: 400 });
  }

  // ---------------------------------------------------------------- ações

  private adjust(d: number) {
    const s = loadSettings();
    if (this.page !== 'main') return;
    const keys = ['master', 'music', 'sfx'] as const;
    if (this.index < 3) {
      const k = keys[this.index];
      s.volume[k] = Phaser.Math.Clamp(s.volume[k] + d, 0, 10);
      saveSettings(s);
      audio.play('select');
      this.refresh();
    } else if (this.index === 3) {
      this.toggleFullscreen();
    }
  }

  private toggleFullscreen() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
    audio.play('confirm');
    this.time.delayedCall(150, () => this.refresh());
  }

  /** ENTER / clique na linha selecionada. `px` é o x do clique (para as barras de volume). */
  private activate(px?: number) {
    if (this.page === 'main') {
      if (this.index < 3) {
        if (px !== undefined && px >= 248) {
          const s = loadSettings();
          const k = (['master', 'music', 'sfx'] as const)[this.index];
          s.volume[k] = Phaser.Math.Clamp(Math.round((px - 248) / 12 + 0.5), 0, 10);
          saveSettings(s);
          audio.play('select');
          this.refresh();
        }
        return;
      }
      if (this.index === 3) return this.toggleFullscreen();
      if (this.index === 4) {
        audio.play('confirm');
        return this.buildPage('keys');
      }
      return this.back();
    }
    if (this.index < this.keyRows) return this.startCapture(ACTION_LABELS[this.index][0], this.col);
    if (this.index === this.keyRows) {
      resetBindings();
      audio.play('confirm');
      this.say('ATALHOS PADRAO RESTAURADOS');
      return this.refresh();
    }
    audio.play('back');
    this.buildPage('main');
    this.index = 4;
    this.refresh();
  }

  private back() {
    audio.play('back');
    if (this.page === 'keys') {
      this.buildPage('main');
      this.index = 4;
      this.refresh();
      return;
    }
    this.cameras.main.fadeOut(200);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Menu'));
  }

  private startCapture(action: Action, slot: number) {
    this.capturing = { action, slot, since: this.time.now };
    audio.play('confirm');
    this.hint.setText('APERTE UMA TECLA OU BOTAO DO MOUSE  (ESC CANCELA)');
    this.refresh();
  }

  private endCapture() {
    this.capturing = null;
    this.hint.setText('ENTER: TROCAR   DELETE: LIMPAR   ESC: VOLTAR');
    this.refresh();
  }

  private clearSlot(action: Action, slot: number) {
    const s = loadSettings();
    const list = [...(s.bindings[action] ?? [])];
    if (!list[slot]) return;
    list.splice(slot, 1);
    s.bindings[action] = list;
    saveSettings(s);
    audio.play('back');
    if (!list.length) this.say(`${this.actionName(action)} FICOU SEM ATALHO`, true);
    this.refresh();
  }

  private actionName(a: Action) {
    return ACTION_LABELS.find(([x]) => x === a)?.[1] ?? a;
  }

  /** Grava o novo atalho; se ele já era usado por outra ação, sai de lá. */
  private assign(b: Binding) {
    const cap = this.capturing!;
    const s = loadSettings();
    let moved = '';
    for (const [action] of ACTION_LABELS) {
      const list = s.bindings[action] ?? [];
      const idx = list.findIndex((x) => sameBinding(x, b));
      if (idx >= 0 && !(action === cap.action && idx === cap.slot)) {
        list.splice(idx, 1);
        s.bindings[action] = list;
        if (action !== cap.action) moved = this.actionName(action);
      }
    }
    const list = [...(s.bindings[cap.action] ?? [])];
    if (cap.slot < list.length) list[cap.slot] = b;
    else list.push(b);
    s.bindings[cap.action] = list.slice(0, SLOTS);
    saveSettings(s);
    audio.play('power');
    this.say(moved ? `${bindingLabel(b)} SAIU DE ${moved}` : `${this.actionName(cap.action)}: ${bindingLabel(b)}`, !!moved);
    this.endCapture();
  }

  // ---------------------------------------------------------------- entrada

  private onKey(e: KeyboardEvent) {
    const name = keyNameFromCode(e.keyCode);
    if (this.capturing) {
      if (name === 'ESC') {
        audio.play('back');
        return this.endCapture();
      }
      if (!name || RESERVED_KEYS.has(name)) return;
      return this.assign({ kind: 'key', code: name });
    }
    const main = this.page === 'main';
    const count = this.rows.length;
    switch (name) {
      case 'UP':
      case 'W':
        return this.select((this.index + count - 1) % count);
      case 'DOWN':
      case 'S':
        return this.select((this.index + 1) % count);
      case 'LEFT':
      case 'A':
        return main ? this.adjust(-1) : this.select(this.index, (this.col + SLOTS - 1) % SLOTS);
      case 'RIGHT':
      case 'D':
        return main ? this.adjust(1) : this.select(this.index, (this.col + 1) % SLOTS);
      case 'ENTER':
      case 'SPACE':
      case 'J':
      case 'Z':
        return this.activate();
      case 'DELETE':
        if (!main && this.index < this.keyRows) this.clearSlot(ACTION_LABELS[this.index][0], this.col);
        return;
      case 'ESC':
      case 'BACKSPACE':
        return this.back();
    }
  }

  private onPointerCapture(p: Phaser.Input.Pointer) {
    // o próprio clique que abriu a captura não conta
    if (!this.capturing || this.time.now - this.capturing.since < 150) return;
    const button = mouseButtonFromIndex(p.button);
    if (button) this.assign({ kind: 'mouse', button });
  }
}
