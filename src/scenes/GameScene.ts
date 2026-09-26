import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { Controls } from '../input/Controls';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ENEMIES } from '../entities/enemyTypes';
import type { WeaponDef } from '../entities/weapons';
import { LEVEL_1, LevelData } from '../level/level1';
import { dustPuff, empBlast, explosion, floatingText, impactSpark, muzzleFlash, slash } from '../gfx/effects';
import { layerWidth, PARALLAX } from '../gfx/art/scenery';
import { blockTexture, GROUND_H, ledgeTexture, pillarTexture } from '../gfx/art/props';
import { Hud } from '../ui/Hud';

type ArcadeImage = Phaser.Physics.Arcade.Image;
type GameState = 'playing' | 'gameover' | 'clear';

const START_LIVES = 3;
const START_TIME = 60;
/** Duração de 1 "segundo" do cronômetro (em ms), como nos arcades. */
const TIMER_TICK = 1500;
const GRENADE_FUSE = 1100;
const GRENADE_RADIUS = 52;
const GRENADE_DAMAGE = 4;
const CAMERA_LEAD = 0.4;
const FOREGROUND_PARALLAX = 1.25;

/** Camadas de profundidade (quanto maior, mais na frente). */
const DEPTH = {
  sky: -10, far: -9, rays: -8, mid: -7, near: -6, pit: -5, decor: -4, pillar: -3, ground: -2, lip: -1,
  pickup: 8, bits: 11, ambient: 30, foreground: 40,
};

/** Converte os argumentos genéricos dos callbacks de colisão do Phaser. */
const as = <T>(o: unknown) => o as T;

export class GameScene extends Phaser.Scene {
  controls!: Controls;
  player!: Player;
  state: GameState = 'playing';
  score = 0;
  lives = START_LIVES;
  timeLeft = START_TIME;

