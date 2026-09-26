import { mulberry32, RNG } from '../gfx/art/kit';
import { PARALLAX } from '../themes/Theme';
import type { BossType, LevelData, ThemeId } from './types';

/*
 * Gerador de fases por trechos (estilo Dead Cells).
 * Cada missão tem uma fase "fonte" desenhada à mão, cortada em trechos nos pontos seguros.
 * A cada run: trecho inicial + trechos do meio embaralhados + sala de upgrade + arena do chefe.
 */

/** Uma fase parcial com largura própria; coordenadas x relativas ao início do trecho. */
export type Chunk = Omit<LevelData, 'id' | 'name' | 'subtitle' | 'theme' | 'width' | 'goalX'> & {
  width: number;
  tag: 'start' | 'mid' | 'ambush' | 'shrine' | 'arena';
};

export interface MissionSource {
  name: string;
  subtitle: string;
  theme: ThemeId;
  boss: BossType;
  /** Fase desenhada à mão que serve de biblioteca de trechos. */
  layout: LevelData;
  /** Pontos de corte (x) em chão contínuo, sem elementos atravessando. O último trecho termina no último corte. */
  cuts: number[];
  /** Quantos trechos do meio entram em cada run. */
  mids: number;
  shrine: Chunk;
  arena: Chunk;
}

const emptyChunk = (width: number, tag: Chunk['tag']): Chunk => ({
  width,
  tag,
  ground: [],
  blocks: [],
  platforms: [],
  movers: [],
  crumbles: [],
  phasers: [],
  conveyors: [],
  hazards: [],
  destructibles: [],
  interactives: [],
  spawns: [],
  ambushes: [],
  pickups: [],
  terminals: [],
  decor: [],
  foreground: [],
});

type Positioned = { x: number };

/** Corta a fase fonte nos pontos dados. Terminais e o fim da fase são descartados. */
export function sliceLevel(level: LevelData, cuts: number[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    const inRange = <T extends Positioned>(list: T[] | undefined) =>
      (list ?? []).filter((e) => e.x >= a && e.x < b).map((e) => ({ ...e, x: e.x - a }));
    const c = emptyChunk(b - a, i === 0 ? 'start' : 'mid');
    c.ground = level.ground
      .map((g) => ({ x: Math.max(g.x, a), end: Math.min(g.x + g.w, b) }))
      .filter((g) => g.end > g.x)
      .map((g) => ({ x: g.x - a, w: g.end - g.x }));
    c.blocks = inRange(level.blocks);
    c.platforms = inRange(level.platforms);
    c.movers = inRange(level.movers);
    c.crumbles = inRange(level.crumbles);
    c.phasers = inRange(level.phasers);
    c.conveyors = inRange(level.conveyors);
    c.hazards = inRange(level.hazards);
    c.destructibles = inRange(level.destructibles);
    c.interactives = inRange(level.interactives);
    c.spawns = inRange(level.spawns);
    c.ambushes = inRange(level.ambushes);
    c.pickups = inRange(level.pickups);
    c.decor = inRange(level.decor);
    // primeiro plano está em coordenadas de parallax: converte para x do mundo
    c.foreground = level.foreground
      .map((f) => ({ ...f, x: f.x / PARALLAX.fg }))
      .filter((f) => f.x >= a && f.x < b)
      .map((f) => ({ ...f, x: f.x - a }));
    if (c.ambushes?.length) c.tag = 'ambush';
    chunks.push(c);
  }
  return chunks;
}

function shuffle<T>(list: T[], rng: RNG) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Junta trechos em sequência, deslocando tudo e emendando o chão contínuo. */
function assemble(chunks: Chunk[]) {
  const out = emptyChunk(0, 'mid');
  let offset = 0;
  const shift = <T extends Positioned>(list: T[] | undefined) => (list ?? []).map((e) => ({ ...e, x: e.x + offset }));
  let bossX: number | null = null;
  for (const c of chunks) {
    out.ground.push(...shift(c.ground));
    out.blocks.push(...shift(c.blocks));
    out.platforms.push(...shift(c.platforms));
    out.movers!.push(...shift(c.movers));
    out.crumbles!.push(...shift(c.crumbles));
    out.phasers!.push(...shift(c.phasers));
    out.conveyors!.push(...shift(c.conveyors));
    out.hazards!.push(...shift(c.hazards));
    out.destructibles!.push(...shift(c.destructibles));
    out.interactives!.push(...shift(c.interactives));
    out.spawns.push(...shift(c.spawns));
    out.ambushes!.push(...shift(c.ambushes));
    out.pickups.push(...shift(c.pickups));
    out.terminals!.push(...shift(c.terminals));
    out.decor.push(...shift(c.decor));
    out.foreground.push(...shift(c.foreground));
    if (c.tag === 'arena') bossX = offset;
    offset += c.width;
  }
  // emenda trechos de chão que se tocam
  out.ground.sort((p, q) => p.x - q.x);
  const merged: { x: number; w: number }[] = [];
  for (const g of out.ground) {
    const last = merged[merged.length - 1];
    if (last && g.x <= last.x + last.w + 1) last.w = Math.max(last.w, g.x + g.w - last.x);
    else merged.push({ ...g });
  }
  out.ground = merged;
  out.spawns.sort((p, q) => p.x - q.x);
  out.ambushes!.sort((p, q) => p.x - q.x);
  return { data: out, width: offset, bossX };
}

/** Monta a fase de uma missão para uma run (mesma semente = mesma fase). */
export function buildMission(source: MissionSource, index: number, seed: number): LevelData {
  const rng = mulberry32(seed);
  const [start, ...mids] = sliceLevel(source.layout, source.cuts);
  // garante ao menos uma emboscada entre os trechos sorteados
  const ambush = shuffle(mids.filter((c) => c.tag === 'ambush'), rng);
  const others = shuffle(mids.filter((c) => c.tag !== 'ambush'), rng);
  const picked = shuffle([ambush[0], ...others, ...ambush.slice(1)].filter(Boolean).slice(0, source.mids), rng);
  const shrineAt = 1 + Math.floor(rng() * Math.max(1, picked.length - 1));
  const order = [start, ...picked.slice(0, shrineAt), source.shrine, ...picked.slice(shrineAt), source.arena];
  const { data, width, bossX } = assemble(order);
  return {
    ...data,
    foreground: data.foreground.map((f) => ({ ...f, x: f.x * PARALLAX.fg })),
    id: `m${index + 1}-${seed}`,
    name: `MISSÃO ${index + 1}`,
    subtitle: source.subtitle,
    theme: source.theme,
    width,
    goalX: width - 60,
    boss: bossX === null ? undefined : { x: bossX, type: source.boss },
  };
}

/** Utilitário para declarar trechos à mão (sala de upgrade, arena). */
export function chunk(width: number, tag: Chunk['tag'], parts: Partial<Chunk>): Chunk {
  return { ...emptyChunk(width, tag), ground: [{ x: 0, w: width }], ...parts };
}
