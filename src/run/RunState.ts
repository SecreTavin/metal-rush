import { loadSave, upgradeLevel, writeSave } from './save';
import { skillStats, SkillLevels, SkillStats } from './skills';
import { Loadout, startingLoadout } from './gear';

const BASE_HP = 5;
const BASE_BOMBS = 8;

/** Estado de uma run: sobrevive entre as missões e se perde ao morrer. */
export class RunState {
  seed: number;
  mission = 0;
  hp: number;
  maxHp: number;
  bombs: number;
  skills: SkillLevels = {};
  /** Armas, skills ativas e granada equipadas. */
  loadout: Loadout = startingLoadout();
  fragments = 0;
  score = 0;
  kills = 0;
  timeMs = 0;
  /** A vida acabou de ser restaurada pelo safepoint (mostra o aviso na próxima missão). */
  restored = false;
  /** Skill inicial ainda a escolher (melhoria "Boot com Skill"). */
  bootChoice: boolean;
  private statsCache: SkillStats | null = null;

  constructor(seed = Math.floor(Math.random() * 1e9)) {
    const save = loadSave();
    this.seed = seed;
    this.maxHp = BASE_HP + upgradeLevel(save, 'hp');
    this.hp = this.maxHp;
    this.bombs = BASE_BOMBS + upgradeLevel(save, 'bombs') * 2;
    this.bootChoice = upgradeLevel(save, 'boot') > 0;
  }

  get stats(): SkillStats {
    return (this.statsCache ??= skillStats(this.skills));
  }

  level(id: string) {
    return this.skills[id] ?? 0;
  }

  /** Aplica uma skill escolhida (efeitos imediatos incluídos). */
  addSkill(id: string) {
    this.skills[id] = this.level(id) + 1;
    this.statsCache = null;
    if (id === 'ram') {
      this.maxHp += 2;
      this.hp = Math.min(this.maxHp, this.hp + 2);
    }
    if (id === 'backup') this.bombs += 4;
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Multiplicador de fragmentos (skill Cache Hit + melhoria Minerador). */
  fragmentValue(base: number) {
    const greed = 1 + upgradeLevel(loadSave(), 'greed') * 0.25;
    return Math.max(1, Math.round(base * this.stats.fragmentMul * greed));
  }

  /** Fim da run: guarda os fragmentos e estatísticas no progresso permanente. */
  bank(won: boolean) {
    const save = loadSave();
    save.fragments += this.fragments;
    save.runs += 1;
    if (won) save.wins += 1;
    save.bestMission = Math.max(save.bestMission, this.mission + (won ? 1 : 0));
    writeSave(save);
  }
}
