import { buildMission, chunk, MissionSource } from './generator';
import { MISSION_1 } from './mission1';
import { MISSION_2 } from './mission2';
import { MISSION_3 } from './mission3';
import { MISSION_4 } from './mission4';
import { EXTRAS_M1, EXTRAS_M2, EXTRAS_M3, EXTRAS_M4 } from './extras';
import type { LevelData } from './types';

/*
 * Campanha: cada missão é montada a cada run a partir da fase fonte (mission1..4.ts),
 * cortada nos pontos abaixo, mais os trechos extras (extras.ts). Cada missão tem duas
 * salas de upgrade no caminho e termina na arena do chefe.
 */

export const MISSION_SOURCES: MissionSource[] = [
  {
    name: 'MISSÃO 1',
    subtitle: 'RUINAS DE NEO-SP',
    theme: 'city',
    boss: 'sentinel',
    layout: MISSION_1,
    cuts: [0, 620, 1460, 2080, 2600, 3400, 4300, 5120],
    extras: EXTRAS_M1,
    mids: 9,
    shrine: chunk(320, 'shrine', {
      terminals: [{ x: 160 }],
      interactives: [{ x: 60, kind: 'lamp' }, { x: 250, kind: 'neon' }],
      decor: [{ x: 110, kind: 'booth' }, { x: 220, kind: 'weeds' }],
    }),
    arena: chunk(640, 'arena', {
      platforms: [{ x: 90, y: 150, w: 90 }, { x: 460, y: 150, w: 90 }],
      interactives: [{ x: 40, kind: 'lamp' }, { x: 600, kind: 'lamp' }],
      decor: [{ x: 320, kind: 'barrier' }, { x: 520, kind: 'trash' }],
      foreground: [{ x: 300, kind: 'wires' }],
    }),
  },
  {
    name: 'MISSÃO 2',
    subtitle: 'FABRICA DE SINTETICOS',
    theme: 'factory',
    boss: 'forger',
    layout: MISSION_2,
    cuts: [0, 760, 1300, 2000, 2620, 3460, 4360, 5260],
    extras: EXTRAS_M2,
    mids: 9,
    shrine: chunk(320, 'shrine', {
      terminals: [{ x: 160 }],
      interactives: [{ x: 70, kind: 'beacon' }, { x: 250, kind: 'beacon' }],
      decor: [{ x: 90, kind: 'panel' }, { x: 240, kind: 'pod' }],
    }),
    arena: chunk(640, 'arena', {
      platforms: [{ x: 70, y: 150, w: 90 }, { x: 300, y: 120, w: 80 }],
      interactives: [{ x: 40, kind: 'beacon' }, { x: 330, kind: 'beacon' }],
      decor: [{ x: 200, kind: 'parts' }],
      foreground: [{ x: 200, kind: 'chains' }],
    }),
  },
  {
    name: 'MISSÃO 3',
    subtitle: 'ZONA DE CONTAGIO',
    theme: 'contagion',
    boss: 'worm',
    layout: MISSION_3,
    cuts: [0, 700, 1500, 2300, 3100, 3900, 4700, 5500],
    extras: EXTRAS_M3,
    mids: 9,
    shrine: chunk(320, 'shrine', {
      terminals: [{ x: 160 }],
      interactives: [{ x: 60, kind: 'beacon' }, { x: 260, kind: 'beacon' }],
      decor: [{ x: 100, kind: 'canister' }, { x: 230, kind: 'pylon' }],
    }),
    arena: chunk(640, 'arena', {
      platforms: [{ x: 60, y: 150, w: 90 }, { x: 490, y: 150, w: 90 }],
      interactives: [{ x: 30, kind: 'beacon' }, { x: 610, kind: 'beacon' }],
      decor: [{ x: 200, kind: 'scrap' }, { x: 440, kind: 'scrap' }],
      foreground: [{ x: 320, kind: 'tendrils' }],
    }),
  },
  {
    name: 'MISSÃO 4',
    subtitle: 'NUCLEO DA IA',
    theme: 'core',
    boss: 'eye',
    layout: MISSION_4,
    cuts: [0, 580, 1260, 2060, 2600, 3420, 4260, 5220],
    extras: EXTRAS_M4,
    mids: 9,
    shrine: chunk(320, 'shrine', {
      terminals: [{ x: 160 }],
      interactives: [{ x: 60, kind: 'beacon' }],
      decor: [{ x: 90, kind: 'crystal' }, { x: 250, kind: 'terminal' }],
    }),
    arena: chunk(640, 'arena', {
      platforms: [{ x: 80, y: 160, w: 90 }, { x: 275, y: 120, w: 90 }, { x: 470, y: 160, w: 90 }],
      interactives: [{ x: 40, kind: 'beacon' }, { x: 600, kind: 'beacon' }],
      decor: [{ x: 320, kind: 'conduit' }],
      foreground: [{ x: 320, kind: 'cables' }],
    }),
  },
];

export const MISSION_COUNT = MISSION_SOURCES.length;

/** Fase de uma missão para a run atual (a semente da run + índice definem a montagem). */
export function missionLevel(index: number, runSeed: number): LevelData {
  return buildMission(MISSION_SOURCES[index], index, runSeed + index * 7919);
}
