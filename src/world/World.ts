import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import type { Enemy } from '../entities/Enemy';
import { empBlast, explosion, floatingText, impactSpark } from '../gfx/effects';
import type {
  AmbushDef, DestructibleKind, HazardDef, InteractiveKind, LevelData, MoverDef,
} from '../level/types';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, Theme } from '../themes/Theme';
import { NEON_WORDS } from './art';

type Img = Phaser.Physics.Arcade.Image;
type Body = Phaser.Physics.Arcade.Body;
type StaticBody = Phaser.Physics.Arcade.StaticBody;

const as = <T>(o: unknown) => o as T;
const TAU = Math.PI * 2;

/** Fase (0..1) de um ciclo periódico. */
const cycle = (time: number, period: number, phase = 0) => (((time / period + phase) % 1) + 1) % 1;

interface Mover { img: Img; def: MoverDef; bx: number; by: number }
interface Crumble { img: Img; x: number; y: number; state: 'idle' | 'shaking' | 'gone'; until: number }
interface Phaser_ { img: Img; period: number; phase: number }
interface Conveyor { strip: Phaser.GameObjects.TileSprite; x: number; w: number; speed: number }

interface Shootable {
  kind: DestructibleKind | InteractiveKind;
  hp: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.GameObject;
  broken: boolean;
  onHit?: () => void;
  onBreak: () => void;
}

interface Hazard {
  def: HazardDef;
  update: (time: number) => void;
}

interface Ambush { def: AmbushDef; state: 'waiting' | 'active' | 'done'; wave: number; alive: Enemy[]; nextWaveAt: number }

/**
 * Elementos dinâmicos e interativos de uma fase.
 * Tudo que se move sozinho, reage ao jogador ou pode ser destruído mora aqui.
 */
export class World {
  readonly movers: Phaser.Physics.Arcade.Group;
  /** Objetos que bloqueiam passagem e tiros e podem ser destruídos. */
  readonly destructibles: Phaser.Physics.Arcade.StaticGroup;
  /** Alvos sem colisão física (câmeras, painéis, postes...). */
  readonly targets: Phaser.Physics.Arcade.StaticGroup;

  private moverList: Mover[] = [];
  private crumbles: Crumble[] = [];
  private phasers: Phaser_[] = [];
  private conveyors: Conveyor[] = [];
  private hazards: Hazard[] = [];
  private shootables = new Map<Phaser.GameObjects.GameObject, Shootable>();
  private cameras: { sprite: Phaser.GameObjects.Image; led: Phaser.GameObjects.Image; alive: () => boolean }[] = [];
  private beacons: Phaser.GameObjects.Image[] = [];
  private ambushes: Ambush[] = [];
  private goArrow?: Phaser.GameObjects.Image;

  constructor(
    private gs: GameScene,
    level: LevelData,
    private theme: Theme,
  ) {
    const phys = gs.physics.add;
    this.movers = phys.group({ allowGravity: false, immovable: true });
    this.destructibles = phys.staticGroup();
    this.targets = phys.staticGroup();

    level.movers?.forEach((m) => this.addMover(m));
    level.crumbles?.forEach((c) => this.addCrumble(c.x, c.y, c.w));
    level.phasers?.forEach((p) => this.addPhaser(p.x, p.y, p.w, p.period, p.phase ?? 0));
    level.conveyors?.forEach((c) => this.addConveyor(c.x, c.w, c.speed));
    level.hazards?.forEach((h) => this.addHazard(h));
    level.destructibles?.forEach((d) => this.addDestructible(d.x, d.kind));
    level.interactives?.forEach((i) => this.addInteractive(i.x, i.y, i.kind));
    this.ambushes = (level.ambushes ?? []).map((def) => ({ def, state: 'waiting', wave: 0, alive: [], nextWaveAt: 0 }));
  }

