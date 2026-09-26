import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { BlockKind, LevelData, ThemeId } from '../level/types';
import type { GameScene } from '../scenes/GameScene';

/**
 * Um tema define o visual de uma missão: texturas (fundo, chão, plataformas, decoração),
 * o cenário animado ao fundo (atores que se movem sozinhos) e o clima (chuva, faíscas...).
 * As chaves de textura são prefixadas com o id do tema.
 */
export interface Theme {
  id: ThemeId;
  /** Gera as texturas do tema (idempotente: pode ser chamado a cada início de fase). */
  generate(scene: Phaser.Scene, level: LevelData): void;
  /** Camadas de parallax + atores de fundo animados. */
  background(gs: GameScene, level: LevelData): void;
  /** Clima e partículas de ambiente. */
  ambience(gs: GameScene, level: LevelData): void;
  /** Texturas do chão (repetem na horizontal) e dos buracos. */
  ground: { fill: string; top: string; edge: string; pit: string };
  /** Texturas geradas sob demanda por tamanho. */
  ledge(scene: Phaser.Scene, w: number): string;
  pillar(scene: Phaser.Scene, h: number): string;
  block(scene: Phaser.Scene, kind: BlockKind, w: number, h: number): string;
  mover(scene: Phaser.Scene, w: number): string;
  crumble(scene: Phaser.Scene, w: number): string;
  /** Decoração (`${id}_decor_${kind}`) e primeiro plano (`${id}_fg_${kind}`) já gerados em generate(). */
  /** Cor do brilho que sobe dos buracos (lava, energia...) ou undefined. */
  pitGlow?: number;
  /** Paleta de fundo do menu (camadas a exibir). */
  menuLayers: string[];
}

/** Fatores de parallax padrão das camadas. */
export const PARALLAX = { far: 0.12, mid: 0.3, near: 0.55, fg: 1.25 } as const;

/** Largura necessária para uma camada cobrir a fase inteira sem repetir. */
export const layerWidth = (levelWidth: number, factor: number) =>
  Math.ceil(GAME_WIDTH + (levelWidth - GAME_WIDTH) * factor) + 8;

/** Adiciona uma camada de fundo com parallax. */
export function addLayer(gs: Phaser.Scene, key: string, factor: number, depth: number, y = 0) {
  return gs.add.image(0, y, key).setOrigin(0).setScrollFactor(factor).setDepth(depth);
}

/** Converte uma posição x da fase para a coordenada de uma camada com parallax. */
export const layerX = (worldX: number, factor: number) => (worldX - GAME_WIDTH / 2) * factor + GAME_WIDTH / 2;

/** Camadas de profundidade usadas por temas e mundo. */
export const DEPTH = {
  sky: -20,
  far: -18,
  farActors: -17,
  mid: -15,
  midActors: -14,
  near: -12,
  nearActors: -11,
  pit: -9,
  decor: -8,
  interactive: -7,
  pillar: -6,
  hazardBack: -5,
  ground: -4,
  lip: -3,
  world: -2,
  pickup: 8,
  hazardFront: 12,
  weather: 30,
  foreground: 40,
} as const;

/** Executa `fn` a cada quadro enquanto a cena atual existir (remove o ouvinte ao reiniciar a cena). */
export function onUpdate(scene: Phaser.Scene, fn: () => void) {
  scene.events.on(Phaser.Scenes.Events.UPDATE, fn);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, fn));
}
