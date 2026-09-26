import type { EnemyType } from '../entities/enemyTypes';
import type { BlockKind, DecorKind, ForegroundKind } from '../gfx/art/props';

export interface LevelData {
  name: string;
  width: number;
  /** Jogador vence ao passar deste x. */
  goalX: number;
  /** Trechos de chão (espaços entre eles viram buracos). */
  ground: { x: number; w: number }[];
  /** Coberturas sólidas apoiadas no chão (bloqueiam tiros). */
  blocks: { x: number; w: number; h: number; kind: BlockKind }[];
  /** Plataformas de mão única (dá para subir por baixo). y = topo. */
  platforms: { x: number; y: number; w: number }[];
  /** Inimigos aparecem quando a câmera se aproxima de x. y opcional (padrão: chão). */
  spawns: { x: number; type: EnemyType; y?: number }[];
  pickups: { x: number; kind: 'heavy' | 'bombs'; y?: number }[];
  /** Objetos decorativos atrás dos personagens (apoiados no chão). */
  decor: { x: number; kind: DecorKind }[];
  /** Folhagem na frente dos personagens (parallax mais rápido). */
  foreground: { x: number; kind: ForegroundKind }[];
}

export const LEVEL_1: LevelData = {
  name: 'MISSÃO 1',
  width: 4000,
  goalX: 3880,
  ground: [
    { x: 0, w: 1450 },
    { x: 1510, w: 2490 },
  ],
  blocks: [
    { x: 420, w: 32, h: 16, kind: 'sandbags' },
    { x: 1000, w: 48, h: 22, kind: 'sandbags' },
    { x: 1700, w: 24, h: 24, kind: 'crate' },
    { x: 2320, w: 56, h: 30, kind: 'rock' },
    { x: 3050, w: 32, h: 16, kind: 'sandbags' },
    { x: 3500, w: 24, h: 24, kind: 'crate' },
    { x: 3524, w: 24, h: 24, kind: 'crate' },
  ],
  platforms: [
    { x: 700, y: 168, w: 112 },
    { x: 1250, y: 160, w: 128 },
    { x: 1900, y: 164, w: 96 },
    { x: 2040, y: 128, w: 96 },
    { x: 2700, y: 160, w: 144 },
    { x: 3300, y: 164, w: 112 },
  ],
  spawns: [
    { x: 520, type: 'exterminator' },
    { x: 620, type: 'exterminator' },
    { x: 760, type: 'exterminator', y: 138 },
    { x: 900, type: 'hunter' },
    { x: 1100, type: 'exterminator' },
    { x: 1180, type: 'exterminator' },
    { x: 1300, type: 'exterminator', y: 130 },
    { x: 1600, type: 'hunter' },
    { x: 1650, type: 'hunter' },
    { x: 1800, type: 'exterminator' },
    { x: 2080, type: 'exterminator', y: 98 },
    { x: 2200, type: 'exterminator' },
    { x: 2420, type: 'exterminator' },
    { x: 2480, type: 'hunter' },
    { x: 2760, type: 'exterminator', y: 130 },
    { x: 2850, type: 'exterminator' },
    { x: 2950, type: 'hunter' },
    { x: 3150, type: 'exterminator' },
    { x: 3250, type: 'exterminator' },
    { x: 3350, type: 'exterminator', y: 134 },
    { x: 3580, type: 'hunter' },
    { x: 3620, type: 'hunter' },
    { x: 3700, type: 'exterminator' },
    { x: 3780, type: 'exterminator' },
  ],
  pickups: [
    { x: 860, kind: 'heavy' },
    { x: 2100, kind: 'bombs', y: 108 },
    { x: 2900, kind: 'heavy' },
  ],
  decor: [
    { x: 150, kind: 'tree' },
    { x: 300, kind: 'bush' },
    { x: 560, kind: 'idol' },
    { x: 640, kind: 'rubble' },
    { x: 950, kind: 'brokenColumn' },
    { x: 1080, kind: 'barrel' },
    { x: 1150, kind: 'bush' },
    { x: 1400, kind: 'rubble' },
    { x: 1580, kind: 'tree' },
    { x: 1780, kind: 'idol' },
    { x: 2200, kind: 'bush' },
    { x: 2260, kind: 'brokenColumn' },
    { x: 2560, kind: 'barrel' },
    { x: 2590, kind: 'barrel' },
    { x: 2640, kind: 'rubble' },
    { x: 2980, kind: 'tree' },
    { x: 3180, kind: 'idol' },
    { x: 3440, kind: 'bush' },
    { x: 3700, kind: 'brokenColumn' },
    { x: 3800, kind: 'rubble' },
  ],
  foreground: [
    { x: 380, kind: 'fern' },
    { x: 700, kind: 'vines' },
    { x: 1250, kind: 'fern' },
    { x: 1700, kind: 'vines' },
    { x: 2150, kind: 'fern' },
    { x: 2700, kind: 'vines' },
    { x: 3150, kind: 'fern' },
    { x: 3700, kind: 'vines' },
    { x: 4200, kind: 'fern' },
    { x: 4600, kind: 'fern' },
  ],
};
