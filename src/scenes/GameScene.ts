import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { Controls } from '../input/Controls';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ENEMIES, EnemyType } from '../entities/enemyTypes';
import type { WeaponDef } from '../entities/weapons';
import { MISSION_COUNT, missionLevel } from '../level/missions';
import type { LevelData } from '../level/types';
import { dustPuff, empBlast, explosion, floatingText, impactSpark, muzzleFlash, slash } from '../gfx/effects';
import { DEPTH, PARALLAX, Theme } from '../themes/Theme';
import { THEMES } from '../themes';
import { World } from '../world/World';
import { Hud } from '../ui/Hud';
import { SkillChoice } from '../ui/SkillChoice';
import { RunState } from '../run/RunState';
import { loadSave, upgradeLevel } from '../run/save';
import { rollSkills, SkillDef } from '../run/skills';
import type { Boss } from '../bosses/Boss';
import { Sentinel } from '../bosses/Sentinel';
import { Forger } from '../bosses/Forger';
import { Eye } from '../bosses/Eye';

type ArcadeImage = Phaser.Physics.Arcade.Image;
type GameState = 'playing' | 'choosing' | 'gameover' | 'clear';

export interface GameInit {
  run?: RunState;
}

const GRENADE_FUSE = 1100;
const GRENADE_RADIUS = 52;
const GRENADE_DAMAGE = 4;
const CAMERA_LEAD = 0.4;
const GROUND_H = GAME_HEIGHT - GROUND_Y;
const PIT_DAMAGE = 2;
/** Vida extra dos robôs a cada missão (dificuldade crescente). */
const ENEMY_HP_PER_MISSION = 0.4;
/** Vida base dos chefes (cresce um pouco com o número de skills da run). */
const BOSS_HP = { sentinel: 160, forger: 100, eye: 180 } as const;

/** Converte os argumentos genéricos dos callbacks de colisão do Phaser. */
const as = <T>(o: unknown) => o as T;

export class GameScene extends Phaser.Scene {
  controls!: Controls;
  player!: Player;
  run!: RunState;
  state: GameState = 'playing';
  /** Emboscadas e chefes travam a câmera neste scrollX (null = livre). */
  cameraLock: number | null = null;

  level!: LevelData;
  theme!: Theme;
  world!: World;
  hud!: Hud;

