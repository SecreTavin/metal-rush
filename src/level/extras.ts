import { chunk, Chunk } from './generator';

/*
 * Trechos extras de cada missão (x relativo ao início do trecho; primeiro plano em x do mundo).
 * Entram no sorteio junto com os trechos cortados das fases fonte e deixam cada run mais longa.
 */

// ============================================================== MISSÃO 1 — Ruínas de Neo-SP

export const EXTRAS_M1: Chunk[] = [
  // Avenida alagada: fios energizados e carros como cobertura
  chunk(820, 'mid', {
    ground: [{ x: 0, w: 820 }],
    blocks: [{ x: 300, w: 30, h: 22, kind: 'barricade' }],
    platforms: [{ x: 420, y: 160, w: 100 }],
    hazards: [
      { type: 'livewire', x: 180, w: 80, period: 2400 },
      { type: 'livewire', x: 560, w: 70, period: 2400, phase: 0.5 },
    ],
    destructibles: [{ x: 120, kind: 'car' }, { x: 680, kind: 'car' }, { x: 740, kind: 'barrel' }],
    interactives: [{ x: 80, kind: 'lamp' }, { x: 460, y: 181, kind: 'camera' }, { x: 640, kind: 'neon' }],
    spawns: [
      { x: 250, type: 'exterminator' },
      { x: 460, type: 'exterminator', y: 130 },
      { x: 620, type: 'hunter' },
      { x: 780, type: 'hunter' },
    ],
    pickups: [{ x: 470, kind: 'bombs', y: 140 }],
    decor: [{ x: 60, kind: 'hydrant' }, { x: 360, kind: 'trash' }, { x: 600, kind: 'weeds' }],
    foreground: [{ x: 300, kind: 'wires' }],
  }),
  // Viaduto desabado: buraco com plataformas que desabam
  chunk(760, 'mid', {
    ground: [{ x: 0, w: 260 }, { x: 420, w: 340 }],
    platforms: [{ x: 520, y: 150, w: 110 }],
    crumbles: [{ x: 276, y: 192, w: 48 }, { x: 340, y: 176, w: 48 }],
    hazards: [{ type: 'vent', x: 470, power: 560 }],
    destructibles: [{ x: 200, kind: 'barrel' }, { x: 700, kind: 'barrel' }],
    interactives: [{ x: 60, kind: 'lamp' }, { x: 560, kind: 'billboard' }],
    spawns: [
      { x: 180, type: 'hunter' },
      { x: 560, type: 'exterminator', y: 120 },
      { x: 650, type: 'exterminator' },
    ],
    pickups: [{ x: 560, kind: 'heavy', y: 130 }],
    decor: [{ x: 120, kind: 'barrier' }, { x: 680, kind: 'dumpster' }],
    foreground: [{ x: 350, kind: 'girder' }],
  }),
  // Praça da resistência: emboscada entre barricadas
  chunk(900, 'mid', {
    ground: [{ x: 0, w: 900 }],
    blocks: [{ x: 150, w: 30, h: 22, kind: 'barricade' }, { x: 720, w: 40, h: 30, kind: 'container' }],
    platforms: [{ x: 360, y: 160, w: 110 }],
    destructibles: [{ x: 560, kind: 'car' }, { x: 640, kind: 'barrel' }],
    interactives: [{ x: 100, kind: 'neon' }, { x: 400, kind: 'lamp' }, { x: 820, kind: 'lamp' }],
    ambushes: [
      {
        x: 260,
        waves: [
          [{ type: 'hunter', dx: 450 }, { type: 'exterminator', dx: 400 }],
          [{ type: 'exterminator', dx: 150, y: 130 }, { type: 'hunter', dx: 20 }, { type: 'hunter', dx: 440 }],
          [{ type: 'exterminator', dx: 430 }, { type: 'exterminator', dx: 380 }, { type: 'hunter', dx: 30 }],
        ],
      },
    ],
    decor: [{ x: 60, kind: 'vending' }, { x: 300, kind: 'booth' }, { x: 860, kind: 'trash' }],
    foreground: [{ x: 500, kind: 'fence' }],
  }),
  // Beco dos camelôs: corredor estreito cheio de robôs
  chunk(700, 'mid', {
    ground: [{ x: 0, w: 700 }],
    blocks: [{ x: 420, w: 30, h: 24, kind: 'crate' }],
    platforms: [{ x: 200, y: 165, w: 90 }, { x: 520, y: 150, w: 90 }],
    destructibles: [{ x: 300, kind: 'barrel' }, { x: 330, kind: 'barrel' }],
    interactives: [{ x: 120, kind: 'neon' }, { x: 600, kind: 'billboard' }],
    spawns: [
      { x: 240, type: 'exterminator', y: 135 },
      { x: 380, type: 'hunter' },
      { x: 560, type: 'exterminator', y: 120 },
      { x: 640, type: 'hunter' },
      { x: 690, type: 'hunter' },
    ],
    decor: [{ x: 40, kind: 'dumpster' }, { x: 470, kind: 'weeds' }, { x: 660, kind: 'mechwreck' }],
    foreground: [{ x: 200, kind: 'wires' }],
  }),
];