  /** Colisões com o jogador/inimigos/projéteis (chamar depois de criar o jogador). */
  setupColliders() {
    const gs = this.gs;
    const p = gs.physics.add;
    p.collider(gs.player, this.movers, (_pl, m) => this.onStand(as<Img>(m)));
    p.collider([gs.enemies, gs.debris, gs.pickups], this.movers);
    p.collider(gs.player, this.destructibles);
    p.collider(gs.enemies, this.destructibles);
    p.collider(gs.pickups, this.destructibles);

    const bulletHit = (b: unknown, t: unknown) => {
      const bullet = as<Img>(b);
      if (!bullet.active) return;
      const s = this.shootables.get(as<Phaser.GameObjects.GameObject>(t));
      if (!s || s.broken) return;
      impactSpark(gs, bullet.x, bullet.y, bullet.getData('impact') ?? 'spark');
      bullet.destroy();
      this.damage(s, bullet.getData('damage') ?? 1);
    };
    p.overlap(gs.playerBullets, [this.destructibles, this.targets], bulletHit);
    p.overlap(gs.enemyBullets, this.destructibles, bulletHit);
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    for (const m of this.moverList) this.updateMover(m, time);
    for (const c of this.crumbles) this.updateCrumble(c, time);
    for (const ph of this.phasers) this.updatePhaser(ph, time);
    for (const c of this.conveyors) this.updateConveyor(c, dt);
    for (const h of this.hazards) h.update(time);
    this.updateCameras();
    this.updateAmbushes(time);
  }

  // ======================================================== plataformas

  private oneWay(img: Img) {
    const body = img.body as Body;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  private addMover(def: MoverDef) {
    const key = this.theme.mover(this.gs, def.w);
    const img = this.movers.create(def.x + def.w / 2, def.y + 5, key) as Img;
    img.setDepth(DEPTH.world);
    this.oneWay(img);
    this.moverList.push({ img, def, bx: img.x, by: img.y });
  }

  private updateMover(m: Mover, time: number) {
    const { def } = m;
    const a = cycle(time, def.period, def.phase) * TAU;
    const tx = m.bx + (def.dx ?? 0) * Math.sin(a);
    const ty = m.by + (def.dy ?? 0) * Math.sin(a);
    const w = (TAU * 1000) / def.period;
    // velocidade analítica + correção de deriva
    const vx = (def.dx ?? 0) * w * Math.cos(a) + (tx - m.img.x) * 6;
    const vy = (def.dy ?? 0) * w * Math.cos(a) + (ty - m.img.y) * 6;
    m.img.setVelocity(vx, vy);
  }

  private addCrumble(x: number, y: number, w: number) {
    const img = this.movers.create(x + w / 2, y + 5, this.theme.crumble(this.gs, w)) as Img;
    img.setDepth(DEPTH.world);
    this.oneWay(img);
    this.crumbles.push({ img, x: img.x, y: img.y, state: 'idle', until: 0 });
  }

  /** Jogador pisou numa plataforma: se for das que desabam, começa a tremer. */
  private onStand(img: Img) {
    const c = this.crumbles.find((k) => k.img === img);
    if (!c || c.state !== 'idle') return;
    if (this.gs.player.body.bottom > img.body!.top + 3) return;
    c.state = 'shaking';
    c.until = this.gs.time.now + 520;
    this.gs.dust(img.x, img.y + 6, 0.8);
  }

  private updateCrumble(c: Crumble, time: number) {
    const img = c.img;
    img.setVelocity(0, 0);
    if (c.state === 'shaking') {
      img.x = c.x + (Math.random() - 0.5) * 2;
      if (time > c.until) {
        c.state = 'gone';
        c.until = time + 3800;
        (img.body as Body).enable = false;
        for (let i = 0; i < 3; i++) this.gs.dust(img.x + (i - 1) * 14, img.y + 4, 0.9);
        this.gs.tweens.add({ targets: img, y: c.y + 160, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: 700, ease: 'Quad.easeIn' });
      }
    } else if (c.state === 'gone' && time > c.until) {
      c.state = 'idle';
      img.setPosition(c.x, c.y).setAngle(0);
      (img.body as Body).enable = true;
      (img.body as Body).reset(c.x, c.y);
      this.gs.tweens.add({ targets: img, alpha: 1, duration: 300 });
    }
  }

  private addPhaser(x: number, y: number, w: number, period: number, phase: number) {
    const img = this.movers.create(x + w / 2, y + 5, this.theme.mover(this.gs, w)) as Img;
    img.setDepth(DEPTH.world);
    this.oneWay(img);
    this.phasers.push({ img, period, phase });
  }

  /** Luz sólida: 60% do ciclo ligada, pisca antes de sumir, 40% desligada. */
  private updatePhaser(ph: Phaser_, time: number) {
    const t = cycle(time, ph.period, ph.phase);
    const on = t < 0.6;
    const warn = t > 0.47 && t < 0.6;
    const body = ph.img.body as Body;
    body.enable = on;
    ph.img.setVelocity(0, 0);
    ph.img.setAlpha(!on ? 0.12 : warn ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1);
  }

  // ======================================================== esteiras

  private addConveyor(x: number, w: number, speed: number) {
    const strip = this.gs.add.tileSprite(x, GROUND_Y - 3, w, 14, 'conveyor').setOrigin(0).setDepth(DEPTH.lip);
    this.conveyors.push({ strip, x, w, speed });
  }

  private updateConveyor(c: Conveyor, dt: number) {
    c.strip.tilePositionX -= c.speed * dt;
    const push = (sprite: Phaser.Physics.Arcade.Sprite) => {
      const body = sprite.body as Body | null;
      if (!body || !body.enable || !body.blocked.down) return;
      if (Math.abs(body.bottom - GROUND_Y) > 3 || sprite.x < c.x || sprite.x > c.x + c.w) return;
      sprite.x += c.speed * dt;
    };
    if (!this.gs.player.dead) push(this.gs.player);
    for (const e of this.gs.enemies.getChildren()) push(e as Phaser.Physics.Arcade.Sprite);
  }

  // ======================================================== perigos

  private addHazard(def: HazardDef) {
    if (def.type === 'crusher') this.hazards.push(this.makeCrusher(def));
    else if (def.type === 'laser') this.hazards.push(this.makeLaser(def));
    else if (def.type === 'vent') this.hazards.push(this.makeVent(def));
    else this.hazards.push(this.makeLiveWire(def));
  }

  private playerTouches(rect: Phaser.Geom.Rectangle) {
    const p = this.gs.player;
    if (!p.isVulnerable(this.gs.time.now)) return false;
    const b = p.body;
    return Phaser.Geom.Intersects.RectangleToRectangle(rect, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height));
  }

