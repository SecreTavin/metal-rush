export interface WeaponDef {
  label: string;
  texture: string;
  bullet: string;
  /** Intervalo mínimo entre tiros segurando o botão (ms). */
  fireRate: number;
  speed: number;
  damage: number;
  /** Variação aleatória do ângulo (radianos). */
  spread: number;
  ammo: number;
}

export const WEAPONS = {
  pistol: {
    label: 'PISTOLA',
    texture: 'gun_pistol',
    bullet: 'bullet',
    fireRate: 220,
    speed: 420,
    damage: 1,
    spread: 0,
    ammo: Infinity,
  },
  heavy: {
    label: 'HEAVY MACHINE GUN',
    texture: 'gun_heavy',
    bullet: 'bullet_heavy',
    fireRate: 70,
    speed: 480,
    damage: 1,
    spread: 0.08,
    ammo: 200,
  },
} satisfies Record<string, WeaponDef>;

export type WeaponKey = keyof typeof WEAPONS;
