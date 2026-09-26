import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { Controls } from '../input/Controls';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ENEMIES } from '../entities/enemyTypes';
import type { WeaponDef } from '../entities/weapons';
import { LEVEL_1, LevelData } from '../level/level1';
import { explosion, floatingText, muzzleFlash, slash } from '../gfx/effects';

type ArcadeImage = Phaser.Physics.Arcade.Image;
type GameState = 'playing' | 'gameover' | 'clear';

const START_LIVES = 3;
const GRENADE_FUSE = 1100;
const GRENADE_RADIUS = 52;
const GRENADE_DAMAGE = 4;
const CAMERA_LEAD = 0.4;

/** Converte os argumentos genéricos dos callbacks de colisão do Phaser. */
const as = <T>(o: unknown) => o as T;

export class GameScene extends Phaser.Scene {
  controls!: Controls;
  player!: Player;
  state: GameState = 'playing';
  score = 0;
  lives = START_LIVES;

  private level: LevelData = LEVEL_1;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private grenades!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private spawnIndex = 0;

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private hudScore!: Phaser.GameObjects.Text;
  private hudArms!: Phaser.GameObjects.Text;
  private hudLives!: Phaser.GameObjects.Text;
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Game');
  }

  create() {
    // A instância da cena é reaproveitada no restart: resetar estado aqui.
    this.state = 'playing';
    this.score = 0;
    this.lives = START_LIVES;
    this.spawnIndex = 0;
    this.physics.resume();

    this.controls = new Controls(this);
    this.enterKey = this.input.keyboard!.addKey('ENTER');

    this.createBackground();
    this.createGroups();
    this.buildLevel();

    this.player = new Player(this, 60, GROUND_Y - 18, this.controls);
    this.createColliders();

    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.createHud();
    this.showBanner(this.level.name, 'COMEÇAR!', 2000);
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
    const scroll = this.cameras.main.scrollX;
    this.bgFar.tilePositionX = scroll * 0.15;
    this.bgNear.tilePositionX = scroll * 0.4;
    this.updateHud();
  }

  // ---------- Montagem ----------

  private createBackground() {
    this.add.image(0, 0, 'bg_sky').setOrigin(0).setScrollFactor(0);
    this.bgFar = this.add.tileSprite(0, 100, GAME_WIDTH, 120, 'bg_mountains').setOrigin(0).setScrollFactor(0);
    this.bgNear = this.add.tileSprite(0, 140, GAME_WIDTH, 110, 'bg_ruins').setOrigin(0).setScrollFactor(0);
  }

  private createGroups() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.playerBullets = this.physics.add.group({ allowGravity: false });
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.grenades = this.physics.add.group();
    this.pickups = this.physics.add.group();
  }

  private addStatic(group: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number, tex: string) {
    const ts = this.add.tileSprite(x, y, w, h, tex).setOrigin(0);
    this.physics.add.existing(ts, true);
    group.add(ts);
    return ts;
  }

  private buildLevel() {
    const L = this.level;

    // Fundo escuro nos buracos entre trechos de chão
    this.add.rectangle(0, GROUND_Y + 4, L.width, GAME_HEIGHT - GROUND_Y, 0x2a1c12).setOrigin(0);
    for (const g of L.ground) this.addStatic(this.solids, g.x, GROUND_Y, g.w, GAME_HEIGHT - GROUND_Y, 'tile_ground');
    for (const b of L.blocks) this.addStatic(this.solids, b.x, GROUND_Y - b.h, b.w, b.h, 'tile_block');

    for (const p of L.platforms) {
      // Pilares decorativos
      for (const px of [p.x + 6, p.x + p.w - 10]) {
        this.add.rectangle(px, p.y + 8, 4, GROUND_Y - p.y - 8, 0x3d4148).setOrigin(0);
      }
      const plat = this.addStatic(this.platforms, p.x, p.y, p.w, 8, 'tile_platform');
      // Mão única: só colide por cima.
      const body = plat.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    for (const pk of L.pickups) {
      const crate = this.pickups.create(pk.x, pk.y ?? GROUND_Y - 30, pk.kind === 'heavy' ? 'crate_heavy' : 'crate_bomb');
      crate.setData('kind', pk.kind);
    }

    this.add.rectangle(L.goalX, GROUND_Y - 70, 3, 70, 0x333333).setOrigin(0);
    this.add.image(L.goalX + 2, GROUND_Y - 70, 'flag').setOrigin(0);
  }

  private createColliders() {
    const p = this.physics.add;

    p.collider(this.player, [this.solids, this.platforms]);
    p.collider(this.enemies, [this.solids, this.platforms]);
    p.collider(this.pickups, [this.solids, this.platforms]);
    p.collider(this.grenades, [this.solids, this.platforms]);

    p.overlap(this.playerBullets, this.solids, (b) => as<ArcadeImage>(b).destroy());
    p.overlap(this.enemyBullets, this.solids, (b) => as<ArcadeImage>(b).destroy());

    p.overlap(this.playerBullets, this.enemies, (b, e) => {
      const enemy = as<Enemy>(e);
      if (enemy.dying) return;
      enemy.hit(as<ArcadeImage>(b).getData('damage'));
      as<ArcadeImage>(b).destroy();
    });

    p.overlap(this.player, this.enemyBullets, (_pl, b) => {
      if (!this.player.isVulnerable(this.time.now)) return;
      as<ArcadeImage>(b).destroy();
      this.killPlayer();
    });

    p.overlap(this.player, this.enemies, (_pl, e) => {
      const enemy = as<Enemy>(e);
      if (!enemy.dying && enemy.def.contactDamage && this.player.isVulnerable(this.time.now)) this.killPlayer();
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
      const enemy = new Enemy(this, s.x, s.y ?? GROUND_Y - 18, ENEMIES[s.type]);
      this.enemies.add(enemy);
      enemy.setupBody();
    }
  }

  // ---------- API usada pelas entidades ----------

  spawnPlayerBullet(x: number, y: number, angle: number, weapon: WeaponDef) {
    const b = this.playerBullets.create(x, y, weapon.bullet) as ArcadeImage;
    b.setRotation(angle).setData('damage', weapon.damage).setDepth(8);
    b.setVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed);
    muzzleFlash(this, x, y);
  }

  spawnEnemyBullet(x: number, y: number, angle: number, speed: number) {
    const b = this.enemyBullets.create(x, y, 'bullet_enemy') as ArcadeImage;
    b.setDepth(8).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    muzzleFlash(this, x, y);
  }

  throwGrenade(x: number, y: number, facing: number, carryVx: number) {
    const g = this.grenades.create(x, y, 'grenade') as ArcadeImage;
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
    explosion(this, x, y - 6, 1);
    this.cameras.main.shake(120, 0.008);
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
    slash(this, x, y, facing);
  }

  addScore(points: number, x: number, y: number) {
    this.score += points;
    floatingText(this, x, y, String(points), '#ffe066');
  }

  private collectPickup(crate: ArcadeImage) {
    if (!crate.active || this.player.dead) return;
    if (crate.getData('kind') === 'heavy') {
      this.player.setWeapon('heavy');
      floatingText(this, crate.x, crate.y - 16, 'HEAVY MACHINE GUN!', '#ff6a3a');
    } else {
      this.player.bombs += 10;
      floatingText(this, crate.x, crate.y - 16, 'BOMBAS +10', '#9fd0ff');
    }
    this.addScore(500, crate.x, crate.y);
    crate.destroy();
  }

  private cleanupProjectiles() {
    const v = this.cameras.main.worldView;
    for (const group of [this.playerBullets, this.enemyBullets]) {
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

  // ---------- HUD ----------

  private createHud() {
    const style = { fontFamily: FONT, fontSize: '8px', color: '#ffffff' };
    const mk = (x: number, y: number) =>
      this.add.text(x, y, '', style).setScrollFactor(0).setDepth(100).setStroke('#000000', 3);
    this.hudScore = mk(8, 8);
    this.hudArms = mk(8, 20);
    this.hudLives = mk(GAME_WIDTH - 8, 8).setOrigin(1, 0);
  }

  private updateHud() {
    const p = this.player;
    this.hudScore.setText(`1UP ${String(this.score).padStart(7, '0')}`);
    this.hudArms.setText(`ARMS ${p.ammo === Infinity ? 'INF' : p.ammo}  BOMB ${p.bombs}`);
    this.hudLives.setText(`VIDAS x${this.lives}`);
  }

  private showBanner(title: string, subtitle: string, hideAfter?: number) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;
    const t1 = this.add
      .text(cx, cy, title, { fontFamily: FONT, fontSize: '18px', color: '#ffcf3a' })
      .setOrigin(0.5)
      .setStroke('#6b1a10', 5)
      .setScrollFactor(0)
      .setDepth(200);
    const t2 = this.add
      .text(cx, cy + 24, subtitle, { fontFamily: FONT, fontSize: '8px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(200);
    if (hideAfter) {
      this.tweens.add({ targets: [t1, t2], alpha: 0, delay: hideAfter, duration: 400, onComplete: () => {
        t1.destroy();
        t2.destroy();
      } });
    }
  }
}