  private level: LevelData = LEVEL_1;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private grenades!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private debris!: Phaser.Physics.Arcade.Group;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private spawnIndex = 0;
  private hud!: Hud;
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Game');
  }

  create() {
    // A instância da cena é reaproveitada no restart: resetar estado aqui.
    this.state = 'playing';
    this.score = 0;
    this.lives = START_LIVES;
    this.timeLeft = START_TIME;
    this.spawnIndex = 0;
    this.physics.resume();

    this.controls = new Controls(this);
    this.enterKey = this.input.keyboard!.addKey('ENTER');

    this.createBackground();
    this.createGroups();
    this.buildLevel();
    this.createAmbient();

    this.player = new Player(this, 60, GROUND_Y - 24, this.controls);
    this.createColliders();

    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.hud = new Hud(this, this.level.name);
    this.showBanner(this.level.name, 'COMEÇAR!', 2000);

    this.time.addEvent({
      delay: TIMER_TICK,
      loop: true,
      callback: () => {
        if (this.state !== 'playing' || this.player.dead || this.timeLeft <= 0) return;
        if (--this.timeLeft <= 0) this.killPlayer();
      },
    });
  }

  update(time: number) {
    if (this.state === 'playing') {
      this.player.update(time);
      this.updateCamera();
      this.spawnEnemies();

      if (!this.player.dead && this.player.y > GAME_HEIGHT + 40) this.killPlayer();
      if (!this.player.dead && this.player.x >= this.level.goalX) this.missionClear();
    } else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.restart();
      return;
    }

    this.cleanupProjectiles();
    this.hud.update();
  }

  // ---------- Montagem ----------

  private createBackground() {
    this.add.image(0, 0, 'bg_sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);
    this.add.image(0, 0, 'bg_far').setOrigin(0).setScrollFactor(PARALLAX.far).setDepth(DEPTH.far);

    // Raios de luz atravessando a copa
    const raysW = layerWidth(this.level.width, PARALLAX.rays);
    for (let x = 120; x < raysW; x += Phaser.Math.Between(260, 420)) {
      const ray = this.add
        .image(x, 0, 'fx_ray')
        .setOrigin(0)
        .setScrollFactor(PARALLAX.rays)
        .setDepth(DEPTH.rays)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.14);
      this.tweens.add({
        targets: ray,
        alpha: 0.26,
        duration: Phaser.Math.Between(1800, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.image(0, 0, 'bg_mid').setOrigin(0).setScrollFactor(PARALLAX.mid).setDepth(DEPTH.mid);
    this.add.image(0, 0, 'bg_near').setOrigin(0).setScrollFactor(PARALLAX.near).setDepth(DEPTH.near);
  }

  private createGroups() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.playerBullets = this.physics.add.group({ allowGravity: false });
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.grenades = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.debris = this.physics.add.group({ bounceY: 0.35, dragX: 70 });
  }

  private buildLevel() {
    const L = this.level;

    // Fundo dos buracos
    this.add.tileSprite(0, GROUND_Y + 2, L.width, GROUND_H, 'pit_fill').setOrigin(0).setDepth(DEPTH.pit);

    for (const g of L.ground) {
      const ground = this.add.tileSprite(g.x, GROUND_Y, g.w, GROUND_H, 'ground_fill').setOrigin(0).setDepth(DEPTH.ground);
      this.physics.add.existing(ground, true);
      this.solids.add(ground);
      this.add.tileSprite(g.x, GROUND_Y - 8, g.w, 10, 'ground_lip').setOrigin(0).setDepth(DEPTH.lip);
      // Bordas de barranco onde há buraco
      if (g.x > 0) this.add.image(g.x, GROUND_Y - 6, 'ground_edge').setOrigin(0).setFlipX(true).setDepth(DEPTH.lip);
      if (g.x + g.w < L.width) this.add.image(g.x + g.w - 14, GROUND_Y - 6, 'ground_edge').setOrigin(0).setDepth(DEPTH.lip);
    }

    for (const d of L.decor) {
      this.add.image(d.x, GROUND_Y + 3, `decor_${d.kind}`).setOrigin(0.5, 1).setDepth(DEPTH.decor);
    }

    for (const b of L.blocks) {
      const block = this.solids.create(b.x + b.w / 2, GROUND_Y - b.h / 2, blockTexture(this, b.kind, b.w, b.h));
      block.setDepth(DEPTH.ground);
    }

    for (const p of L.platforms) {
      const pillarH = GROUND_Y - p.y - 8;
      for (const px of [p.x + 4, p.x + p.w - 22]) {
        this.add.image(px, p.y + 10, pillarTexture(this, pillarH)).setOrigin(0).setDepth(DEPTH.pillar);
      }
      const plat = this.platforms.create(p.x + p.w / 2, p.y + 7, ledgeTexture(this, p.w)) as Phaser.Physics.Arcade.Sprite;
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

    this.add.rectangle(L.goalX, GROUND_Y - 70, 3, 70, 0x333333).setOrigin(0).setDepth(DEPTH.decor);
    this.add.image(L.goalX + 2, GROUND_Y - 70, 'flag').setOrigin(0).setDepth(DEPTH.decor);

    for (const f of L.foreground) {
      const img =
        f.kind === 'fern'
          ? this.add.image(f.x, GAME_HEIGHT + 8, 'fg_fern').setOrigin(0.5, 1)
          : this.add.image(f.x, -4, 'fg_vines').setOrigin(0.5, 0);
      img.setScrollFactor(FOREGROUND_PARALLAX).setDepth(DEPTH.foreground);
    }
  }

  private createAmbient() {
    // Folhas caindo
    this.add
      .particles(0, 0, 'leaf', {
        x: { min: 0, max: GAME_WIDTH + 60 },
        y: -8,
        lifespan: 9000,
        speedY: { min: 16, max: 34 },
        speedX: { min: -26, max: 4 },
        rotate: { start: 0, end: 540 },
        frequency: 650,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient);

    // Poeira brilhando na luz
    this.add
      .particles(0, 0, 'mote', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 30, max: 200 },
        lifespan: 4000,
        speedX: { min: -6, max: 6 },
        speedY: { min: -6, max: 3 },
        alpha: { start: 0.6, end: 0 },
        frequency: 380,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient);

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
      .setDepth(DEPTH.bits);
  }

  private createColliders() {
    const p = this.physics.add;

    p.collider(this.player, [this.solids, this.platforms]);
    p.collider(this.enemies, [this.solids, this.platforms]);
    p.collider(this.pickups, [this.solids, this.platforms]);
    p.collider(this.grenades, [this.solids, this.platforms]);
    p.collider(this.debris, [this.solids, this.platforms]);

    const hitWall = (b: unknown) => {
      const bullet = as<ArcadeImage>(b);
      impactSpark(this, bullet.x, bullet.y, bullet.getData('impact') ?? 'spark');
      bullet.destroy();
    };
    p.overlap(this.playerBullets, this.solids, hitWall);
    p.overlap(this.enemyBullets, this.solids, hitWall);

    p.overlap(this.playerBullets, this.enemies, (b, e) => {
      const enemy = as<Enemy>(e);
      if (enemy.dying) return;
      const bullet = as<ArcadeImage>(b);
      enemy.hit(bullet.getData('damage'));
      impactSpark(this, bullet.x, bullet.y, bullet.getData('impact'));
      bullet.destroy();
    });

    p.overlap(this.player, this.enemyBullets, (_pl, b) => {
      if (!this.player.isVulnerable(this.time.now)) return;
      as<ArcadeImage>(b).destroy();
      this.killPlayer();
    });

    p.overlap(this.grenades, this.enemies, (g, e) => {
      if (!as<Enemy>(e).dying) this.explodeGrenade(as<ArcadeImage>(g));
    });

    p.overlap(this.player, this.pickups, (_pl, c) => this.collectPickup(as<ArcadeImage>(c)));
  }

  // ---------- Câmera e spawns ----------

  /** Estilo Metal Slug: a câmera só anda para frente e o jogador não sai pela esquerda. */
  private updateCamera() {
    const cam = this.cameras.main;
    const target = this.player.x - GAME_WIDTH * CAMERA_LEAD;
    if (target > cam.scrollX) cam.scrollX = Math.min(target, this.level.width - GAME_WIDTH);

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
      const enemy = new Enemy(this, s.x, s.y ?? GROUND_Y - 27, ENEMIES[s.type]);
      this.enemies.add(enemy);
      enemy.setupBody();
    }
  }

  // ---------- API usada pelas entidades ----------

  spawnPlayerBullet(x: number, y: number, angle: number, weapon: WeaponDef) {
    const b = this.playerBullets.create(x, y, weapon.bullet) as ArcadeImage;
    b.setRotation(angle).setData('damage', weapon.damage).setData('impact', weapon.impact).setDepth(8);
    b.setVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed);
    muzzleFlash(this, x, y, angle, 'muzzle_code', weapon.bitsTint);
  }

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

  /** Falha digital quando o herói é atingido: bits voando e barras de interferência. */
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

  private glitchBars(x: number, y: number, colors: number[]) {
    for (let i = 0; i < 6; i++) {
      const bar = this.add
        .rectangle(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-22, 18), Phaser.Math.Between(10, 26), 2, colors[i % colors.length])
        .setDepth(21)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: bar, x: bar.x + Phaser.Math.Between(-10, 10), alpha: 0, duration: 260, delay: i * 40, onComplete: () => bar.destroy() });
    }
  }

  /** Feixe de teletransporte no respawn. */
  teleportBeam(x: number) {
    const beam = this.add.image(x, 0, 'beam').setOrigin(0.5, 0).setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2, 1);
    this.tweens.add({ targets: beam, scaleX: 1, duration: 150, yoyo: true, hold: 250, onComplete: () => beam.destroy() });
  }

  spawnEnemyBullet(x: number, y: number, angle: number, speed: number) {
    const b = this.enemyBullets.create(x, y, 'plasma') as ArcadeImage;
    b.setDepth(8).setRotation(angle).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.body!.setSize(8, 4);
    muzzleFlash(this, x, y, angle, 'muzzle_plasma');
  }

  /** Dano vindo de ataques corpo a corpo dos inimigos. */
  hurtPlayer() {
    if (this.state === 'playing' && this.player.isVulnerable(this.time.now)) this.killPlayer();
  }

  clawSlash(x: number, y: number, facing: number) {
    const s = this.add.image(x, y, 'claw_slash').setFlipX(facing < 0).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, alpha: 0, duration: 180, onComplete: () => s.destroy() });
  }

  /** Robô destruído: explosão pequena e peças (crânio, ossos, rifle) voando e quicando. */
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
    empBlast(this, x, y);
    this.cameras.main.shake(140, 0.01);
    this.cameras.main.flash(80, 120, 220, 255);
    for (const o of [...this.enemies.getChildren()]) {
      const e = o as Enemy;
      if (!e.dying && Phaser.Math.Distance.Between(x, y, e.x, e.y) < GRENADE_RADIUS) e.hit(GRENADE_DAMAGE);
    }
  }

  enemyInMeleeRange(x: number, y: number, facing: number): Enemy | undefined {
    return (this.enemies.getChildren() as Enemy[]).find((e) => {
      const dx = e.x - x;
      return !e.dying && dx * facing >= -6 && Math.abs(dx) < 30 && Math.abs(e.y - y) < 24;
    });
  }

  meleeSlash(x: number, y: number, facing: number) {
    slash(this, x, y, facing, 0x8ff0ff);
  }

  dust(x: number, y: number, scale = 1) {
    dustPuff(this, x, y, scale);
  }

  addScore(points: number, x: number, y: number) {
    this.score += points;
    floatingText(this, x, y, String(points), '#ffe066');
  }

  private collectPickup(crate: ArcadeImage) {
    if (!crate.active || this.player.dead) return;
    if (crate.getData('kind') === 'heavy') {
      this.player.setWeapon('overclock');
      floatingText(this, crate.x, crate.y - 16, 'OVERCLOCK!', '#ff8cf5');
    } else {
      this.player.bombs += 10;
      floatingText(this, crate.x, crate.y - 16, 'BOMBAS +10', '#9fd0ff');
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

  // ---------- Vida, morte e fim de fase ----------

  private killPlayer() {
    if (this.player.dead) return;
    this.player.die();
    this.cameras.main.shake(150, 0.006);
    this.time.delayedCall(1300, () => {
      if (this.state !== 'playing') return;
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
        return;
      }
      this.timeLeft = START_TIME;
      this.player.respawn(this.safeGroundX(this.cameras.main.scrollX + 70), 40, this.time.now);
    });
  }

  /** Garante que o respawn caia em chão firme (não em um buraco). */
  private safeGroundX(x: number) {
    const seg = this.level.ground.find((g) => x >= g.x + 16 && x <= g.x + g.w - 16);
    if (seg) return x;
    const next = this.level.ground.find((g) => g.x > x);
    return next ? next.x + 24 : x;
  }

  private gameOver() {
    this.state = 'gameover';
    this.physics.pause();
    this.showBanner('GAME OVER', 'ENTER PARA RECOMEÇAR');
  }

  private missionClear() {
    this.state = 'clear';
    this.physics.pause();
    this.player.anims.play('player-idle');
    this.score += 5000;
    this.showBanner('MISSÃO CUMPRIDA!', 'ENTER PARA JOGAR DE NOVO');
  }

  private showBanner(title: string, subtitle: string, hideAfter?: number) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;
    const t1 = this.add
      .text(cx, cy, title, { fontFamily: FONT, fontSize: '18px', color: '#ffcf3a' })
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
