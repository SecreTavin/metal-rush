import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Controls, Action } from '../input/Controls';
import type { Player } from './Player';
import type { Enemy } from './Enemy';
import { Pet } from './Pet';
import { ABILITY_TIMES, AbilityId, GEAR } from '../run/gear';
import { floatingText, impactSpark } from '../gfx/effects';
import { HERO_BOB } from '../gfx/art/heroFx';
import { audio } from '../audio/Audio';

// ---- Escudo 144Hz
const SHIELD_HITS = 5;
const SHIELD_COOLDOWN = 8000;
const SHIELD_SPEED = 0.55;
/** Área do escudo à frente do herói (relativa a x e y do herói). */
const SHIELD_ZONE = { near: 2, far: 24, top: -28, bottom: 22 };

// ---- Massagem Dev (chicote VGA)
const WHIP_COOLDOWN = 520;
const WHIP_WINDUP = 110;
const WHIP_CRACK = 170;
const WHIP_REACH = 78;
/** A partir desta fração do alcance a chicotada é "perfeita". */
const WHIP_SWEET = 0.7;
const WHIP_DAMAGE = 3;
const WHIP_PERFECT = 7;

// ---- Arduino e Voltando (Raspberry)
const THROW_COOLDOWN = 200;
const THROW_TIME = 170;
const THROW_RELEASE = 70;

/** Saída do cabo no braço do chicote e mão do braço de arremesso (px a partir do ombro). */
const WHIP_HAND = 19;
const THROW_HAND = 13;

type Pose = 'laptop' | 'shield' | 'whip' | 'throw' | 'none';

/**
 * Equipamentos do herói além do MacBook: escudo, chicote, bumerangue e skills ativas.
 * Também desenha o braço quando ele não está segurando o MacBook.
 */
export class Arsenal {
  // escudo
  blocking = false;
  shieldHits = 0;
  shieldCooldownUntil = 0;
  private shieldFlashUntil = 0;
  // chicote
  private whipStart = -Infinity;
  private nextWhip = 0;
  private whipDealt = true;
  // arremesso
  private throwStart = -Infinity;
  private nextThrow = 0;
  private thrown = true;
  // skills ativas (por slot: Q / E)
  readonly activeUntil = [0, 0];
  readonly readyAt = [0, 0];
  private pet: Pet | null = null;
  private morphUntil = 0;

  private shieldImg: Phaser.GameObjects.Image;
  private whipArm: Phaser.GameObjects.Image;
  private whipPlug: Phaser.GameObjects.Image;
  private cableBack: Phaser.GameObjects.Graphics;
  private cableFront: Phaser.GameObjects.Graphics;
  private throwArm: Phaser.GameObjects.Image;
  private heldPi: Phaser.GameObjects.Image;
  private helmet: Phaser.GameObjects.Image;
  private chest: Phaser.GameObjects.Image;
  private rainbow: Phaser.GameObjects.Image;

