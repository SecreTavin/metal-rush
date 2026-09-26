import type { EnemyType } from '../entities/enemyTypes';

export interface LevelData {
  name: string;
  width: number;
  /** Jogador vence ao passar deste x. */
  goalX: number;
  /** Trechos de chão (espaços entre eles viram buracos). */
  ground: { x: number; w: number }[];
  /** Coberturas sólidas apoiadas no chão (bloqueiam tiros). */
  blocks: { x: number; w: number; h: number }[];
  /** Plataformas de mão única (dá para subir por baixo). y = topo. */
  platforms: { x: number; y: number; w: number }[];
  /** Inimigos aparecem quando a câmera se aproxima de x. y opcional (padrão: chão). */
  spawns: { x: number; type: EnemyType; y?: number }[];
  pickups: { x: number; kind: 'heavy' | 'bombs'; y?: number }[];
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
    { x: 420, w: 32, h: 16 },
    { x: 1000, w: 48, h: 24 },
    { x: 1700, w: 32, h: 16 },
    { x: 2320, w: 64, h: 32 },
    { x: 3050, w: 32, h: 16 },
    { x: 3500, w: 48, h: 24 },
  ],
  platforms: [
    { x: 700, y: 180, w: 112 },
    { x: 1250, y: 172, w: 128 },
    { x: 1900, y: 176, w: 96 },
    { x: 2040, y: 140, w: 96 },
    { x: 2700, y: 172, w: 144 },
    { x: 3300, y: 176, w: 112 },
  ],
  spawns: [
    { x: 520, type: 'soldier' },
    { x: 620, type: 'soldier' },
    { x: 760, type: 'soldier', y: 150 },
    { x: 900, type: 'rusher' },
    { x: 1100, type: 'soldier' },
    { x: 1180, type: 'soldier' },
    { x: 1300, type: 'soldier', y: 140 },
    { x: 1600, type: 'rusher' },
    { x: 1650, type: 'rusher' },
    { x: 1800, type: 'soldier' },
    { x: 2080, type: 'soldier', y: 110 },
    { x: 2200, type: 'soldier' },
    { x: 2420, type: 'soldier' },
    { x: 2480, type: 'rusher' },
    { x: 2760, type: 'soldier', y: 140 },
    { x: 2850, type: 'soldier' },
    { x: 2950, type: 'rusher' },
    { x: 3150, type: 'soldier' },
    { x: 3250, type: 'soldier' },
    { x: 3350, type: 'soldier', y: 145 },
    { x: 3560, type: 'rusher' },
    { x: 3600, type: 'rusher' },
    { x: 3700, type: 'soldier' },
    { x: 3780, type: 'soldier' },
  ],
  pickups: [
    { x: 860, kind: 'heavy' },
    { x: 2100, kind: 'bombs', y: 120 },
    { x: 2900, kind: 'heavy' },
  ],
};