  solids!: Phaser.Physics.Arcade.StaticGroup;
  platforms!: Phaser.Physics.Arcade.StaticGroup;
  enemies!: Phaser.Physics.Arcade.Group;
  playerBullets!: Phaser.Physics.Arcade.Group;
  enemyBullets!: Phaser.Physics.Arcade.Group;
  grenades!: Phaser.Physics.Arcade.Group;
  pickups!: Phaser.Physics.Arcade.Group;
  debris!: Phaser.Physics.Arcade.Group;
  /** Fragmentos de dados e kits de cura. */
  loot!: Phaser.Physics.Arcade.Group;
  /** Zonas de acerto do chefe atual. */
  bossHurt!: Phaser.Physics.Arcade.Group;
  boss: Boss | null = null;
  private bossStarted = false;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private spawnIndex = 0;
  private lastSafeX = 60;
  private terminals: { img: Phaser.GameObjects.Image; prompt: Phaser.GameObjects.Text; used: boolean }[] = [];
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Game');
  }

  get missionIndex() {
    return this.run.mission;
  }

  create(data: GameInit = {}) {
    // A instância da cena é reaproveitada no restart: resetar estado aqui.
    this.run = data.run ?? new RunState();
    this.run.mission = Phaser.Math.Clamp(this.run.mission, 0, MISSION_COUNT - 1);
    this.level = missionLevel(this.run.mission, this.run.seed);
    this.theme = THEMES[this.level.theme];
    this.state = 'playing';
    this.spawnIndex = 0;
    this.cameraLock = null;
    this.lastSafeX = 60;
    this.terminals = [];
    this.boss = null;
    this.bossStarted = false;
    this.physics.resume();

    this.theme.generate(this, this.level);
    this.controls = new Controls(this);
    this.enterKey = this.input.keyboard!.addKey('ENTER');

    this.theme.background(this, this.level);
    this.createGroups();
    this.buildLevel();
    this.world = new World(this, this.level, this.theme);
    this.theme.ambience(this, this.level);
    this.createBits();

    this.player = new Player(this, 60, GROUND_Y - 24, this.controls);
    this.createColliders();
    this.world.setupColliders();

    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.cameras.main.fadeIn(400);
    this.hud = new Hud(this, this.level.name);
    this.showBanner(this.level.name, this.level.subtitle, 2200);

    // Melhoria "Boot com Skill": primeira escolha logo no início da run
    if (this.run.bootChoice && this.run.mission === 0) {
      this.run.bootChoice = false;
      this.time.delayedCall(2600, () => this.openSkillChoice('BOOT: ESCOLHA UMA SKILL'));
    }
  }

  update(time: number, delta: number) {
    if (this.state === 'playing') {
      this.run.timeMs += delta;
      this.player.update(time);
      this.updateCamera();
      this.spawnEnemies();
      this.world.update(time, delta);
      this.updateLoot();
      this.updateTerminals();
      this.trackSafeGround();
      this.updateBoss(time, delta);

      if (!this.player.dead && this.player.y > GAME_HEIGHT + 30) this.fallIntoPit();
      if (!this.player.dead && this.player.x >= this.level.goalX && this.cameraLock === null && !this.boss) this.missionClear();
    } else if ((this.state === 'gameover' || this.state === 'clear') && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.advance();
      return;
    }

    this.cleanupProjectiles();
    this.hud.update();
  }

  // ---------- Montagem ----------

  private createGroups() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.playerBullets = this.physics.add.group({ allowGravity: false });
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.grenades = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.debris = this.physics.add.group({ bounceY: 0.35, dragX: 70 });
    this.loot = this.physics.add.group({ bounceY: 0.4, dragX: 120 });
    this.bossHurt = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  private buildLevel() {
    const L = this.level;
    const T = this.theme;
    const g = T.ground;

    // Fundo dos buracos (+ brilho, se o tema tiver: lava, energia...)
    this.add.tileSprite(0, GROUND_Y + 2, L.width, GROUND_H, g.pit).setOrigin(0).setDepth(DEPTH.pit);
    if (T.pitGlow !== undefined) {
      let x = 0;
      for (const seg of [...L.ground, { x: L.width, w: 0 }]) {
        if (seg.x > x + 4) {
          const glow = this.add
            .image((x + seg.x) / 2, GROUND_Y + 6, 'eye_glow')
            .setDisplaySize(seg.x - x + 30, 60)
            .setTint(T.pitGlow)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.pit);
          this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
        }
        x = seg.x + seg.w;
      }
    }

    for (const seg of L.ground) {
      const ground = this.add.tileSprite(seg.x, GROUND_Y, seg.w, GROUND_H, g.fill).setOrigin(0).setDepth(DEPTH.ground);
      this.physics.add.existing(ground, true);
      this.solids.add(ground);
      this.add.tileSprite(seg.x, GROUND_Y - 8, seg.w, 10, g.top).setOrigin(0).setDepth(DEPTH.lip);
      if (seg.x > 0) this.add.image(seg.x, GROUND_Y - 6, g.edge).setOrigin(0).setFlipX(true).setDepth(DEPTH.lip);
      if (seg.x + seg.w < L.width) this.add.image(seg.x + seg.w - 14, GROUND_Y - 6, g.edge).setOrigin(0).setDepth(DEPTH.lip);
    }

    for (const d of L.decor) {
      this.add.image(d.x, GROUND_Y + 3, `${T.id}_decor_${d.kind}`).setOrigin(0.5, 1).setDepth(DEPTH.decor);
    }

    for (const b of L.blocks) {
      const block = this.solids.create(b.x + b.w / 2, GROUND_Y - b.h / 2, T.block(this, b.kind, b.w, b.h));
      block.setDepth(DEPTH.ground);
    }

    for (const p of L.platforms) {
      const pillarH = GROUND_Y - p.y - 8;
      for (const px of [p.x + 4, p.x + p.w - 22]) {
        this.add.image(px, p.y + 10, T.pillar(this, pillarH)).setOrigin(0).setDepth(DEPTH.pillar);
      }
      const plat = this.platforms.create(p.x + p.w / 2, p.y + 7, T.ledge(this, p.w)) as Phaser.Physics.Arcade.Sprite;
      plat.setDepth(DEPTH.ground);
      // Mão única: só colide por cima.
      const body = plat.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    for (const pk of L.pickups) {
      const crate = this.pickups.create(pk.x, pk.y ?? GROUND_Y - 30, pk.kind === 'heavy' ? 'crate_heavy' : 'crate_bomb');
      crate.setData('kind', pk.kind).setDepth(DEPTH.pickup);
    }

    for (const t of L.terminals ?? []) this.addTerminal(t.x);

    this.add.rectangle(L.goalX, GROUND_Y - 70, 3, 70, 0x333333).setOrigin(0).setDepth(DEPTH.decor);
    this.add.image(L.goalX + 2, GROUND_Y - 70, 'flag').setOrigin(0).setDepth(DEPTH.decor);

    for (const f of L.foreground) {
      const key = `${T.id}_fg_${f.kind}`;
      const hangs = (this.textures.get(key).customData as { hangs?: boolean }).hangs;
      const img = hangs
        ? this.add.image(f.x, -2, key).setOrigin(0.5, 0)
        : this.add.image(f.x, GAME_HEIGHT + 6, key).setOrigin(0.5, 1);
      img.setScrollFactor(PARALLAX.fg).setDepth(DEPTH.foreground);
    }
  }

  /** Terminal de upgrade: ao chegar perto e apertar CIMA, abre a escolha de skill. */
  addTerminal(x: number) {
    const img = this.add.image(x, GROUND_Y + 1, 'upgrade_terminal', 0).setOrigin(0.5, 1).setDepth(DEPTH.interactive);
    const glow = this.add.image(x, GROUND_Y - 38, 'eye_glow').setScale(3).setTint(0x8ff0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.interactive);
    this.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.8 }, duration: 700, yoyo: true, repeat: -1 });
    const prompt = this.add
      .text(x, GROUND_Y - 60, 'CIMA: UPGRADE', { fontFamily: FONT, fontSize: '8px', color: '#8ff0ff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setDepth(DEPTH.foreground)
      .setVisible(false);
    img.setData('glow', glow);
    this.terminals.push({ img, prompt, used: false });
  }

  private createBits() {
    // Bits "0/1" que saltam do teclado a cada disparo (no lugar de cápsulas)
    this.bits = this.add
      .particles(0, 0, 'bits', {
        frame: [0, 1],
        lifespan: 650,
        speed: { min: 30, max: 80 },
        angle: { min: 235, max: 305 },
        gravityY: 90,
        alpha: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(11);
  }

  private createColliders() {
    const p = this.physics.add;

    p.collider(this.player, [this.solids, this.platforms]);
    p.collider(this.enemies, [this.solids, this.platforms]);
    p.collider(this.pickups, [this.solids, this.platforms]);
    p.collider(this.grenades, [this.solids, this.platforms]);
    p.collider(this.debris, [this.solids, this.platforms]);
    p.collider(this.loot, [this.solids, this.platforms]);

    p.overlap(this.playerBullets, this.solids, (b) => this.bulletHitsWall(as<ArcadeImage>(b)));
    p.overlap(this.enemyBullets, this.solids, (b) => {
      const bullet = as<ArcadeImage>(b);
      impactSpark(this, bullet.x, bullet.y);
      bullet.destroy();
    });

    p.overlap(this.playerBullets, this.enemies, (b, e) => this.bulletHitsEnemy(as<ArcadeImage>(b), as<Enemy>(e)));

    p.overlap(this.player, this.enemyBullets, (_pl, b) => {
      if (!this.player.isVulnerable(this.time.now)) return;
      const bullet = as<ArcadeImage>(b);
      this.hurtPlayer(1, bullet.x);
      bullet.destroy();
    });

    p.overlap(this.grenades, this.enemies, (g, e) => {
      if (!as<Enemy>(e).dying) this.explodeGrenade(as<ArcadeImage>(g));
    });

    p.overlap(this.playerBullets, this.bossHurt, (b, z) => {
      const bullet = as<ArcadeImage>(b);
      const boss = as<Phaser.GameObjects.Zone>(z).getData('boss') as Boss;
      if (!bullet.active || boss.dying) return;
      const zone = boss.zoneAt(bullet.x, bullet.y) ?? as<Phaser.GameObjects.Zone>(z);
      const crit = Math.random() < this.run.stats.critChance;
      if (boss.hit((bullet.getData('damage') as number) * (crit ? 3 : 1), bullet.x, bullet.y, zone)) {
        impactSpark(this, bullet.x, bullet.y, bullet.getData('impact'));
        if (crit) floatingText(this, bullet.x, bullet.y - 10, 'CRIT!', '#ffcf3a');
      }
      bullet.destroy();
    });
    p.overlap(this.grenades, this.bossHurt, (g) => this.explodeGrenade(as<ArcadeImage>(g)));

    p.overlap(this.player, this.pickups, (_pl, c) => this.collectPickup(as<ArcadeImage>(c)));
    p.overlap(this.player, this.loot, (_pl, l) => this.collectLoot(as<ArcadeImage>(l)));
  }

  // ---------- Câmera, spawns e segurança ----------

  /** Estilo Metal Slug: a câmera só anda para frente e o jogador não sai pela esquerda. */
  private updateCamera() {
    const cam = this.cameras.main;
    const target = this.player.x - GAME_WIDTH * CAMERA_LEAD;
    const limit = Math.min(this.level.width - GAME_WIDTH, this.cameraLock ?? Infinity);
    if (target > cam.scrollX) cam.scrollX = Math.min(target, limit);

    const minX = cam.scrollX + 10;
    const maxX = cam.scrollX + GAME_WIDTH - 10;
    if (this.player.x < minX) {
      this.player.x = minX;
      if (this.player.body.velocity.x < 0) this.player.setVelocityX(0);
    } else if (this.player.x > maxX) {
      this.player.x = maxX;
    }
  }

  private spawnEnemies() {
    const spawns = this.level.spawns;
    const edge = this.cameras.main.scrollX + GAME_WIDTH + 20;
    while (this.spawnIndex < spawns.length && spawns[this.spawnIndex].x < edge) {
      const s = spawns[this.spawnIndex++];
      this.spawnEnemy(s.type, s.x, s.y);
    }
  }

  /** Cria um robô; com `teleport`, ele chega por um feixe vermelho. */
  spawnEnemy(type: EnemyType, x: number, y?: number, teleport = false) {
    const enemy = new Enemy(this, x, y ?? GROUND_Y - 27, ENEMIES[type]);
    enemy.hp = Math.round(enemy.def.hp * (1 + this.run.mission * ENEMY_HP_PER_MISSION));
    this.enemies.add(enemy);
    enemy.setupBody();
    if (teleport) {
      const beam = this.add
        .image(x, 0, 'beam')
        .setOrigin(0.5, 0)
        .setTint(0xff3040)
        .setDepth(21)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.2, 1);
      this.tweens.add({ targets: beam, scaleX: 1.2, duration: 140, yoyo: true, hold: 200, onComplete: () => beam.destroy() });
      enemy.setAlpha(0);
      this.tweens.add({ targets: enemy, alpha: 1, duration: 300, delay: 120 });
      this.glitchBars(x, enemy.y, [0xff2a2a, 0xffffff]);
    }
    return enemy;
  }

  /** Lembra o último ponto de chão firme para voltar se cair num buraco. */
  private trackSafeGround() {
    const p = this.player;
    if (p.dead || !p.body.blocked.down || Math.abs(p.body.bottom - GROUND_Y) > 2) return;
    const seg = this.level.ground.find((g) => p.x >= g.x + 20 && p.x <= g.x + g.w - 20);
    if (seg) this.lastSafeX = p.x;
  }

  private fallIntoPit() {
    const run = this.run;
    run.hp = Math.max(0, run.hp - PIT_DAMAGE);
    this.cameras.main.shake(150, 0.006);
    this.glitchBurst(this.player.x, GAME_HEIGHT - 20);
    if (run.hp <= 0) {
      this.player.die();
      this.runOver();
      return;
    }
    const x = Math.max(this.lastSafeX, this.cameras.main.scrollX + 30);
    this.player.warpTo(this.safeGroundX(x), 60, this.time.now);
  }

  /** Garante um x em chão firme (não em um buraco). */
  private safeGroundX(x: number) {
    const seg = this.level.ground.find((g) => x >= g.x + 16 && x <= g.x + g.w - 16);
    if (seg) return x;
    const back = [...this.level.ground].reverse().find((g) => g.x + g.w - 20 < x);
    return back ? back.x + back.w - 30 : this.level.ground[0].x + 30;
  }

  // ---------- Projéteis do herói (skills: crítico, perfurar, dividir, ricochete) ----------

  spawnPlayerBullet(x: number, y: number, angle: number, weapon: WeaponDef, primary = true, child = false) {
    const s = this.run.stats;
    const b = this.playerBullets.create(x, y, weapon.bullet) as ArcadeImage;
    b.setRotation(angle).setDepth(8);
    b.setData({
      damage: weapon.damage,
      impact: weapon.impact,
      pierce: s.pierce,
      ricochet: s.ricochet ? 1 : 0,
      fork: s.fork && !child,
      hits: new Set<Enemy>(),
      weapon,
    });
    if (child) b.setScale(0.7);
    b.setVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed);
    if (primary && !child) muzzleFlash(this, x, y, angle, 'muzzle_code', weapon.bitsTint);
  }

  private bulletHitsEnemy(bullet: ArcadeImage, enemy: Enemy) {
    if (!bullet.active || enemy.dying) return;
    const hits = bullet.getData('hits') as Set<Enemy>;
    if (hits.has(enemy)) return;
    hits.add(enemy);
    const crit = Math.random() < this.run.stats.critChance;
    const dmg = (bullet.getData('damage') as number) * (crit ? 3 : 1);
    enemy.hit(dmg);
    impactSpark(this, bullet.x, bullet.y, bullet.getData('impact'));
    if (crit) floatingText(this, enemy.x, enemy.y - 34, 'CRIT!', '#ffcf3a');

    if (bullet.getData('fork')) {
      // Fork(): dois projéteis menores saem em diagonal
      const a = bullet.rotation;
      for (const d of [-0.6, 0.6]) {
        this.spawnPlayerBullet(bullet.x + Math.cos(a) * 6, bullet.y, a + d, bullet.getData('weapon'), false, true);
      }
      bullet.setData('fork', false);
    }
    const pierce = bullet.getData('pierce') as number;
    if (pierce > 0) bullet.setData('pierce', pierce - 1);
    else bullet.destroy();
  }

  private bulletHitsWall(bullet: ArcadeImage) {
    if (!bullet.active) return;
    const left = bullet.getData('ricochet') as number;
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (left > 0) {
      bullet.setData('ricochet', left - 1);
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      // bate no chão/teto: inverte y; bate na parede: inverte x
      if (Math.abs(vy) > Math.abs(vx)) body.velocity.y = -vy;
      else body.velocity.x = -vx;
      bullet.x -= Math.sign(vx) * 4;
      bullet.y -= Math.sign(vy) * 4;
      bullet.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      impactSpark(this, bullet.x, bullet.y, 'bolt_hit');
      return;
    }
    impactSpark(this, bullet.x, bullet.y, bullet.getData('impact') ?? 'spark');
    bullet.destroy();
  }

  // ---------- API usada pelas entidades ----------

  emitBits(x: number, y: number, tint: number) {
    this.bits.setParticleTint(tint);
    this.bits.emitParticleAt(x, y, 2);
  }

  /** Cópia translúcida do quadro atual, que some rapidamente (rastro holográfico). */
  afterimage(sprite: Phaser.GameObjects.Sprite) {
    const ghost = this.add
      .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setFlipX(sprite.flipX)
      .setTint(this.player.weapon.bitsTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.45)
      .setDepth(sprite.depth - 1);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  /** Falha digital: bits voando e barras de interferência. */
  glitchBurst(x: number, y: number) {
    const bits = this.add
      .particles(x, y, 'bits', {
        frame: [0, 1],
        speed: { min: 40, max: 160 },
        lifespan: { min: 400, max: 900 },
        alpha: { start: 1, end: 0 },
        tint: [0xff8cf5, 0x8ff0ff, 0xffffff],
        emitting: false,
      })
      .setDepth(21);
    bits.explode(26);
    this.time.delayedCall(1000, () => bits.destroy());
    this.glitchBars(x, y, [0x8ff0ff, 0xff5aff]);
  }

  glitchBars(x: number, y: number, colors: number[]) {
    for (let i = 0; i < 6; i++) {
      const bar = this.add
        .rectangle(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-22, 18), Phaser.Math.Between(10, 26), 2, colors[i % colors.length])
        .setDepth(21)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: bar, x: bar.x + Phaser.Math.Between(-10, 10), alpha: 0, duration: 260, delay: i * 40, onComplete: () => bar.destroy() });
    }
  }

  /** Feixe de teletransporte (volta do buraco). */
  teleportBeam(x: number) {
    const beam = this.add.image(x, 0, 'beam').setOrigin(0.5, 0).setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2, 1);
    this.tweens.add({ targets: beam, scaleX: 1, duration: 150, yoyo: true, hold: 250, onComplete: () => beam.destroy() });
  }

  /** Anel de energia do pulo duplo (Sudo Jump). */
  jumpRing(x: number, y: number) {
    const ring = this.add.sprite(x, y, 'hero_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(9);
    ring.play('hero_ring');
    this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, y: y + 6, duration: 300, onComplete: () => ring.destroy() });
  }

  /** O escudo Firewall absorveu um golpe. */
  shieldBreak(x: number, y: number) {
    const s = this.add.image(x, y, 'shield_bubble').setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, duration: 350, onComplete: () => s.destroy() });
    floatingText(this, x, y - 34, 'FIREWALL', '#8ff0ff');
    this.cameras.main.flash(80, 120, 220, 255);
  }

  /** Kernel Panic: EMP ao redor do herói quando ele é atingido. */
  panicBlast(x: number, y: number) {
    this.empAt(x, y + 10);
  }

  spawnEnemyBullet(x: number, y: number, angle: number, speed: number) {
    const b = this.enemyBullets.create(x, y, 'plasma') as ArcadeImage;
    b.setDepth(8).setRotation(angle).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.body!.setSize(8, 4);
    muzzleFlash(this, x, y, angle, 'muzzle_plasma');
  }

  /** Dano no herói (ataques, perigos, explosões). `fromX` define o lado do empurrão. */
  hurtPlayer(amount = 1, fromX?: number) {
    if (this.state !== 'playing') return;
    const hit = this.player.hurt(amount, this.time.now, fromX);
    if (hit && this.player.dead) this.runOver();
  }

  clawSlash(x: number, y: number, facing: number) {
    const s = this.add.image(x, y, 'claw_slash').setFlipX(facing < 0).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, alpha: 0, duration: 180, onComplete: () => s.destroy() });
  }

  /** Robô destruído: explosão, peças voando e fragmentos (às vezes cura). */
  robotDestroyed(e: Enemy) {
    explosion(this, e.x, e.y - 14, 0.6);
    this.cameras.main.shake(80, 0.004);
    e.def.debris.forEach((frame, i) => {
      const part = this.debris.create(e.x + Phaser.Math.Between(-4, 4), e.y - (i === 0 ? 22 : 8), 'bot_parts', frame) as ArcadeImage;
      part
        .setVelocity(-e.facing * Phaser.Math.Between(40, 120) + Phaser.Math.Between(-30, 30), Phaser.Math.Between(-280, -160))
        .setAngularVelocity(Phaser.Math.Between(-500, 500))
        .setDepth(9);
      this.tweens.add({ targets: part, alpha: 0, delay: 1400, duration: 400, onComplete: () => part.destroy() });
    });
    this.glitchBars(e.x, e.y - 10, [0xff2a2a, 0xff8080]);
    this.run.kills++;
    this.dropFragments(e.x, e.y - 10, Phaser.Math.Between(1, 3));
    if (Math.random() < this.run.stats.healDropChance) this.dropHeal(e.x, e.y - 10);
  }

  // ---------- Fragmentos e cura ----------

  dropFragments(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const f = this.loot.create(x, y, 'frag') as Phaser.Physics.Arcade.Sprite;
      f.play('frag').setDepth(DEPTH.pickup).setData('kind', 'frag');
      f.setVelocity(Phaser.Math.Between(-90, 90), Phaser.Math.Between(-240, -140));
      this.time.delayedCall(12000, () => f.active && f.destroy());
    }
  }

  dropHeal(x: number, y: number) {
    const h = this.loot.create(x, y, 'heal') as ArcadeImage;
    h.setDepth(DEPTH.pickup).setData('kind', 'heal').setVelocity(0, -200);
  }

  /** Ímã: fragmentos próximos voam até o herói. */
  private updateLoot() {
    const p = this.player;
    if (p.dead) return;
    const r = this.run.stats.magnet;
    for (const o of this.loot.getChildren()) {
      const l = o as ArcadeImage;
      if (l.getData('kind') !== 'frag') continue;
      const dx = p.x - l.x;
      const dy = p.y - l.y;
      const d = Math.hypot(dx, dy);
      if (d < r && d > 0) l.setVelocity((dx / d) * 260, (dy / d) * 260);
    }
  }

  private collectLoot(l: ArcadeImage) {
    if (!l.active || this.player.dead) return;
    if (l.getData('kind') === 'heal') {
      if (this.run.hp >= this.run.maxHp) return;
      this.run.heal(1);
      floatingText(this, l.x, l.y - 10, '+1 HP', '#7aff9a');
    } else {
      this.run.fragments += this.run.fragmentValue(1);
    }
    l.destroy();
  }

  // ---------- Terminais de upgrade ----------

  private updateTerminals() {
    const p = this.player;
    for (const t of this.terminals) {
      if (t.used) continue;
      const near = Math.abs(p.x - t.img.x) < 22 && Math.abs(p.body.bottom - GROUND_Y) < 6;
      t.prompt.setVisible(near);
      if (near && this.controls.justDown('up')) {
        t.used = true;
        t.prompt.destroy();
        t.img.setFrame(1);
        (t.img.getData('glow') as Phaser.GameObjects.Image).destroy();
        this.openSkillChoice();
      }
    }
  }

  /** Pausa o jogo e mostra 3 skills para escolher. */
  openSkillChoice(title?: string, onDone?: () => void) {
    const unlocked = new Set(loadSave().unlocked);
    const options: SkillDef[] = rollSkills(this.run.skills, unlocked, 3, Math.random);
    if (!options.length || this.state !== 'playing') {
      onDone?.();
      return;
    }
    this.state = 'choosing';
    this.physics.pause();
    this.player.anims.pause();
    new SkillChoice(
      this,
      options,
      this.run.skills,
      (skill) => {
        this.run.addSkill(skill.id);
        this.physics.resume();
        this.player.anims.resume();
        this.state = 'playing';
        floatingText(this, this.player.x, this.player.y - 40, skill.name, '#ffcf3a');
        onDone?.();
      },
      title,
    );
  }

  throwGrenade(x: number, y: number, facing: number, carryVx: number) {
    const g = this.grenades.create(x, y, 'usb') as ArcadeImage;
    g.setVelocity(facing * 170 + carryVx * 0.3, -230)
      .setBounce(0.4)
      .setDragX(80)
      .setAngularVelocity(facing * 600)
      .setDepth(8);
    this.time.delayedCall(GRENADE_FUSE, () => this.explodeGrenade(g));
  }

  private explodeGrenade(g: ArcadeImage) {
    if (!g.active) return;
    const { x, y } = g;
    g.destroy();
    this.empAt(x, y);
    // Pendrive Cluster: 3 mini-EMPs espalhados
    if (this.run.stats.cluster) {
      [-40, 0, 40].forEach((dx, i) => this.time.delayedCall(160 + i * 90, () => this.empAt(x + dx, y - 6, 0.6)));
    }
  }

  /** Pulso EMP: fere robôs e atinge objetos destrutíveis no raio. */
  empAt(x: number, y: number, size = 1) {
    empBlast(this, x, y);
    this.cameras.main.shake(140 * size, 0.01 * size);
    if (size >= 1) this.cameras.main.flash(80, 120, 220, 255);
    const radius = GRENADE_RADIUS * size;
    for (const o of [...this.enemies.getChildren()]) {
      const e = o as Enemy;
      if (!e.dying && Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius) e.hit(GRENADE_DAMAGE);
    }
    this.world.explosionAt(x, y, radius);
    if (this.boss && !this.boss.dying) {
      const zone = this.boss.zoneNear(x, y, radius);
      if (zone) this.boss.hit(GRENADE_DAMAGE, x, y, zone);
    }
  }

  /** Golpe do MacBook no chefe (se houver uma zona colada na frente). */
  bossMelee(x: number, y: number, facing: number, range: number, damage: number) {
    if (!this.boss || this.boss.dying) return false;
    const zone = this.boss.zoneNear(x + facing * range * 0.5, y - 4, range * 0.6);
    if (!zone) return false;
    this.boss.hit(damage, x + facing * 18, y - 4, zone);
    return true;
  }

  // ---------- Chefes ----------

  private updateBoss(time: number, delta: number) {
    const b = this.level.boss;
    if (b && !this.bossStarted && this.cameras.main.scrollX >= b.x - 2) this.startBoss();
    this.boss?.update(time, delta);
  }

  private startBoss() {
    const b = this.level.boss!;
    this.bossStarted = true;
    this.cameraLock = b.x;
    this.events.emit('boss-start', b.type);
    this.cameras.main.flash(250, 255, 40, 40);
    this.showBanner('PERIGO!', 'CHEFE SE APROXIMANDO', 1300, '#ff3a3a');
    const hp = Math.round(BOSS_HP[b.type] * (1 + Object.keys(this.run.skills).length * 0.1));
    this.time.delayedCall(1500, () => {
      if (this.state === 'gameover') return;
      const Cls = { sentinel: Sentinel, forger: Forger, eye: Eye }[b.type];
      this.boss = new Cls(this, b.x, hp);
      this.hud.showBoss(this.boss.name);
    });
  }

  /** Chefe destruído: libera a câmera, solta fragmentos e abre um terminal de upgrade. */
  bossDefeated(boss: Boss, x: number, y: number) {
    this.hud.hideBoss();
    this.boss = null;
    this.cameraLock = null;
    this.run.score += 10000;
    this.dropFragments(x, y, 25);
    if (upgradeLevel(loadSave(), 'repair')) {
      this.run.heal(2);
      floatingText(this, this.player.x, this.player.y - 40, 'AUTO-REPARO +2', '#7aff9a');
    }
    this.showBanner(`${boss.name}`, 'DESTRUIDO!', 2200, '#7aff9a');
    this.addTerminal(this.level.boss!.x + 240);
  }

  enemyInMeleeRange(x: number, y: number, facing: number, range = 30): Enemy | undefined {
    return (this.enemies.getChildren() as Enemy[]).find((e) => {
      const dx = e.x - x;
      return !e.dying && dx * facing >= -6 && Math.abs(dx) < range && Math.abs(e.y - y) < 24;
    });
  }

  meleeSlash(x: number, y: number, facing: number) {
    slash(this, x, y, facing, 0x8ff0ff);
  }

  dust(x: number, y: number, scale = 1) {
    dustPuff(this, x, y, scale);
  }

  addScore(points: number, x: number, y: number) {
    this.run.score += points;
    floatingText(this, x, y, String(points), '#ffe066');
  }

  private collectPickup(crate: ArcadeImage) {
    if (!crate.active || this.player.dead) return;
    if (crate.getData('kind') === 'heavy') {
      this.player.setWeapon('overclock');
      floatingText(this, crate.x, crate.y - 16, 'OVERCLOCK!', '#ff8cf5');
    } else {
      this.run.bombs += 5;
      floatingText(this, crate.x, crate.y - 16, 'PENDRIVES +5', '#9fd0ff');
    }
    this.addScore(500, crate.x, crate.y);
    crate.destroy();
  }

  private cleanupProjectiles() {
    const v = this.cameras.main.worldView;
    for (const group of [this.playerBullets, this.enemyBullets, this.debris]) {
      for (const o of [...group.getChildren()]) {
        const b = o as ArcadeImage;
        if (b.x < v.x - 40 || b.x > v.right + 40 || b.y < v.y - 40 || b.y > v.bottom + 40) b.destroy();
      }
    }
  }

  // ---------- Fim de missão / fim de run ----------

  private missionClear() {
    this.state = 'clear';
    this.physics.pause();
    this.player.anims.play('hero-idle');
    this.run.score += 5000;
    const last = this.run.mission >= MISSION_COUNT - 1;
    if (last) {
      this.run.bank(true);
      this.showSummary('O MUNDO FOI SALVO!', '#7aff9a');
    } else {
      this.showBanner('MISSÃO CUMPRIDA!', 'ENTER: PROXIMA MISSÃO');
    }
  }

  /** O herói caiu: a run termina e os fragmentos vão para o Laboratório. */
  private runOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.time.delayedCall(1200, () => {
      this.physics.pause();
      this.run.bank(false);
      this.showSummary('RUN ENCERRADA', '#ff5a5a');
    });
  }

  private showSummary(title: string, color: string) {
    const run = this.run;
    const s = Math.floor(run.timeMs / 1000);
    const lines = [
      `MISSÃO ALCANÇADA  ${run.mission + 1}/${MISSION_COUNT}`,
      `ROBOS DESTRUIDOS  ${run.kills}`,
      `SKILLS            ${Object.keys(run.skills).length}`,
      `TEMPO             ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
      `PONTOS            ${run.score}`,
      '',
      `FRAGMENTOS  +${run.fragments}`,
    ];
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.7).setOrigin(0).setScrollFactor(0).setDepth(199);
    this.add
      .text(GAME_WIDTH / 2, 50, title, { fontFamily: FONT, fontSize: '18px', color })
      .setOrigin(0.5)
      .setStroke('#000000', 5)
      .setScrollFactor(0)
      .setDepth(200);
    this.add
      .text(GAME_WIDTH / 2, 138, lines.join('\n'), { fontFamily: FONT, fontSize: '8px', color: '#e8e0ff', lineSpacing: 5 })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(200);
    const press = this.add
      .text(GAME_WIDTH / 2, 226, 'ENTER: LABORATORIO', { fontFamily: FONT, fontSize: '8px', color: '#ffcf3a' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(200);
    this.tweens.add({ targets: press, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
  }

  /** ENTER depois do fim: próxima missão da run ou Laboratório. */
  private advance() {
    const last = this.run.mission >= MISSION_COUNT - 1;
    if (this.state === 'clear' && !last) {
      this.run.mission++;
      this.scene.restart({ run: this.run } satisfies GameInit);
    } else {
      this.scene.start('Lab');
    }
  }

  showBanner(title: string, subtitle: string, hideAfter?: number, color = '#ffcf3a') {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;
    const t1 = this.add
      .text(cx, cy, title, { fontFamily: FONT, fontSize: '18px', color })
      .setOrigin(0.5)
      .setStroke('#6b1a10', 5)
      .setShadow(2, 2, '#000000', 0, true, true)
      .setScrollFactor(0)
      .setDepth(200);
    const t2 = this.add
      .text(cx, cy + 24, subtitle, { fontFamily: FONT, fontSize: '8px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(200);
    if (hideAfter) {
      this.tweens.add({
        targets: [t1, t2],
        alpha: 0,
        delay: hideAfter,
        duration: 400,
        onComplete: () => {
          t1.destroy();
          t2.destroy();
        },
      });
    }
  }
}
