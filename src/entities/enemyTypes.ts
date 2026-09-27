export type EnemyBehavior = 'shooter' | 'hunter' | 'infected';

export interface EnemyDef {
  /** Spritesheet 40x56: 0-3 parado, 4-9 andando, 10-11 ataque, 12-14 desabando. */
  texture: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  /** Distância em que o inimigo percebe o jogador. */
  range: number;
  score: number;
  /** Tiro: intervalo (ms), velocidade e saída do cano relativa ao centro (virado para a direita). */
  fireRate?: number;
  bulletSpeed?: number;
  muzzle?: { x: number; y: number };
  /** Garras: alcance do golpe e intervalo entre ataques. */
  clawReach?: number;
  clawCooldown?: number;
  /** Posição do olho relativa ao centro (para o brilho vermelho). */
  eye: { x: number; y: number };
  /** Peças que voam ao ser destruído (quadros de bot_parts). */
  debris: number[];
}

/*
 * Robôs-esqueleto corrompidos por vírus. Para criar um novo inimigo: adicione uma
 * entrada aqui, gere o spritesheet (tools/enemy/build_enemy.py) e use a chave no level.
 */
export const ENEMIES = {
  /** Exterminador: anda devagar, mantém distância e dispara plasma. */
  exterminator: {
    texture: 'bot_soldier',
    behavior: 'shooter',
    hp: 2,
    speed: 40,
    range: 280,
    score: 150,
    fireRate: 1900,
    bulletSpeed: 160,
    muzzle: { x: 19, y: -4 },
    eye: { x: 1, y: -18 },
    debris: [0, 1, 2, 3],
  },
  /** Rastreador: corre curvado até o jogador e ataca com as garras. */
  hunter: {
    texture: 'bot_hunter',
    behavior: 'hunter',
    hp: 2,
    speed: 100,
    range: 300,
    score: 200,
    clawReach: 26,
    clawCooldown: 900,
    eye: { x: 7, y: -12 },
    debris: [0, 1, 1, 3],
  },
  /** Infectado: Rastreador tomado pelo worm; anda aos trancos, dá botes e deixa uma poça de vírus ao morrer. */
  infected: {
    texture: 'bot_infected',
    behavior: 'infected',
    hp: 3,
    speed: 90,
    range: 320,
    score: 250,
    clawReach: 26,
    clawCooldown: 800,
    eye: { x: 7, y: -12 },
    debris: [0, 1, 3, 3],
  },
} satisfies Record<string, EnemyDef>;

export type EnemyType = keyof typeof ENEMIES;
