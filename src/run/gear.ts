/*
 * Equipamentos da run (estilo Dead Cells): armas de slot, skills ativas e granada.
 * O herói tem 2 armas (clique esquerdo / clique direito), até 2 skills (Q / E)
 * e 1 granada (L). Equipamentos aparecem em caches pela fase; o que é trocado cai no chão.
 */

export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type GearKind = 'weapon' | 'skill' | 'grenade';

export type WeaponId = 'macbook' | 'shield144' | 'vga';
export type AbilityId = 'morph' | 'pet';
export type GrenadeId = 'pendrive' | 'raspberry';
export type GearId = WeaponId | AbilityId | GrenadeId;

export interface GearDef {
  id: GearId;
  name: string;
  kind: GearKind;
  rarity: GearRarity;
  /** Descrição curta (fonte de 8px). */
  desc: string;
  /** Textura e quadro do ícone. */
  icon: { key: string; frame: number };
  /** Aparece nos caches da fase (itens iniciais não). */
  droppable: boolean;
}

export const GEAR: Record<GearId, GearDef> = {
  macbook: {
    id: 'macbook', name: 'MACBOOK', kind: 'weapon', rarity: 'common',
    desc: 'DISPARA CODIGO. INIMIGO COLADO LEVA GOLPE.',
    icon: { key: 'hero_laptop', frame: 0 }, droppable: false,
  },
  shield144: {
    id: 'shield144', name: 'ESCUDO 144HZ', kind: 'weapon', rarity: 'common',
    desc: 'SEGURE PARA DEFENDER. TIROS VOLTAM NOS INIMIGOS. 5 GOLPES = RECARGA DE 8S.',
    icon: { key: 'gear_icons', frame: 0 }, droppable: true,
  },
  vga: {
    id: 'vga', name: 'MASSAGEM DEV', kind: 'weapon', rarity: 'rare',
    desc: 'CHICOTE DE CABO VGA. ACERTO COM A PONTA CAUSA MAIS DANO.',
    icon: { key: 'gear_icons', frame: 2 }, droppable: true,
  },
  morph: {
    id: 'morph', name: 'TA NA HORA DE MORFAR', kind: 'skill', rarity: 'epic',
    desc: 'ARMADURA DE BRINQUEDO: IMORTAL POR 10S. RECARGA 30S.',
    icon: { key: 'gear_icons', frame: 1 }, droppable: true,
  },
  pet: {
    id: 'pet', name: 'SENIOR VIBE CODING', kind: 'skill', rarity: 'legendary',
    desc: 'CAO HOLOGRAFICO IMORTAL ATACA OS ROBOS POR 25S. RECARGA 60S.',
    icon: { key: 'gear_icons', frame: 3 }, droppable: true,
  },
  pendrive: {
    id: 'pendrive', name: 'PENDRIVE EMP', kind: 'grenade', rarity: 'common',
    desc: 'GRANADA EMP. MUNICAO LIMITADA.',
    icon: { key: 'usb', frame: 0 }, droppable: false,
  },
  raspberry: {
    id: 'raspberry', name: 'ARDUINO E VOLTANDO', kind: 'grenade', rarity: 'rare',
    desc: 'RASPBERRY BUMERANGUE INFINITO. RICOCHETEIA NO MAPA.',
    icon: { key: 'gear_icons', frame: 4 }, droppable: true,
  },
};

export const GEAR_RARITY_COLOR: Record<GearRarity, string> = {
  common: '#8ff0ff',
  rare: '#ffcf3a',
  epic: '#ff5aff',
  legendary: '#ff9a3a',
};

export const GEAR_RARITY_LABEL: Record<GearRarity, string> = {
  common: 'COMUM',
  rare: 'RARO',
  epic: 'EPICO',
  legendary: 'LENDARIO',
};

const RARITY_WEIGHT: Record<GearRarity, number> = { common: 45, rare: 32, epic: 16, legendary: 7 };

/** Tempos das skills ativas (ms). A recarga começa quando o efeito termina. */
export const ABILITY_TIMES: Record<AbilityId, { duration: number; cooldown: number }> = {
  morph: { duration: 10000, cooldown: 30000 },
  pet: { duration: 25000, cooldown: 60000 },
};

/** Equipamento atual da run. */
export interface Loadout {
  weapons: [WeaponId | null, WeaponId | null];
  abilities: [AbilityId | null, AbilityId | null];
  grenade: GrenadeId;
}

export const startingLoadout = (): Loadout => ({
  weapons: ['macbook', null],
  abilities: [null, null],
  grenade: 'pendrive',
});

export function equipped(l: Loadout): GearId[] {
  return [...l.weapons, ...l.abilities, l.grenade].filter((g): g is GearId => g !== null);
}

/** Sorteia um equipamento (ponderado por raridade) que o herói ainda não tem. */
export function rollGear(l: Loadout, rng: () => number, minRarity: GearRarity = 'common', exclude: GearId[] = []): GearId | null {
  const order: GearRarity[] = ['common', 'rare', 'epic', 'legendary'];
  const have = new Set([...equipped(l), ...exclude]);
  const pool = Object.values(GEAR).filter(
    (g) => g.droppable && !have.has(g.id) && order.indexOf(g.rarity) >= order.indexOf(minRarity),
  );
  if (!pool.length) return null;
  const total = pool.reduce((a, g) => a + RARITY_WEIGHT[g.rarity], 0);
  let r = rng() * total;
  return (pool.find((g) => (r -= RARITY_WEIGHT[g.rarity]) < 0) ?? pool[0]).id;
}
