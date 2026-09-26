/*
 * Progresso permanente entre runs, salvo no navegador (localStorage).
 * Tudo protegido com try/catch: em aba anônima ou com armazenamento bloqueado,
 * o jogo funciona normalmente, só não guarda o progresso.
 */

const KEY = 'metal-rush-save-v1';

export interface SaveData {
  /** Fragmentos de dados guardados (moeda do Laboratório). */
  fragments: number;
  /** Skills desbloqueadas além das iniciais. */
  unlocked: string[];
  /** Nível de cada melhoria permanente. */
  upgrades: Record<string, number>;
  runs: number;
  wins: number;
  bestMission: number;
}

const fresh = (): SaveData => ({ fragments: 0, unlocked: [], upgrades: {}, runs: 0, wins: 0, bestMission: 0 });

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...fresh(), ...(JSON.parse(raw) as Partial<SaveData>) } : fresh();
  } catch {
    cache = fresh();
  }
  return cache;
}

export function writeSave(data: SaveData) {
  cache = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}

export function resetSave() {
  writeSave(fresh());
}

// ------------------------------------------------------------ melhorias permanentes

export interface MetaUpgrade {
  id: string;
  name: string;
  desc: string;
  costs: number[];
}

export const META_UPGRADES: MetaUpgrade[] = [
  { id: 'hp', name: 'INTEGRIDADE', desc: '+1 DE VIDA MAXIMA', costs: [30, 60, 100] },
  { id: 'bombs', name: 'ESTOQUE', desc: '+2 PENDRIVES NO INICIO', costs: [25, 50] },
  { id: 'boot', name: 'BOOT COM SKILL', desc: 'COMECA A RUN ESCOLHENDO 1 SKILL', costs: [80] },
  { id: 'repair', name: 'AUTO-REPARO', desc: 'CURA 2 AO VENCER UM CHEFE', costs: [60] },
  { id: 'greed', name: 'MINERADOR', desc: '+25% FRAGMENTOS COLETADOS', costs: [70, 140] },
];

export const upgradeLevel = (save: SaveData, id: string) => save.upgrades[id] ?? 0;
