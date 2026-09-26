export interface WeaponDef {
  label: string;
  /** Quadro do MacBook (0 normal, 2 overclock). O quadro 1 é o clarão do disparo. */
  laptopFrame: number;
  bullet: string;
  /** Efeito de impacto do projétil. */
  impact: string;
  /** Intervalo mínimo entre tiros segurando o botão (ms). */
  fireRate: number;
  speed: number;
  damage: number;
  /** Variação aleatória do ângulo (radianos). */
  spread: number;
  ammo: number;
  /** Cor dos bits que saltam do teclado a cada disparo. */
  bitsTint: number;
}

export const WEAPONS = {
  code: {
    label: 'CODE BOLT',
    laptopFrame: 0,
    bullet: 'bolt_code',
    impact: 'bolt_hit',
    fireRate: 200,
    speed: 400,
    damage: 1,
    spread: 0,
    ammo: Infinity,
    bitsTint: 0x8ff0ff,
  },
  overclock: {
    label: 'OVERCLOCK',
    laptopFrame: 2,
    bullet: 'bolt_oc',
    impact: 'bolt_hit',
    fireRate: 70,
    speed: 480,
    damage: 1,
    spread: 0.07,
    ammo: 200,
    bitsTint: 0xff8cf5,
  },
} satisfies Record<string, WeaponDef>;

export type WeaponKey = keyof typeof WEAPONS;