// ============================================================== MISSÃO 2 — Fábrica de Sintéticos

export const EXTRAS_M2: Chunk[] = [
  // Linha de prensas sincronizadas sobre uma esteira
  chunk(820, 'mid', {
    ground: [{ x: 0, w: 820 }],
    conveyors: [{ x: 150, w: 420, speed: 55 }],
    hazards: [
      { type: 'crusher', x: 250, period: 2600 },
      { type: 'crusher', x: 380, period: 2600, phase: 0.33 },
      { type: 'crusher', x: 510, period: 2600, phase: 0.66 },
    ],
    destructibles: [{ x: 700, kind: 'generator' }],
    interactives: [{ x: 60, kind: 'beacon' }, { x: 760, kind: 'beacon' }],
    spawns: [{ x: 620, type: 'exterminator' }, { x: 760, type: 'hunter' }],
    pickups: [{ x: 90, kind: 'bombs' }],
    decor: [{ x: 90, kind: 'panel' }, { x: 640, kind: 'tank' }],
    foreground: [{ x: 400, kind: 'chains' }],
  }),
  // Poço de fundição: lasers e respiros que lançam para o alto
  chunk(760, 'mid', {
    ground: [{ x: 0, w: 280 }, { x: 440, w: 320 }],
    platforms: [{ x: 300, y: 150, w: 60 }, { x: 520, y: 120, w: 100 }],
    movers: [{ x: 360, y: 180, w: 52, dy: 40, period: 2400 }],
    hazards: [
      { type: 'laser', x: 200, top: 40, period: 2000, onTime: 900 },
      { type: 'vent', x: 470, power: 620 },
      { type: 'laser', x: 660, top: 40, period: 2200, onTime: 1000, phase: 0.5 },
    ],
    destructibles: [{ x: 120, kind: 'barrel' }, { x: 720, kind: 'barrel' }],
    interactives: [{ x: 560, y: 141, kind: 'camera' }],
    spawns: [
      { x: 150, type: 'exterminator' },
      { x: 560, type: 'exterminator', y: 90 },
      { x: 700, type: 'hunter' },
    ],
    pickups: [{ x: 570, kind: 'heavy', y: 100 }],
    decor: [{ x: 60, kind: 'pod' }, { x: 600, kind: 'sign' }],
    foreground: [{ x: 300, kind: 'pipe' }],
  }),
  // Almoxarifado: emboscada entre empilhadeiras
  chunk(880, 'mid', {
    ground: [{ x: 0, w: 880 }],
    blocks: [{ x: 180, w: 40, h: 30, kind: 'container' }, { x: 620, w: 30, h: 24, kind: 'crate' }, { x: 650, w: 30, h: 24, kind: 'crate' }],
    platforms: [{ x: 360, y: 160, w: 120 }],
    destructibles: [{ x: 520, kind: 'barrel' }, { x: 800, kind: 'generator' }],
    interactives: [{ x: 100, kind: 'beacon' }, { x: 760, kind: 'beacon' }],
    ambushes: [
      {
        x: 240,
        waves: [
          [{ type: 'exterminator', dx: 430 }, { type: 'hunter', dx: 30 }],
          [{ type: 'hunter', dx: 450 }, { type: 'hunter', dx: 20 }, { type: 'exterminator', dx: 180, y: 130 }],
          [{ type: 'exterminator', dx: 440 }, { type: 'exterminator', dx: 390 }, { type: 'hunter', dx: 40 }],
        ],
      },
    ],
    decor: [{ x: 60, kind: 'forklift' }, { x: 300, kind: 'spool' }, { x: 840, kind: 'parts' }],
    foreground: [{ x: 450, kind: 'lamp' }],
  }),
  // Esteiras opostas com robôs recém-montados
  chunk(720, 'mid', {
    ground: [{ x: 0, w: 720 }],
    conveyors: [{ x: 80, w: 240, speed: -60 }, { x: 400, w: 240, speed: 60 }],
    platforms: [{ x: 330, y: 150, w: 70 }],
    hazards: [{ type: 'crusher', x: 360, period: 3000 }],
    destructibles: [{ x: 680, kind: 'barrel' }],
    spawns: [
      { x: 160, type: 'hunter' },
      { x: 300, type: 'exterminator' },
      { x: 500, type: 'hunter' },
      { x: 620, type: 'exterminator' },
    ],
    decor: [{ x: 30, kind: 'tank' }, { x: 660, kind: 'panel' }],
    foreground: [{ x: 250, kind: 'chains' }],
  }),
];

