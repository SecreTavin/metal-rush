/*
 * Skills da run. O jogador escolhe 1 de 3 em terminais de upgrade e após cada chefe.
 * Cada skill pode ter vários níveis (acumula). Os efeitos são lidos pelo jogo via `skillStats()`.
 */

export type Rarity = 'common' | 'rare' | 'epic';

export interface SkillDef {
  id: string;
  name: string;
  /** Descrição curta (a fonte tem 8px: ~15 caracteres por linha). */
  desc: string;
  /** Ícone: até 3 caracteres desenhados no cartão. */
  icon: string;
  rarity: Rarity;
  max: number;
  /** Custo para desbloquear no Laboratório (0 = já vem desbloqueada). */
  unlockCost: number;
}

export const SKILLS: SkillDef[] = [
  { id: 'clock', name: 'CLOCK ALTO', desc: 'DISPAROS 20% MAIS RAPIDOS', icon: '>>', rarity: 'common', max: 3, unlockCost: 0 },
  { id: 'ram', name: 'MAIS RAM', desc: '+2 DE VIDA MAXIMA E CURA 2', icon: '+', rarity: 'common', max: 3, unlockCost: 0 },
  { id: 'crit', name: 'STACK OVERFLOW', desc: '15% DE CHANCE DE DANO X3', icon: '!!', rarity: 'common', max: 3, unlockCost: 0 },
  { id: 'backup', name: 'BACKUP', desc: '+4 PENDRIVES EMP', icon: 'USB', rarity: 'common', max: 3, unlockCost: 0 },
  { id: 'keyboard', name: 'TECLADO MECANICO', desc: 'GOLPE DO MACBOOK X3 E MAIS LONGE', icon: '[K]', rarity: 'common', max: 2, unlockCost: 0 },
  { id: 'cache', name: 'CACHE HIT', desc: 'IMA DE FRAGMENTOS E +50% VALOR', icon: '$', rarity: 'common', max: 2, unlockCost: 0 },
  { id: 'gc', name: 'GARBAGE COLLECTOR', desc: 'ROBOS PODEM SOLTAR CURA', icon: 'GC', rarity: 'common', max: 2, unlockCost: 0 },
  { id: 'multithread', name: 'MULTITHREAD', desc: '+1 PROJETIL POR DISPARO', icon: '|||', rarity: 'rare', max: 2, unlockCost: 0 },
  { id: 'deeplink', name: 'DEEP LINK', desc: 'TIROS ATRAVESSAM +1 ROBO', icon: '->', rarity: 'rare', max: 2, unlockCost: 0 },
  { id: 'ricochet', name: 'RICOCHETE', desc: 'TIROS QUICAM EM PAREDES E CHAO', icon: '/\\', rarity: 'rare', max: 1, unlockCost: 40 },
  { id: 'firewall', name: 'FIREWALL', desc: 'ESCUDO BLOQUEIA 1 GOLPE (12S)', icon: '[#]', rarity: 'rare', max: 1, unlockCost: 60 },
  { id: 'panic', name: 'KERNEL PANIC', desc: 'AO SER ATINGIDO SOLTA UM EMP', icon: '(!)', rarity: 'rare', max: 1, unlockCost: 50 },
  { id: 'sudo', name: 'SUDO JUMP', desc: 'PULO DUPLO', icon: '^^', rarity: 'rare', max: 1, unlockCost: 45 },
  { id: 'fork', name: 'FORK()', desc: 'TIROS SE DIVIDEM AO ACERTAR', icon: '{}', rarity: 'epic', max: 1, unlockCost: 90 },
  { id: 'rollback', name: 'ROLLBACK', desc: 'ESQUIVA INVENCIVEL (SHIFT / I)', icon: '<<', rarity: 'epic', max: 1, unlockCost: 80 },
  { id: 'cluster', name: 'PENDRIVE CLUSTER', desc: 'EMP SOLTA 3 MINI-EMPS', icon: '***', rarity: 'epic', max: 1, unlockCost: 100 },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<string, SkillDef>;

export const RARITY_COLOR: Record<Rarity, string> = { common: '#8ff0ff', rare: '#ffcf3a', epic: '#ff5aff' };
const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 30, epic: 10 };

/** Níveis de cada skill que o jogador tem nesta run. */
export type SkillLevels = Record<string, number>;

/** Atributos derivados das skills (consultados por jogador, projéteis e cena). */
export interface SkillStats {
  fireRateMul: number;
  extraShots: number;
  pierce: number;
  ricochet: boolean;
  fork: boolean;
  critChance: number;
  meleeMul: number;
  meleeRange: number;
  shieldCooldown: number | null;
  panic: boolean;
  doubleJump: boolean;
  dash: boolean;
  cluster: boolean;
  magnet: number;
  fragmentMul: number;
  healDropChance: number;
}

export function skillStats(levels: SkillLevels): SkillStats {
  const l = (id: string) => levels[id] ?? 0;
  return {
    fireRateMul: Math.pow(0.8, l('clock')),
    extraShots: l('multithread'),
    pierce: l('deeplink'),
    ricochet: l('ricochet') > 0,
    fork: l('fork') > 0,
    critChance: 0.15 * l('crit'),
    meleeMul: l('keyboard') ? 3 * l('keyboard') : 1,
    meleeRange: 30 + l('keyboard') * 10,
    shieldCooldown: l('firewall') ? 12000 : null,
    panic: l('panic') > 0,
    doubleJump: l('sudo') > 0,
    dash: l('rollback') > 0,
    cluster: l('cluster') > 0,
    magnet: 40 + l('cache') * 60,
    fragmentMul: 1 + l('cache') * 0.5,
    healDropChance: 0.1 * l('gc'),
  };
}

/** Sorteia `count` skills distintas (ponderadas por raridade) entre as disponíveis. */
export function rollSkills(levels: SkillLevels, unlocked: Set<string>, count: number, rng: () => number): SkillDef[] {
  const pool = SKILLS.filter((s) => (s.unlockCost === 0 || unlocked.has(s.id)) && (levels[s.id] ?? 0) < s.max);
  const picked: SkillDef[] = [];
  while (picked.length < count && pool.length) {
    const total = pool.reduce((a, s) => a + RARITY_WEIGHT[s.rarity], 0);
    let r = rng() * total;
    const idx = pool.findIndex((s) => (r -= RARITY_WEIGHT[s.rarity]) < 0);
    picked.push(pool.splice(idx < 0 ? 0 : idx, 1)[0]);
  }
  return picked;
}
