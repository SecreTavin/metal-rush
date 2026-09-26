import Phaser from 'phaser';

export type Action = 'left' | 'right' | 'up' | 'down' | 'shoot' | 'jump' | 'grenade' | 'dash';

const BINDINGS: Record<Action, string[]> = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  shoot: ['J', 'Z'],
  jump: ['K', 'X', 'SPACE'],
  grenade: ['L', 'C'],
  dash: ['SHIFT', 'I'],
};

/** Camada de entrada: o jogo só pergunta por ações, nunca por teclas. Facilita adicionar gamepad/toque depois. */
export class Controls {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = Object.fromEntries(
      Object.entries(BINDINGS).map(([action, codes]) => [action, codes.map((c) => kb.addKey(c))]),
    ) as Record<Action, Phaser.Input.Keyboard.Key[]>;
  }

  isDown(action: Action) {
    return this.keys[action].some((k) => k.isDown);
  }

  /** Verdadeiro apenas no frame em que a tecla foi pressionada. Chamar uma vez por frame por ação. */
  justDown(action: Action) {
    return this.keys[action].some((k) => Phaser.Input.Keyboard.JustDown(k));
  }
}