// ============================================================== MISSÃO 3 — Zona de Contágio

export const EXTRAS_M3: Chunk[] = [
  // Campo de cabos-verme: o chão inteiro estoura em sequência
  chunk(820, 'mid', {
    ground: [{ x: 0, w: 820 }],
    platforms: [{ x: 280, y: 160, w: 90 }, { x: 520, y: 160, w: 90 }],
    hazards: [
      { type: 'burrow', x: 180, period: 2400 },
      { type: 'burrow', x: 330, period: 2400, phase: 0.25 },
      { type: 'burrow', x: 480, period: 2400, phase: 0.5 },
      { type: 'burrow', x: 630, period: 2400, phase: 0.75 },
    ],
    destructibles: [{ x: 760, kind: 'barrel' }],
    interactives: [{ x: 60, kind: 'beacon' }],
    spawns: [
      { x: 320, type: 'exterminator', y: 130 },
      { x: 560, type: 'exterminator', y: 130 },
      { x: 700, type: 'infected' },
      { x: 780, type: 'infected' },
    ],
    pickups: [{ x: 560, kind: 'bombs', y: 140 }],
    decor: [{ x: 90, kind: 'pylon' }, { x: 720, kind: 'wreck' }],
    foreground: [{ x: 400, kind: 'tendrils' }],
  }),
  // Tanques rompidos: poças largas e plataformas de caixas
  chunk(760, 'mid', {
    ground: [{ x: 0, w: 300 }, { x: 400, w: 360 }],
    platforms: [{ x: 160, y: 165, w: 70 }, { x: 460, y: 150, w: 100 }],
    movers: [{ x: 320, y: 190, w: 52, dx: 30, period: 2200 }],
    hazards: [
      { type: 'ooze', x: 120, w: 150 },
      { type: 'ooze', x: 450, w: 120 },
    ],
    destructibles: [{ x: 60, kind: 'barrel' }, { x: 700, kind: 'generator' }],
    interactives: [{ x: 500, y: 171, kind: 'camera' }],
    spawns: [
      { x: 200, type: 'infected' },
      { x: 500, type: 'exterminator', y: 120 },
      { x: 640, type: 'infected' },
      { x: 720, type: 'hunter' },
    ],
    pickups: [{ x: 500, kind: 'heavy', y: 130 }],
    decor: [{ x: 30, kind: 'canister' }, { x: 620, kind: 'canister' }],
    foreground: [{ x: 250, kind: 'girder' }],
  }),
  // Ninho de Infectados: emboscada sobre poças
  chunk(860, 'mid', {
    ground: [{ x: 0, w: 860 }],
    blocks: [{ x: 700, w: 44, h: 30, kind: 'container' }],
    platforms: [{ x: 330, y: 160, w: 110 }],
    hazards: [{ type: 'ooze', x: 180, w: 60 }, { type: 'ooze', x: 560, w: 60 }],
    destructibles: [{ x: 460, kind: 'barrel' }],
    interactives: [{ x: 90, kind: 'beacon' }, { x: 800, kind: 'beacon' }],
    ambushes: [
      {
        x: 240,
        waves: [
          [{ type: 'infected', dx: 440 }, { type: 'infected', dx: 30 }],
          [{ type: 'infected', dx: 420 }, { type: 'infected', dx: 450 }, { type: 'exterminator', dx: 150, y: 130 }],
          [{ type: 'hunter', dx: 440 }, { type: 'infected', dx: 20 }, { type: 'infected', dx: 60 }, { type: 'exterminator', dx: 400 }],
        ],
      },
    ],
    decor: [{ x: 40, kind: 'sign' }, { x: 300, kind: 'scrap' }, { x: 820, kind: 'wreck' }],
    foreground: [{ x: 500, kind: 'tendrils' }],
  }),
];

// ============================================================== MISSÃO 4 — Núcleo da IA

