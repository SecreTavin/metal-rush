import Phaser from 'phaser';

export type Action = 'left' | 'right' | 'up' | 'down' | 'primary' | 'secondary' | 'jump' | 'grenade' | 'dash';

export type MouseButton = 'left' | 'right' | 'middle';

/** Um atalho: tecla do teclado ou botão do mouse. */
export type Binding = { kind: 'key'; code: string } | { kind: 'mouse'; button: MouseButton };

const key = (code: string): Binding => ({ kind: 'key', code });
const mouse = (button: MouseButton): Binding => ({ kind: 'mouse', button });

/**
 * Atalhos padrão. Uma futura tela de configuração só precisa editar uma cópia
 * desta tabela e passá-la para `new Controls(scene, bindings)`.
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
};

const BUTTON_INDEX: Record<MouseButton, number> = { left: 0, middle: 1, right: 2 };

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

  constructor(scene: Phaser.Scene, bindings: Record<Action, Binding[]> = DEFAULT_BINDINGS) {
    const kb = scene.input.keyboard!;
    this.pointer = scene.input.activePointer;
    this.keys = {} as Record<Action, Phaser.Input.Keyboard.Key[]>;
    this.mouse = {} as Record<Action, number[]>;
    for (const action of Object.keys(bindings) as Action[]) {
      this.keys[action] = bindings[action].flatMap((b) => (b.kind === 'key' ? [kb.addKey(b.code)] : []));
      this.mouse[action] = bindings[action].flatMap((b) => (b.kind === 'mouse' ? [BUTTON_INDEX[b.button]] : []));
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