  private onScreen(x: number, margin = 60) {
    const v = this.gs.cameras.main.worldView;
    return x > v.x - margin && x < v.right + margin;
  }

  /** Prensa: espera no alto, avisa (luzes), desce com tudo, segura e sobe devagar. */
  private makeCrusher(def: Extract<HazardDef, { type: 'crusher' }>): Hazard {
    const gs = this.gs;
    const top = 22;
    const upY = GROUND_Y - 118;
    const downY = GROUND_Y - 16;
    gs.add.image(def.x, top, 'crusher_housing').setDepth(DEPTH.hazardBack);
    const shaft = gs.add.tileSprite(def.x, top + 8, 14, 10, 'crusher_shaft').setOrigin(0.5, 0).setDepth(DEPTH.hazardBack);
    const head = gs.add.image(def.x, upY, 'crusher_head').setDepth(DEPTH.hazardFront);
    const warn = gs.add.image(def.x, upY, 'eye_glow').setScale(5, 2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.hazardFront);
    let slammed = false;
    return {
      def,
      update: (time) => {
        const t = cycle(time, def.period, def.phase);
        let y: number;
        if (t < 0.55) y = upY;
        else if (t < 0.72) y = upY + Math.sin(time / 25) * 1.2; // tremendo (aviso)
        else if (t < 0.76) y = upY + (downY - upY) * Phaser.Math.Easing.Quadratic.In((t - 0.72) / 0.04);
        else if (t < 0.86) y = downY;
        else y = downY + (upY - downY) * ((t - 0.86) / 0.14);
        head.y = y;
        shaft.height = Math.max(4, y - top - 18);
        warn.setPosition(def.x, y + 8).setAlpha(t >= 0.55 && t < 0.72 ? (Math.floor(time / 90) % 2 ? 0.8 : 0.2) : 0);

        const lethal = t >= 0.72 && t < 0.86;
        if (t >= 0.76 && !slammed) {
          slammed = true;
          if (this.onScreen(def.x)) {
            gs.cameras.main.shake(90, 0.006);
            gs.dust(def.x - 18, GROUND_Y, 1);
            gs.dust(def.x + 18, GROUND_Y, 1);
          }
        }
        if (t < 0.72) slammed = false;
        if (lethal) {
          const zone = new Phaser.Geom.Rectangle(def.x - 21, y - 12, 42, 26);
          if (this.playerTouches(zone)) gs.hurtPlayer(2, def.x);
          for (const o of gs.enemies.getChildren()) {
            const e = o as Enemy;
            if (!e.dying && Math.abs(e.x - def.x) < 22 && e.y - 23 < y + 12) e.hit(99);
          }
        }
      },
    };
  }