export const EXTRAS_M4: Chunk[] = [
  // Ponte de luz: plataformas que piscam sobre o vazio
  chunk(800, 'mid', {
    ground: [{ x: 0, w: 180 }, { x: 620, w: 180 }],
    phasers: [
      { x: 200, y: 200, w: 56, period: 2600 },
      { x: 290, y: 180, w: 56, period: 2600, phase: 0.33 },
      { x: 380, y: 170, w: 56, period: 2600, phase: 0.66 },
      { x: 470, y: 185, w: 56, period: 2600 },
      { x: 555, y: 200, w: 56, period: 2600, phase: 0.33 },
    ],
    destructibles: [{ x: 100, kind: 'datanode' }, { x: 700, kind: 'datanode' }],
    interactives: [{ x: 60, kind: 'beacon' }, { x: 740, kind: 'beacon' }],
    spawns: [{ x: 680, type: 'exterminator' }, { x: 760, type: 'hunter' }],
    decor: [{ x: 30, kind: 'crystal' }, { x: 650, kind: 'monolith' }],
    foreground: [{ x: 400, kind: 'cables' }],
  }),
  // Corredor de firewall: lasers em sequência
  chunk(760, 'mid', {
    ground: [{ x: 0, w: 760 }],
    platforms: [{ x: 300, y: 160, w: 100 }],
    hazards: [
      { type: 'laser', x: 160, top: 40, period: 2100, onTime: 900 },
      { type: 'laser', x: 240, top: 40, period: 2100, onTime: 900, phase: 0.33 },
      { type: 'laser', x: 460, top: 40, period: 2100, onTime: 900, phase: 0.66 },
      { type: 'laser', x: 540, top: 40, period: 2100, onTime: 900 },
    ],
    destructibles: [{ x: 360, kind: 'datanode' }, { x: 680, kind: 'generator' }],
    interactives: [{ x: 340, y: 181, kind: 'camera' }],
    spawns: [
      { x: 340, type: 'exterminator', y: 130 },
      { x: 620, type: 'hunter' },
      { x: 720, type: 'exterminator' },
    ],
    pickups: [{ x: 340, kind: 'heavy', y: 140 }],
    decor: [{ x: 60, kind: 'terminal' }, { x: 400, kind: 'conduit' }, { x: 700, kind: 'bot' }],
    foreground: [{ x: 350, kind: 'frame' }],
  }),
  // Sala dos servidores: emboscada de defesa
  chunk(880, 'mid', {
    ground: [{ x: 0, w: 880 }],
    blocks: [{ x: 160, w: 24, h: 40, kind: 'server' }, { x: 700, w: 24, h: 40, kind: 'server' }, { x: 724, w: 24, h: 40, kind: 'server' }],
    platforms: [{ x: 380, y: 150, w: 110 }],
    hazards: [{ type: 'vent', x: 350, power: 560 }],
    destructibles: [{ x: 280, kind: 'datanode' }, { x: 560, kind: 'datanode' }],
    interactives: [{ x: 90, kind: 'beacon' }, { x: 820, kind: 'beacon' }],
    ambushes: [
      {
        x: 260,
        waves: [
          [{ type: 'exterminator', dx: 430 }, { type: 'hunter', dx: 20 }, { type: 'hunter', dx: 450 }],
          [{ type: 'exterminator', dx: 160, y: 120 }, { type: 'exterminator', dx: 400 }, { type: 'hunter', dx: 40 }],
          [{ type: 'hunter', dx: 450 }, { type: 'hunter', dx: 20 }, { type: 'exterminator', dx: 420 }, { type: 'exterminator', dx: 380 }],
        ],
      },
    ],
    decor: [{ x: 40, kind: 'monolith' }, { x: 460, kind: 'crystal' }, { x: 840, kind: 'terminal' }],
    foreground: [{ x: 500, kind: 'cables' }],
  }),
  // Reator de dados: plataformas móveis e piso que desaba
  chunk(740, 'mid', {
    ground: [{ x: 0, w: 220 }, { x: 520, w: 220 }],
    movers: [
      { x: 240, y: 190, w: 52, dy: 40, period: 2400 },
      { x: 400, y: 180, w: 52, dy: 30, period: 2000, phase: 0.5 },
    ],
    crumbles: [{ x: 320, y: 160, w: 48 }],
    destructibles: [{ x: 120, kind: 'generator' }, { x: 640, kind: 'datanode' }],
    interactives: [{ x: 60, kind: 'beacon' }],
    spawns: [{ x: 160, type: 'hunter' }, { x: 600, type: 'exterminator' }, { x: 700, type: 'hunter' }],
    pickups: [{ x: 330, kind: 'bombs', y: 140 }],
    decor: [{ x: 30, kind: 'conduit' }, { x: 560, kind: 'bot' }],
    foreground: [{ x: 350, kind: 'frame' }],
  }),
];
