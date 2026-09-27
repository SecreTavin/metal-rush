import type { EnemyType } from '../entities/enemyTypes';

export type ThemeId = 'city' | 'factory' | 'contagion' | 'core';

/** Chefes: um por missão. */
export type BossType = 'sentinel' | 'forger' | 'worm' | 'eye';

/** Coberturas sólidas apoiadas no chão (bloqueiam tiros). */
export type BlockKind = 'barricade' | 'crate' | 'container' | 'server';

/** Objetos destrutíveis: bloqueiam tiros e explodem/quebram ao receber dano. */
export type DestructibleKind = 'barrel' | 'car' | 'generator' | 'datanode';

/** Objetos que reagem ao jogador ou a tiros (sem colisão física). */
export type InteractiveKind = 'camera' | 'billboard' | 'lamp' | 'neon' | 'beacon';

export type HazardDef =
  /** Prensa hidráulica: desce com força periodicamente. */
  | { type: 'crusher'; x: number; period: number; phase?: number }
  /** Grade de laser vertical que liga e desliga. */
  | { type: 'laser'; x: number; top: number; period: number; onTime: number; phase?: number }
  /** Respiro de vapor / plataforma de salto: lança o jogador para cima. */
  | { type: 'vent'; x: number; power?: number }
  /** Cabo energizado caído numa poça: eletrifica o trecho periodicamente. */
  | { type: 'livewire'; x: number; w: number; period: number; phase?: number }
  /** Poça de vírus worm: fere quem pisa (sempre ativa, pulsa). */
  | { type: 'ooze'; x: number; w: number }
  /** Cabo-verme que estoura do chão periodicamente (rachaduras brilham antes). */
  | { type: 'burrow'; x: number; period: number; phase?: number };

export interface MoverDef {
  x: number;
  y: number;
  w: number;
  /** Deslocamento máximo em x e y (movimento senoidal ida e volta). */
  dx?: number;
  dy?: number;
  /** Duração de um ciclo completo (ms). */
  period: number;
  phase?: number;
}

export interface AmbushDef {
  /** A câmera trava quando chega neste x. */
  x: number;
  /** Ondas de inimigos; dx é a posição relativa à borda esquerda da tela. */
  waves: { type: EnemyType; dx: number; y?: number }[][];
}

export interface LevelData {
  id: string;
  name: string;
  subtitle: string;
  theme: ThemeId;
  width: number;
  /** Jogador vence ao passar deste x. */
  goalX: number;
  /** Trechos de chão (espaços entre eles viram buracos). */
  ground: { x: number; w: number }[];
  blocks: { x: number; w: number; h: number; kind: BlockKind }[];
  /** Plataformas fixas de mão única. y = topo. */
  platforms: { x: number; y: number; w: number }[];
  movers?: MoverDef[];
  /** Plataformas que desabam pouco depois de pisadas (e voltam depois). */
  crumbles?: { x: number; y: number; w: number }[];
  /** Plataformas de luz sólida que aparecem e somem. */
  phasers?: { x: number; y: number; w: number; period: number; phase?: number }[];
  /** Esteiras no chão: empurram jogador e inimigos (px/s, negativo = para a esquerda). */
  conveyors?: { x: number; w: number; speed: number }[];
  hazards?: HazardDef[];
  destructibles?: { x: number; kind: DestructibleKind }[];
  interactives?: { x: number; y?: number; kind: InteractiveKind }[];
  spawns: { x: number; type: EnemyType; y?: number }[];
  ambushes?: AmbushDef[];
  pickups: { x: number; kind: 'heavy' | 'bombs'; y?: number }[];
  /** Terminais de upgrade (escolha 1 de 3 skills). */
  terminals?: { x: number }[];
  /** Arena do chefe: a câmera trava em x e o chefe aparece. */
  boss?: { x: number; type: BossType };
  /** Decoração atrás dos personagens (as chaves dependem do tema). */
  decor: { x: number; kind: string }[];
  /** Elementos na frente dos personagens (parallax mais rápido). */
  foreground: { x: number; kind: string }[];
}
