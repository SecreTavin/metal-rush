export type EnemyBehavior = 'shooter' | 'rusher';

export interface EnemyDef {
  /** Chave do spritesheet (frames 0 parado, 1-2 correndo, 3 pulando). */
  texture: string;
  /** Arma desenhada na mão (opcional). */
  weapon?: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  /** Distância em que o inimigo percebe o jogador. */
  range: number;
  score: number;
  fireRate?: number;
  bulletSpeed?: number;
  /** Causa dano ao encostar no jogador. */
  contactDamage?: boolean;
}

/*
 * Para criar um novo inimigo: adicione uma entrada aqui, gere/carregue a textura
 * e use a chave no level (src/level/level1.ts).
 */
export const ENEMIES = {
  soldier: {
    texture: 'enemy_soldier',
    weapon: 'gun_rifle',
    behavior: 'shooter',
    hp: 1,
    speed: 45,
    range: 280,
    score: 100,
    fireRate: 1800,
    bulletSpeed: 150,
  },
  rusher: {
    texture: 'enemy_rusher',
    weapon: 'knife',
    behavior: 'rusher',
    hp: 2,
    speed: 95,
    range: 300,
    score: 150,
    contactDamage: true,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyType = keyof typeof ENEMIES;