  /** Grade de laser: pisca como aviso, liga (letal), desliga. */
  private makeLaser(def: Extract<HazardDef, { type: 'laser' }>): Hazard {
    const gs = this.gs;
    const h = GROUND_Y - def.top - 8;
    gs.add.image(def.x, def.top, 'laser_emitter').setDepth(DEPTH.hazardFront);
    gs.add.image(def.x, GROUND_Y - 2, 'laser_emitter').setFlipY(true).setDepth(DEPTH.hazardFront);
    const beam = gs.add
      .tileSprite(def.x, def.top + 5, 8, h, 'laser_beam')
      .setOrigin(0.5, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.hazardFront);
    const onFrac = def.onTime / def.period;
    return {
      def,
      update: (time) => {
        const t = cycle(time, def.period, def.phase);
        const on = t < onFrac;
        const warn = !on && t > 1 - 350 / def.period;
        beam.tilePositionY -= 2;
        if (on) beam.setAlpha(0.85 + Math.random() * 0.15).setScale(1, 1);
        else if (warn) beam.setAlpha(Math.floor(time / 50) % 2 ? 0.35 : 0).setScale(0.3, 1);
        else beam.setAlpha(0);
        if (on && this.playerTouches(new Phaser.Geom.Rectangle(def.x - 3, def.top, 6, h + 8))) gs.hurtPlayer();
      },
    };
  }

  /** Respiro de vapor: solta fumaça de tempos em tempos e lança o jogador para cima. */
  private makeVent(def: Extract<HazardDef, { type: 'vent' }>): Hazard {
    const gs = this.gs;
    gs.add.image(def.x, GROUND_Y - 1, 'vent').setDepth(DEPTH.lip);
    let nextPuff = 0;
    let cooldown = 0;
    const puff = (scale: number) => {
      const s = gs.add.sprite(def.x, GROUND_Y - 22 * scale, 'steam').setScale(scale).setDepth(DEPTH.hazardFront).setAlpha(0.9);
      s.play('steam');
      s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    };
    return {
      def,
      update: (time) => {
        if (time > nextPuff && this.onScreen(def.x)) {
          puff(0.55);
          nextPuff = time + Phaser.Math.Between(900, 1600);
        }
        const p = gs.player;
        if (p.dead || time < cooldown) return;
        const b = p.body;
        if (Math.abs(p.x - def.x) < 13 && b.bottom >= GROUND_Y - 3 && b.velocity.y >= 0) {
          p.setVelocityY(-(def.power ?? 560));
          cooldown = time + 400;
          puff(1.3);
          gs.cameras.main.shake(60, 0.003);
        }
      },
    };
  }

