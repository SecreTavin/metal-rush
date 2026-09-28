import Phaser from 'phaser';
import { loadSettings } from '../run/settings';

export type Action = 'left' | 'right' | 'up' | 'down' | 'primary' | 'secondary' | 'jump' | 'grenade' | 'dash' | 'skill1' | 'skill2';

export type MouseButton = 'left' | 'right' | 'middle';

/** Um atalho: tecla do teclado ou botão do mouse. */
export type Binding = { kind: 'key'; code: string } | { kind: 'mouse'; button: MouseButton };

const key = (code: string): Binding => ({ kind: 'key', code });
const mouse = (button: MouseButton): Binding => ({ kind: 'mouse', button });

/**
 * Atalhos padrão. A tela de Opções edita uma cópia desta tabela (salva em settings.ts),
 * que é usada por `new Controls(scene)`.
 */
export const DEFAULT_BINDINGS: Record<Action, Binding[]> = {
  left: [key('LEFT'), key('A')],
  right: [key('RIGHT'), key('D')],
  up: [key('UP'), key('W')],
  down: [key('DOWN'), key('S')],
  primary: [mouse('left'), key('J'), key('Z')],
  secondary: [mouse('right'), key('U'), key('V')],
  jump: [key('K'), key('X'), key('SPACE')],
  grenade: [key('L'), key('C')],
  dash: [key('SHIFT'), key('I')],
  skill1: [key('Q')],
  skill2: [key('E')],
};

const BUTTON_INDEX: Record<MouseButton, number> = { left: 0, middle: 1, right: 2 };

/** Ações na ordem em que aparecem na tela de atalhos, com o nome exibido. */
export const ACTION_LABELS: [Action, string][] = [
  ['left', 'ESQUERDA'],
  ['right', 'DIREITA'],
  ['up', 'CIMA / MIRAR'],
  ['down', 'BAIXO'],
  ['jump', 'PULAR'],
  ['primary', 'ARMA 1'],
  ['secondary', 'ARMA 2'],
  ['grenade', 'GRANADA'],
  ['skill1', 'SKILL 1'],
  ['skill2', 'SKILL 2'],
  ['dash', 'ESQUIVA'],
];

/** Teclas que não podem ser atribuídas (ESC cancela e volta nos menus). */
export const RESERVED_KEYS = new Set(['ESC']);

const KEY_NAMES: Record<string, string> = {
  LEFT: 'SETA ESQ', RIGHT: 'SETA DIR', UP: 'SETA CIMA', DOWN: 'SETA BAIXO', SPACE: 'ESPAÇO',
  ENTER: 'ENTER', SHIFT: 'SHIFT', CTRL: 'CTRL', ALT: 'ALT', TAB: 'TAB', BACKSPACE: 'APAGAR',
  ZERO: '0', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9',
  COMMA: ',', PERIOD: '.', SEMICOLON: 'Ç / ;', FORWARD_SLASH: '/', BACK_SLASH: '\\', MINUS: '-', PLUS: '=',
  OPEN_BRACKET: '[', CLOSED_BRACKET: ']', QUOTES: "'", BACKTICK: '`', CAPS_LOCK: 'CAPS',
};
const MOUSE_NAMES: Record<MouseButton, string> = { left: 'CLIQUE ESQ', right: 'CLIQUE DIR', middle: 'CLIQUE MEIO' };

/** Nome curto de um atalho para exibir na tela. */
export function bindingLabel(b: Binding | undefined) {
  if (!b) return '---';
  if (b.kind === 'mouse') return MOUSE_NAMES[b.button];
  return KEY_NAMES[b.code] ?? b.code.replace('NUMPAD_', 'NUM ').replace('_', ' ');
}

/** Nome do Phaser (KeyCodes) para um keyCode do navegador. */
export function keyNameFromCode(keyCode: number): string | null {
  const codes = Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>;
  const found = Object.keys(codes).find((k) => codes[k] === keyCode);
  return found ?? null;
}

/** Botão do mouse (índice do evento) como MouseButton. */
export function mouseButtonFromIndex(i: number): MouseButton | null {
  return i === 0 ? 'left' : i === 1 ? 'middle' : i === 2 ? 'right' : null;
}

export const sameBinding = (a: Binding, b: Binding) =>
  a.kind === b.kind && (a.kind === 'key' ? a.code === (b as typeof a).code : a.button === (b as typeof a).button);

/**
 * Camada de entrada: o jogo só pergunta por ações, nunca por teclas ou botões.
 * Chame `update()` uma vez por quadro, antes de ler as ações.
 */
export class Controls {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;
  private mouse: Record<Action, number[]>;
  /** Cliques que chegaram desde o último quadro (um clique rápido não se perde). */
  private pendingClicks = new Set<number>();
  private clickedThisFrame = new Set<number>();
  private pointer: Phaser.Input.Pointer;

  constructor(scene: Phaser.Scene, bindings: Record<Action, Binding[]> = loadSettings().bindings) {
    const kb = scene.input.keyboard!;
    this.pointer = scene.input.activePointer;
    this.keys = {} as Record<Action, Phaser.Input.Keyboard.Key[]>;
    this.mouse = {} as Record<Action, number[]>;
    for (const action of Object.keys(DEFAULT_BINDINGS) as Action[]) {
      const list = bindings[action] ?? [];
      this.keys[action] = list.flatMap((b) => (b.kind === 'key' ? [kb.addKey(b.code)] : []));
      this.mouse[action] = list.flatMap((b) => (b.kind === 'mouse' ? [BUTTON_INDEX[b.button]] : []));
    }
    const onDown = (p: Phaser.Input.Pointer) => this.pendingClicks.add(p.button);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, onDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.off(Phaser.Input.Events.POINTER_DOWN, onDown));
  }

  /** Atualiza o estado dos cliques deste quadro. */
  update() {
    this.clickedThisFrame = this.pendingClicks;
    this.pendingClicks = new Set();
  }

  private buttonDown(index: number) {
    const p = this.pointer;
    if (this.clickedThisFrame.has(index)) return true;
    if (index === 0) return p.leftButtonDown();
    if (index === 2) return p.rightButtonDown();
    return p.middleButtonDown();
  }

  isDown(action: Action) {
    return this.keys[action].some((k) => k.isDown) || this.mouse[action].some((b) => this.buttonDown(b));
  }

  /** Verdadeiro apenas no quadro em que a tecla/botão foi pressionado. Chamar uma vez por quadro por ação. */
  justDown(action: Action) {
    const key = this.keys[action].some((k) => Phaser.Input.Keyboard.JustDown(k));
    return key || this.mouse[action].some((b) => this.clickedThisFrame.has(b));
  }
}
