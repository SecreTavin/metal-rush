import { Action, Binding, DEFAULT_BINDINGS } from '../input/Controls';

/*
 * Configurações do jogador (separadas do progresso): atalhos, volumes e tela cheia.
 * Salvas no navegador; em aba anônima ou com armazenamento bloqueado, valem só na sessão.
 */

const KEY = 'metal-rush-settings-v1';

export interface Settings {
  bindings: Record<Action, Binding[]>;
  /** Volumes de 0 a 10. */
  volume: { master: number; music: number; sfx: number };
  fullscreen: boolean;
}

const cloneBindings = (b: Record<Action, Binding[]>) =>
  Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.map((x) => ({ ...x }))])) as Record<Action, Binding[]>;

export const defaultSettings = (): Settings => ({
  bindings: cloneBindings(DEFAULT_BINDINGS),
  volume: { master: 7, music: 6, sfx: 8 },
  fullscreen: false,
});

let cache: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

export function loadSettings(): Settings {
  if (cache) return cache;
  const fresh = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>;
      cache = {
        bindings: { ...fresh.bindings, ...(saved.bindings ?? {}) },
        volume: { ...fresh.volume, ...(saved.volume ?? {}) },
        fullscreen: false,
      };
    }
  } catch {
    // configurações corrompidas: volta ao padrão
  }
  cache ??= fresh;
  return cache;
}

export function saveSettings(s: Settings) {
  cache = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  listeners.forEach((fn) => fn(s));
}

/** Avisa quando as configurações mudarem (volumes, por exemplo). */
export function onSettingsChange(fn: (s: Settings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetBindings() {
  const s = loadSettings();
  s.bindings = cloneBindings(DEFAULT_BINDINGS);
  saveSettings(s);
}