  /** Cabo energizado numa poça: eletrifica o trecho periodicamente. */
  private makeLiveWire(def: Extract<HazardDef, { type: 'livewire' }>): Hazard {
    const gs = this.gs;
    const cx = def.x + def.w / 2;
    const puddle = gs.add.image(cx, GROUND_Y - 1, 'puddle').setDisplaySize(def.w, 6).setDepth(DEPTH.lip);
    const glow = gs.add
      .image(cx, GROUND_Y - 1, 'puddle')
      .setDisplaySize(def.w, 8)
      .setTint(0x8ff0ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(DEPTH.lip);
    // cabo pendurado de um poste quebrado
    const g = gs.add.graphics().setDepth(DEPTH.decor);
    g.fillStyle(0x07080c).fillRect(def.x + def.w - 6, GROUND_Y - 88, 5, 88);
    g.fillStyle(0x3a404c).fillRect(def.x + def.w - 5, GROUND_Y - 87, 2, 86);
    g.lineStyle(2, 0x07080c).beginPath();
    g.moveTo(def.x + def.w - 4, GROUND_Y - 84);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(def.x + def.w - 4, GROUND_Y - 84),
      new Phaser.Math.Vector2(cx + 10, GROUND_Y - 70),
      new Phaser.Math.Vector2(cx, GROUND_Y - 1),
    );
    curve.draw(g, 16);
    const zaps = [0, 1, 2].map(() => gs.add.sprite(cx, GROUND_Y - 6, 'zap').setDepth(DEPTH.hazardFront).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    zaps.forEach((z) => z.play('zap'));
    const tip = gs.add.sprite(cx, GROUND_Y - 4, 'zap').setScale(0.6).setDepth(DEPTH.hazardFront).setBlendMode(Phaser.BlendModes.ADD);
    tip.play('zap');
    void puddle;
    return {
      def,
      update: (time) => {
        const t = cycle(time, def.period, def.phase);
        const on = t > 0.62;
        const warn = t > 0.5 && !on;
        glow.setAlpha(on ? 0.55 + Math.random() * 0.4 : warn ? Math.random() * 0.2 : 0);
        zaps.forEach((z, i) => {
          z.setVisible(on);
          if (on && Math.random() < 0.2) z.setPosition(def.x + Math.random() * def.w, GROUND_Y - 4 - Math.random() * 6).setFlipX(i % 2 === 0);
        });
        tip.setAlpha(on ? 1 : 0.5);
        if (on) {
          const zone = new Phaser.Geom.Rectangle(def.x, GROUND_Y - 6, def.w, 8);
          if (this.playerTouches(zone)) gs.hurtPlayer();
        }
      },
    };
  }

  // ======================================================== destrutíveis

  private register(s: Shootable) {
    this.shootables.set(s.body, s);
  }

  private addDestructible(x: number, kind: DestructibleKind) {
    const gs = this.gs;
    const key = kind;
    const tex = gs.textures.get(key).getSourceImage() as HTMLImageElement;
    const h = tex.height;
    const img = this.destructibles.create(x, GROUND_Y - h / 2, key) as Img;
    img.setDepth(DEPTH.world);
    if (kind === 'car') (img.body as StaticBody).setSize(62, 18).setOffset(4, 10);
    const hp = { barrel: 3, car: 10, generator: 6, datanode: 5 }[kind];
    const s: Shootable = {
      kind,
      hp,
      x,
      y: img.y,
      sprite: img,
      body: img,
      broken: false,
      onHit: () => {
        img.setTintFill(0xffffff);
        gs.time.delayedCall(40, () => img.active && img.clearTint());
        if (kind === 'car' && s.hp <= 4 && !img.getData('smoking')) {
          img.setData('smoking', true);
          const smoke = gs.add
            .particles(x - 20, img.y - 10, 'puff', {
              frame: [2, 3, 4],
              lifespan: 1200,
              speedY: { min: -30, max: -15 },
              speedX: { min: -8, max: 8 },
              alpha: { start: 0.7, end: 0 },
              tint: 0x3a3430,
              frequency: 140,
            })
            .setDepth(DEPTH.world);
          img.setData('smoke', smoke);
        }
      },
      onBreak: () => this.explodeDestructible(s, img),
    };
    this.register(s);
  }

  private explodeDestructible(s: Shootable, img: Img) {
    const gs = this.gs;
    const { x } = s;
    const y = img.y;
    const radius = { barrel: 54, car: 72, generator: 56, datanode: 44 }[s.kind as DestructibleKind];
    (img.getData('smoke') as Phaser.GameObjects.Particles.ParticleEmitter | undefined)?.destroy();
    if (s.kind === 'datanode') {
      empBlast(gs, x, y + 6);
    } else if (s.kind === 'generator') {
      empBlast(gs, x, y + 6);
      explosion(gs, x, y + 8, 0.8);
    } else {
      explosion(gs, x, y + (s.kind === 'car' ? 10 : 8), s.kind === 'car' ? 1.5 : 1.1);
    }
    gs.cameras.main.shake(s.kind === 'car' ? 220 : 140, s.kind === 'car' ? 0.014 : 0.009);
    if (s.kind === 'car') {
      // carcaça queimada fica como decoração
      gs.add.image(x, img.y, 'car_burnt').setDepth(DEPTH.decor);
      gs.add
        .particles(x, img.y - 6, 'puff', {
          frame: [2, 3, 4],
          lifespan: 1600,
          speedY: { min: -26, max: -12 },
          alpha: { start: 0.6, end: 0 },
          tint: 0x2a2624,
          frequency: 200,
        })
        .setDepth(DEPTH.decor);
    }
    img.destroy();
    gs.addScore({ barrel: 100, car: 500, generator: 300, datanode: 300 }[s.kind as DestructibleKind], x, y - 20);
    gs.dropFragments(x, y - 10, s.kind === 'car' ? 5 : 2);
    this.blast(x, y, radius, s);
  }

  /** Onda de choque: fere robôs, o jogador (se muito perto) e detona outros destrutíveis (reação em cadeia). */
  private blast(x: number, y: number, radius: number, source?: Shootable) {
    const gs = this.gs;
    for (const o of [...gs.enemies.getChildren()]) {
      const e = o as Enemy;
      if (!e.dying && Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius) e.hit(4);
    }
    if (Phaser.Math.Distance.Between(x, y, gs.player.x, gs.player.y) < radius * 0.55) gs.hurtPlayer(1, x);
    for (const s of this.shootables.values()) {
      if (s === source || s.broken) continue;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) < radius) {
        gs.time.delayedCall(Phaser.Math.Between(120, 260), () => this.damage(s, 99));
      }
    }
  }

  private damage(s: Shootable, amount: number) {
    if (s.broken) return;
    s.hp -= amount;
    if (s.hp <= 0) {
      s.broken = true;
      this.shootables.delete(s.body);
      s.onBreak();
    } else {
      s.onHit?.();
    }
  }

  /** Explosões de fora (granadas) também atingem destrutíveis e alvos. */
  explosionAt(x: number, y: number, radius: number) {
    for (const s of [...this.shootables.values()]) {
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) < radius + 10) this.damage(s, 4);
    }
  }

  // ======================================================== interativos

  private hitZone(x: number, y: number, w: number, h: number) {
    const zone = this.gs.add.zone(x, y, w, h);
    this.gs.physics.add.existing(zone, true);
    this.targets.add(zone);
    return zone;
  }

  private sparkBurst(x: number, y: number, tint = 0xffe066) {
    const p = this.gs.add
      .particles(x, y, 'fx_spark', {
        speed: { min: 40, max: 140 },
        angle: { min: 200, max: 340 },
        gravityY: 500,
        lifespan: 500,
        scale: { start: 0.8, end: 0 },
        tint,
        emitting: false,
      })
      .setDepth(DEPTH.hazardFront);
    p.explode(12);
    this.gs.time.delayedCall(700, () => p.destroy());
  }

  private addInteractive(x: number, yOpt: number | undefined, kind: InteractiveKind) {
    const gs = this.gs;
    if (kind === 'camera') {
      const y = yOpt ?? GROUND_Y - 110;
      gs.add.image(x, y - 6, 'camera_mount').setDepth(DEPTH.interactive);
      const sprite = gs.add.image(x, y + 2, 'camera').setOrigin(0.2, 0.5).setDepth(DEPTH.interactive);
      const led = gs.add.image(x, y + 2, 'eye_glow').setScale(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.interactive);
      const zone = this.hitZone(x + 4, y + 2, 16, 12);
      const s: Shootable = {
        kind, hp: 1, x, y, sprite, body: zone, broken: false,
        onBreak: () => {
          this.sparkBurst(x + 4, y + 2);
          led.destroy();
          gs.tweens.add({ targets: sprite, y: y + 30, angle: 120, alpha: 0, duration: 500 });
          gs.addScore(100, x, y - 8);
        },
      };
      this.register(s);
      this.cameras.push({ sprite, led, alive: () => !s.broken });
    } else if (kind === 'billboard') {
      this.addBillboard(x, yOpt ?? GROUND_Y - 150);
    } else if (kind === 'lamp') {
      const y = GROUND_Y + 1;
      const lamp = gs.add.image(x, y, 'lamp').setOrigin(0.2, 1).setDepth(DEPTH.interactive);
      const cone = gs.add
        .image(x + 15, y - 80, 'lamp_cone')
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35)
        .setDepth(DEPTH.interactive);
      const flicker = gs.time.addEvent({
        delay: Phaser.Math.Between(1500, 4000),
        loop: true,
        callback: () => {
          if (Math.random() < 0.5) gs.tweens.add({ targets: cone, alpha: 0.05, duration: 50, yoyo: true, repeat: 2 });
        },
      });
      const zone = this.hitZone(x + 15, y - 80, 14, 8);
      this.register({
        kind, hp: 1, x: x + 15, y: y - 80, sprite: lamp, body: zone, broken: false,
        onBreak: () => {
          flicker.remove();
          cone.destroy();
          this.sparkBurst(x + 15, y - 78, 0xfff4c0);
          lamp.setTint(0x777777);
          gs.addScore(50, x + 15, y - 90);
        },
      });
    } else if (kind === 'neon') {
      const y = yOpt ?? GROUND_Y - 96;
      const i = Math.abs(Math.floor(x / 97)) % NEON_WORDS.length;
      gs.add.rectangle(x, y + 9, 4, GROUND_Y - y - 9, 0x07080c).setOrigin(0.5, 0).setDepth(DEPTH.interactive);
      gs.add.rectangle(x - 1, y + 9, 1, GROUND_Y - y - 9, 0x3a404c).setOrigin(0.5, 0).setDepth(DEPTH.interactive);
      const glow = gs.add.image(x, y, `neon_glow_${i}`).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.interactive);
      const sign = gs.add.image(x, y, `neon_${i}`).setDepth(DEPTH.interactive);
      const flick = gs.time.addEvent({
        delay: 120,
        loop: true,
        callback: () => {
          const off = Math.random() < 0.06;
          sign.setAlpha(off ? 0.35 : 1);
          glow.setAlpha(off ? 0.1 : 0.8 + Math.random() * 0.2);
        },
      });
      const zone = this.hitZone(x, y, sign.width, 18);
      this.register({
        kind, hp: 2, x, y, sprite: sign, body: zone, broken: false,
        onBreak: () => {
          flick.remove();
          glow.destroy();
          sign.setTint(0x444444).setAlpha(1);
          this.sparkBurst(x, y + 6, 0xff8cf5);
          gs.tweens.add({ targets: sign, angle: 8, y: y + 3, duration: 200 });
          gs.addScore(100, x, y - 12);
        },
      });
    } else {
      // sirene de alarme: acende durante emboscadas
      const y = yOpt ?? GROUND_Y - 120;
      gs.add.image(x, y, 'beacon').setDepth(DEPTH.interactive);
      const cone = gs.add
        .image(x, y + 1, 'beacon_cone')
        .setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(DEPTH.interactive);
      this.beacons.push(cone);
    }
  }

  /** Painel holográfico: alterna propagandas, falha de vez em quando e "glitcha" ao levar tiros. */
  private addBillboard(x: number, y: number) {
    const gs = this.gs;
    const pole = gs.add.rectangle(x, y + 22, 6, GROUND_Y - y - 22, 0x07080c).setOrigin(0.5, 0).setDepth(DEPTH.interactive);
    gs.add.rectangle(x, y + 22, 2, GROUND_Y - y - 22, 0x3a404c).setOrigin(0.5, 0).setDepth(DEPTH.interactive);
    void pole;
    gs.add.image(x, y, 'billboard_frame').setDepth(DEPTH.interactive);
    const holo = gs.add.image(x, y, 'billboard', 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.interactive);
    const glow = gs.add.image(x, y + 30, 'eye_glow').setScale(9, 3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(DEPTH.interactive);
    let frame = 0;
    let glitchUntil = 0;
    const cycleEvt = gs.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        frame = (frame + 1) % 4;
        holo.setFrame(frame);
        glitchUntil = gs.time.now + 180;
      },
    });
    const jitter = gs.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const glitch = gs.time.now < glitchUntil || Math.random() < 0.015;
        holo.setPosition(x + (glitch ? Phaser.Math.Between(-4, 4) : 0), y + (glitch ? Phaser.Math.Between(-1, 1) : 0));
        holo.setAlpha(glitch ? 0.4 + Math.random() * 0.5 : 0.85 + Math.random() * 0.1);
        holo.setTint(glitch && Math.random() < 0.5 ? 0x66ffff : 0xffffff);
      },
    });
    const zone = this.hitZone(x, y, 80, 40);
    this.register({
      kind: 'billboard', hp: 8, x, y, sprite: holo, body: zone, broken: false,
      onHit: () => {
        glitchUntil = gs.time.now + 260;
      },
      onBreak: () => {
        cycleEvt.remove();
        jitter.remove();
        glow.destroy();
        this.sparkBurst(x - 20, y + 10, 0xff5060);
        this.sparkBurst(x + 20, y + 4, 0xff5060);
        gs.tweens.add({ targets: holo, alpha: 0, scaleY: 0.05, duration: 220 });
        floatingText(gs, x, y, 'SEM SINAL', '#ff5060');
        gs.addScore(300, x, y - 24);
      },
    });
  }

  /** Câmeras giram para acompanhar o jogador; o LED pisca rápido quando o veem. */
  private updateCameras() {
    const p = this.gs.player;
    const t = this.gs.time.now;
    for (const c of this.cameras) {
      if (!c.alive()) continue;
      const dx = p.x - c.sprite.x;
      const dy = p.y - c.sprite.y;
      const seen = Math.abs(dx) < 200 && !p.dead;
      const target = seen ? Phaser.Math.Clamp(Math.atan2(dy, dx), -0.2, Math.PI + 0.2) : Math.PI / 2 + Math.sin(t / 900) * 0.9;
      c.sprite.rotation = Phaser.Math.Angle.RotateTo(c.sprite.rotation, target, 0.06);
      c.sprite.setFlipY(Math.cos(c.sprite.rotation) < 0);
      const lx = c.sprite.x + Math.cos(c.sprite.rotation) * 11;
      const ly = c.sprite.y + Math.sin(c.sprite.rotation) * 11;
      c.led.setPosition(lx, ly).setAlpha(seen ? (Math.floor(t / 90) % 2 ? 1 : 0.2) : Math.floor(t / 600) % 2 ? 0.8 : 0.2);
    }
  }

  // ======================================================== emboscadas

  private setAlarm(on: boolean) {
    for (const cone of this.beacons) {
      this.gs.tweens.killTweensOf(cone);
      if (on) {
        cone.setAlpha(0.7);
        this.gs.tweens.add({ targets: cone, angle: 360, duration: 900, repeat: -1 });
      } else {
        cone.setAlpha(0);
      }
    }
  }

  private updateAmbushes(time: number) {
    const gs = this.gs;
    const cam = gs.cameras.main;
    for (const a of this.ambushes) {
      if (a.state === 'waiting' && cam.scrollX >= a.def.x - 2) {
        a.state = 'active';
        a.wave = 0;
        a.nextWaveAt = time + 700;
        gs.cameraLock = a.def.x;
        gs.showBanner('ALERTA!', 'SISTEMA DE DEFESA ATIVADO', 1200, '#ff3a3a');
        gs.cameras.main.flash(200, 255, 40, 40);
        this.setAlarm(true);
      }
      if (a.state !== 'active') continue;
      a.alive = a.alive.filter((e) => e.active && !e.dying);
      if (a.alive.length === 0 && time > a.nextWaveAt) {
        const wave = a.def.waves[a.wave];
        if (!wave) {
          a.state = 'done';
          gs.cameraLock = null;
          this.setAlarm(false);
          this.showGo();
          continue;
        }
        wave.forEach((s, i) => {
          gs.time.delayedCall(i * 220, () => {
            const e = gs.spawnEnemy(s.type, a.def.x + s.dx, s.y, true);
            a.alive.push(e);
          });
        });
        a.wave++;
        a.nextWaveAt = time + wave.length * 220 + 900;
      }
    }
  }

  private showGo() {
    const gs = this.gs;
    this.goArrow?.destroy();
    const arrow = gs.add.image(GAME_WIDTH - 40, GAME_HEIGHT / 2 - 30, 'go_arrow').setScrollFactor(0).setDepth(150);
    this.goArrow = arrow;
    gs.tweens.add({ targets: arrow, x: GAME_WIDTH - 30, duration: 250, yoyo: true, repeat: 7, onComplete: () => arrow.destroy() });
  }
}