  constructor(
    private gs: GameScene,
    private player: Player,
  ) {
    const add = (key: string, depth: number) => gs.add.image(0, 0, key).setDepth(depth).setVisible(false);
    this.shieldImg = add('gear_shield', 11).setOrigin(1 / 28, 14.5 / 30);
    this.whipArm = add('gear_whip_arm', 11).setOrigin(0.5 / 22, 5.5 / 11);
    this.whipPlug = add('gear_vga_plug', 11);
    this.cableBack = gs.add.graphics().setDepth(9.5);
    this.cableFront = gs.add.graphics().setDepth(10.5);
    this.throwArm = add('gear_throw_arm', 11).setOrigin(0.5 / 18, 5.5 / 11);
    this.heldPi = add('gear_raspberry', 11.5);
    this.helmet = add('gear_helmet', 10.2);
    this.chest = add('gear_chest', 10.1);
    this.rainbow = add('hero_aura', 9.2).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2);
  }

  private get loadout() {
    return this.gs.run.loadout;
  }

  /** Multiplicador da velocidade de corrida (defender deixa o herói mais lento). */
  get speedMul() {
    return this.blocking ? SHIELD_SPEED : 1;
  }

  /** Imortal (armadura de brinquedo). */
  immortal(time: number) {
    return time < this.morphUntil;
  }

  /** Lê as ações das armas não-MacBook, da granada Raspberry e das skills. */
  update(time: number, delta: number, c: Controls) {
    const l = this.loadout;
    const actions: Action[] = ['primary', 'secondary'];
    this.blocking = false;
    l.weapons.forEach((w, i) => {
      const action = actions[i];
      if (w === 'shield144') {
        this.blocking = c.isDown(action) && time >= this.shieldCooldownUntil;
        if (c.justDown(action) && time < this.shieldCooldownUntil) {
          floatingText(this.gs, this.player.x, this.player.y - 36, 'RECARREGANDO', '#ff5a5a');
        }
      } else if (w === 'vga') {
        if ((c.justDown(action) || c.isDown(action)) && time >= this.nextWhip) this.startWhip(time);
      }
    });
    if (time < this.whipStart + WHIP_CRACK + WHIP_WINDUP) this.blocking = false;

    if (l.grenade === 'raspberry' && c.justDown('grenade') && time >= this.nextThrow) {
      this.nextThrow = time + THROW_COOLDOWN;
      this.throwStart = time;
      this.thrown = false;
    }
    if (!this.thrown && time >= this.throwStart + THROW_RELEASE) {
      this.thrown = true;
      const hand = this.handPoint(0.3, THROW_HAND);
      this.gs.throwRaspberry(hand.x, hand.y - 2, this.player.facing);
    }

    if (!this.whipDealt && time >= this.whipStart + WHIP_WINDUP + 40) {
      this.whipDealt = true;
      this.whipHit();
    }

    (['skill1', 'skill2'] as const).forEach((a, i) => {
      if (c.justDown(a)) this.useAbility(i, time);
    });
    this.updateAbilities(time);
    this.pet?.update(time, delta);
  }

  // ---------- Escudo 144Hz ----------

  /** Área do escudo, ou null se não estiver defendendo. */
  shieldZone() {
    if (!this.blocking || this.player.dead) return null;
    const p = this.player;
    const z = SHIELD_ZONE;
    const x0 = p.facing > 0 ? p.x + z.near : p.x - z.far;
    return new Phaser.Geom.Rectangle(x0, p.y + z.top, z.far - z.near, z.bottom - z.top);
  }

  /** O golpe vem da frente e o escudo está erguido? Conta um acerto no escudo. */
  tryBlock(fromX: number | undefined, time: number) {
    if (!this.blocking || fromX === undefined) return false;
    if ((fromX - this.player.x) * this.player.facing < -4) return false;
    this.registerBlock(time);
    return true;
  }

  registerBlock(time: number) {
    audio.play('block');
    this.shieldFlashUntil = time + 90;
    this.shieldHits++;
    const p = this.player;
    impactSpark(this.gs, p.x + p.facing * 20, p.y - 4, 'bolt_hit');
    if (this.shieldHits >= SHIELD_HITS) {
      this.shieldHits = 0;
      this.shieldCooldownUntil = time + SHIELD_COOLDOWN;
      audio.play('shieldBreak');
      this.blocking = false;
      this.gs.glitchBars(p.x + p.facing * 20, p.y - 4, [0x7a3aff, 0x1fb8ff, 0xffffff]);
      floatingText(this.gs, p.x, p.y - 40, 'TELA RACHOU!', '#ff5a5a');
      this.gs.cameras.main.shake(90, 0.004);
    }
  }

  // ---------- Chicote VGA ----------

  private startWhip(time: number) {
    this.whipStart = time;
    this.nextWhip = time + WHIP_COOLDOWN;
    this.whipDealt = false;
    audio.play('whip');
  }

  /** Chicotada: acerta tudo na linha; a ponta (perfeita) causa mais dano. */
  private whipHit() {
    const p = this.player;
    const hand = this.handPoint(0, WHIP_HAND);
    const f = p.facing;
    let perfect = false;
    for (const o of [...this.gs.enemies.getChildren()]) {
      const e = o as Enemy;
      const dx = (e.x - hand.x) * f;
      if (e.dying || dx < -8 || dx > WHIP_REACH + 10 || Math.abs(e.y - hand.y) > 30) continue;
      const sweet = dx >= WHIP_REACH * WHIP_SWEET;
      perfect ||= sweet;
      e.hit(sweet ? WHIP_PERFECT : WHIP_DAMAGE);
      impactSpark(this.gs, e.x - f * 6, hand.y, sweet ? 'bolt_hit' : 'spark');
    }
    const boss = this.gs.boss;
    if (boss && !boss.dying) {
      // procura a zona do chefe da ponta para o punho (a ponta tem prioridade)
      for (let d = WHIP_REACH; d >= 10; d -= 10) {
        const x = hand.x + f * d;
        const zone = boss.zoneNear(x, hand.y, 12);
        if (!zone) continue;
        const sweet = d >= WHIP_REACH * WHIP_SWEET;
        perfect ||= sweet;
        boss.hit(sweet ? WHIP_PERFECT : WHIP_DAMAGE, x, hand.y, zone);
        break;
      }
    }
    this.gs.world.explosionAt(hand.x + f * WHIP_REACH, hand.y, 8);
    audio.play(perfect ? 'crack' : 'swing');
    if (perfect) {
      floatingText(this.gs, hand.x + f * WHIP_REACH, hand.y - 14, 'PERFEITO!', '#ffcf3a');
      this.gs.cameras.main.shake(60, 0.003);
    }
  }

  // ---------- Skills ativas ----------

  private useAbility(slot: number, time: number) {
    const id = this.loadout.abilities[slot];
    if (!id) return;
    const p = this.player;
    if (time < this.activeUntil[slot] || time < this.readyAt[slot]) {
      floatingText(this.gs, p.x, p.y - 36, 'RECARREGANDO', '#ff5a5a');
      return;
    }
    const t = ABILITY_TIMES[id];
    this.activeUntil[slot] = time + t.duration;
    this.readyAt[slot] = time + t.duration + t.cooldown;
    floatingText(this.gs, p.x, p.y - 44, GEAR[id].name + '!', '#ffcf3a');
    audio.play('power');
    if (id === 'morph') {
      this.morphUntil = time + t.duration;
      this.gs.cameras.main.flash(160, 255, 220, 120);
      this.gs.glitchBars(p.x, p.y, [0xff3b3b, 0xffd83a, 0x3a8cff]);
    } else {
      this.pet?.dismiss();
      this.pet = new Pet(this.gs, p.x - p.facing * 20, p.body.bottom - 10);
    }
  }

  private updateAbilities(time: number) {
    this.loadout.abilities.forEach((id, i) => {
      if (id === 'pet' && this.pet && time >= this.activeUntil[i]) {
        this.pet.dismiss();
        this.pet = null;
      }
    });
    if (this.pet && !this.loadout.abilities.includes('pet')) {
      this.pet.dismiss();
      this.pet = null;
    }
    if (!this.loadout.abilities.includes('morph')) this.morphUntil = Math.min(this.morphUntil, time);
  }

  /** Um slot de skill recebeu outra skill: zera o estado dele. */
  resetAbility(slot: number) {
    this.activeUntil[slot] = 0;
    this.readyAt[slot] = 0;
  }

  /** Progresso para o HUD: 'active' (efeito ligado), 'cooldown' ou 'ready', com fração restante. */
  abilityState(slot: number, time: number): { state: 'active' | 'cooldown' | 'ready'; left: number; ratio: number } {
    const id = this.loadout.abilities[slot] as AbilityId | null;
    if (!id) return { state: 'ready', left: 0, ratio: 0 };
    const t = ABILITY_TIMES[id];
    if (time < this.activeUntil[slot]) {
      return { state: 'active', left: this.activeUntil[slot] - time, ratio: (this.activeUntil[slot] - time) / t.duration };
    }
    if (time < this.readyAt[slot]) return { state: 'cooldown', left: this.readyAt[slot] - time, ratio: (this.readyAt[slot] - time) / t.cooldown };
    return { state: 'ready', left: 0, ratio: 0 };
  }

  shieldState(time: number) {
    if (time < this.shieldCooldownUntil) return { cooldown: true, ratio: (this.shieldCooldownUntil - time) / SHIELD_COOLDOWN, hits: 0 };
    return { cooldown: false, ratio: 0, hits: this.shieldHits };
  }

  // ---------- Visual ----------

  /** Ponto a `reach` px do ombro no ângulo de pose `angle` (0 = frente, positivo = para baixo). */
  private handPoint(angle: number, reach: number) {
    const p = this.player.pivot();
    const a = this.worldAngle(angle);
    return { x: p.x + Math.cos(a) * reach, y: p.y + Math.sin(a) * reach };
  }

  /** Converte um ângulo de pose (herói virado para a direita) para o ângulo no mundo. */
  private worldAngle(angle: number) {
    return this.player.facing > 0 ? angle : Math.PI - angle;
  }

  private place(img: Phaser.GameObjects.Image, angle: number) {
    const p = this.player.pivot();
    img.setPosition(p.x, p.y).setRotation(this.worldAngle(angle)).setFlipY(this.player.facing < 0).setVisible(true).setAlpha(this.player.alpha);
  }

  /** Qual braço desenhar neste quadro. */
  private pose(time: number): Pose {
    const l = this.loadout;
    if (time < this.throwStart + THROW_TIME) return 'throw';
    if (time < this.whipStart + WHIP_WINDUP + WHIP_CRACK) return 'whip';
    if (this.blocking) return 'shield';
    if (l.weapons.includes('macbook')) return 'laptop';
    if (l.weapons.includes('vga')) return 'whip';
    if (l.weapons.includes('shield144')) return 'shield';
    return 'none';
  }

  /** Desenha braços, cabo, escudo e armadura. Retorna true se o MacBook deve aparecer. */
  draw(time: number): boolean {
    const p = this.player;
    for (const img of [this.shieldImg, this.whipArm, this.whipPlug, this.throwArm, this.heldPi]) img.setVisible(false);
    this.cableBack.clear();
    this.cableFront.clear();
    this.drawMorph(time);
    if (p.dead) return false;

    const pose = this.pose(time);
    if (pose === 'throw') {
      const t = time - this.throwStart;
      const windup = t < THROW_RELEASE;
      const angle = windup ? -1.75 : 0.3;
      this.place(this.throwArm, angle);
      this.throwArm.setFrame(windup ? 0 : 1);
      if (windup) {
        const h = this.handPoint(angle, THROW_HAND);
        this.heldPi.setPosition(h.x, h.y - 4).setRotation(0.3 * p.facing).setVisible(true);
      }
    } else if (pose === 'whip') {
      this.drawWhip(time);
    } else if (pose === 'shield') {
      const cooling = time < this.shieldCooldownUntil;
      const frame = cooling ? 2 : time < this.shieldFlashUntil ? 1 : 0;
      this.place(this.shieldImg, this.blocking ? 0 : 1.0);
      this.shieldImg.setFrame(frame);
    }
    return pose === 'laptop';
  }

  private drawWhip(time: number) {
    const p = this.player;
    const f = p.facing;
    const t = time - this.whipStart;
    const attacking = t < WHIP_WINDUP + WHIP_CRACK;
    let angle = 1.1; // parado: braço abaixado
    if (attacking) angle = t < WHIP_WINDUP ? Phaser.Math.Linear(0.6, -1.83, t / WHIP_WINDUP) : Math.max(0, -1.83 + ((t - WHIP_WINDUP) / 40) * 1.83);
    this.place(this.whipArm, angle);
    const hand = this.handPoint(angle, WHIP_HAND);

    if (!attacking) {
      // cabo pendurado com o outro conector
      const pts = this.bezier(hand, { x: hand.x + f * 6, y: hand.y + 6 }, { x: hand.x + f * 2, y: hand.y + 14 });
      this.stroke(this.cableFront, pts);
      this.whipPlug.setPosition(hand.x + f * 2, hand.y + 17).setRotation(Math.PI / 2).setFlipY(false).setVisible(true);
      return;
    }
    if (t < WHIP_WINDUP + 20) {
      // preparo: o cabo passa por trás do herói num arco
      const end = { x: p.x - f * 30, y: p.y + 14 };
      const pts = this.bezier(hand, { x: hand.x - f * 34, y: hand.y - 10 }, end);
      this.stroke(this.cableBack, pts);
      this.whipPlug.setPosition(end.x, end.y + 2).setRotation(f > 0 ? Math.PI : 0).setFlipY(f > 0).setVisible(true);
      return;
    }
    // estalo: o cabo estica em onda; o último trecho (amarelo) é a zona perfeita
    const k = t - WHIP_WINDUP - 20;
    const ext = k < 50 ? k / 50 : Math.max(0, 1 - (k - 80) / 70);
    const reach = WHIP_REACH * ext;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= reach; i += 3) {
      const amp = 3.5 * Math.sin((i / WHIP_REACH) * Math.PI) * Math.cos(i / 8 + k / 30);
      pts.push({ x: hand.x + f * i, y: hand.y + amp });
    }
    if (pts.length < 2) return;
    this.stroke(this.cableFront, pts, Math.floor(pts.length * WHIP_SWEET));
    const end = pts[pts.length - 1];
    this.whipPlug.setPosition(end.x + f * 4, end.y).setRotation(f > 0 ? 0 : Math.PI).setFlipY(f < 0).setVisible(true);
    if (ext > 0.95 && k < 110) {
      this.cableFront.fillStyle(0xffffff, 1).fillCircle(end.x + f * 12, end.y, 2);
      this.cableFront.lineStyle(1, 0xffcf3a, 1);
      for (let a = 0; a < 8; a++) {
        const r = (a / 8) * Math.PI * 2;
        this.cableFront.lineBetween(end.x + f * 12 + Math.cos(r) * 3, end.y + Math.sin(r) * 3, end.x + f * 12 + Math.cos(r) * 6, end.y + Math.sin(r) * 6);
      }
    }
  }

  private bezier(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, n = 12) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * b.x + t * t * c.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * b.y + t * t * c.y });
    }
    return pts;
  }

  /** Cabo preto de 2px com brilho em cima; a partir de `sweet` o brilho fica amarelo. */
  private stroke(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], sweet = Infinity) {
    g.lineStyle(3, 0x000105, 1).strokePoints(pts);
    g.lineStyle(2, 0x1a1a24, 1).strokePoints(pts);
    for (let i = 1; i < pts.length; i++) {
      g.lineStyle(1, i >= sweet ? 0xffcf3a : 0x4a4e60, 1).lineBetween(pts[i - 1].x, pts[i - 1].y - 1, pts[i].x, pts[i].y - 1);
    }
    // ferrite perto da ponta
    if (pts.length > 6) {
      const q = pts[pts.length - 5];
      g.fillStyle(0x000105, 1).fillRect(q.x - 3, q.y - 3, 6, 6);
      g.fillStyle(0x2a2d3a, 1).fillRect(q.x - 2, q.y - 2, 4, 4);
      g.fillStyle(0x5a5e72, 1).fillRect(q.x - 2, q.y - 2, 4, 1);
    }
  }

  /** Armadura de brinquedo + aura arco-íris enquanto imortal. */
  private drawMorph(time: number) {
    const p = this.player;
    const on = this.immortal(time) && !p.dead;
    const ending = this.morphUntil - time < 2000 && Math.floor(time / 90) % 2 === 0;
    const vis = on && !ending;
    this.helmet.setVisible(vis);
    this.chest.setVisible(vis);
    this.rainbow.setVisible(on);
    if (!on) return;
    const f = p.facing;
    const bob = HERO_BOB[Number(p.frame.name) || 0] ?? 0;
    this.helmet.setPosition(p.x + f * 4.5, p.y - 14.5 + bob).setFlipX(f < 0);
    this.chest.setPosition(p.x + f * 1, p.y + 0.5 + bob).setFlipX(f < 0);
    const hue = (time / 600) % 1;
    this.rainbow
      .setPosition(p.x, p.y + 2)
      .setTint(Phaser.Display.Color.HSVToRGB(hue, 0.8, 1).color as number)
      .setAlpha(0.7 + Math.sin(time / 80) * 0.25);
    if (Math.random() < 0.15) {
      const s = this.gs.add
        .image(p.x + Phaser.Math.Between(-16, 16), p.y + Phaser.Math.Between(-24, 20), 'fx_spark')
        .setTint(Phaser.Display.Color.HSVToRGB(Math.random(), 0.7, 1).color as number)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.gs.tweens.add({ targets: s, y: s.y - 10, alpha: 0, scale: 0.3, duration: 400, onComplete: () => s.destroy() });
    }
  }

  destroy() {
    this.pet?.destroy();
    for (const o of [this.shieldImg, this.whipArm, this.whipPlug, this.cableBack, this.cableFront, this.throwArm, this.heldPi, this.helmet, this.chest, this.rainbow]) {
      o.destroy();
    }
  }
}
