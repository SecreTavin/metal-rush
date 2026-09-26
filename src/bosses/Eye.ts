import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y } from '../config';
import type { GameScene } from '../scenes/GameScene';
import { Boss, HurtZone } from './Boss';

type Img = Phaser.GameObjects.Image;

/** MISSÃO 3 — O Olho: a própria IA desce do Núcleo para lutar. */
export class Eye extends Boss {
  private x: number;
  private y = -80;
  private t = 0;
  private moving = false;
  private busy = true;
  private nextAttack = 0;
  private lidsClosed = 1; // 0 aberto, 1 fechado
  private ringA: Img;
  private ringB: Img;
  private ball: Img;
  private iris: Img;
  private glow: Img;
  private lidTop: Img;
  private lidBot: Img;
  private cables: Phaser.GameObjects.Graphics;
  private beam: Phaser.GameObjects.TileSprite;
  private beamState: { active: boolean; lethal: boolean; gx: number } = { active: false, lethal: false, gx: 0 };
  private irisZone: HurtZone;
  private diving = false;
  private speedMul = 1;

  constructor(gs: GameScene, arenaX: number, hp: number) {
    super(gs, 'O OLHO', hp, arenaX);
    this.x = arenaX + GAME_WIDTH / 2;
    const d = 6;
    this.cables = gs.add.graphics().setDepth(d - 0.2);
    this.ringB = gs.add.image(this.x, this.y, 'core_ring_b').setScale(1.2, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(d - 0.1);
    this.ringA = gs.add.image(this.x, this.y, 'core_ring_a').setScale(1.1, 0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(d - 0.1);
    this.glow = gs.add.image(this.x, this.y, 'eye_glow').setScale(9).setTint(0xff2a5a).setBlendMode(Phaser.BlendModes.ADD).setDepth(d - 0.15);
    this.ball = gs.add.image(this.x, this.y, 'eyeboss_ball').setDepth(d);
    this.iris = gs.add.image(this.x, this.y, 'eyeboss_iris').setDepth(d + 0.1);
    this.lidTop = gs.add.image(this.x, this.y - 23, 'eyeboss_lid').setOrigin(0.5, 0).setDepth(d + 0.2);
    this.lidBot = gs.add.image(this.x, this.y + 23, 'eyeboss_lid').setOrigin(0.5, 1).setFlipY(true).setDepth(d + 0.2);
    this.beam = gs.add.tileSprite(0, 0, 10, 8, 'boss_beam').setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.3).setVisible(false);
    // só a íris recebe dano (a carcaça não bloqueia os tiros a caminho dela)
    this.irisZone = this.addZone(50, 44, false);
    gs.tweens.add({ targets: this.ringA, angle: 360, duration: 6000, repeat: -1 });
    gs.tweens.add({ targets: this.ringB, angle: -360, duration: 9000, repeat: -1 });

    // entrada: desce do alto e abre o olho
    gs.tweens.add({
      targets: this,
      y: 96,
      duration: 1600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setLids(0, () => {
          this.busy = false;
          this.moving = true;
          this.nextAttack = gs.time.now + 1200;
        });
      },
    });
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    if (this.moving && !this.dying) {
      this.t += dt * 0.7 * this.speedMul;
      const cx = this.arenaX + GAME_WIDTH / 2;
      this.x = Phaser.Math.Linear(this.x, cx + Math.sin(this.t) * 150, 0.08);
      this.y = Phaser.Math.Linear(this.y, 92 + Math.sin(this.t * 2) * 26, 0.08);
    }
    this.layout(time);
    this.updateBeam(time);
    if (this.dying) return;
    if (!this.busy && time > this.nextAttack) this.attack();
    // contato com a carcaça (principalmente no mergulho)
    if (this.playerTouches(new Phaser.Geom.Rectangle(this.x - 36, this.y - 24, 72, 48))) this.gs.hurtPlayer(1, this.x);
  }

  // ------------------------------------------------------------ ataques

  private attack() {
    this.busy = true;
    const done = (pause: number) => {
      this.busy = false;
      this.moving = true;
      this.nextAttack = this.gs.time.now + pause * (this.phase2 ? 0.55 : 1);
    };
    const r = Math.random();
    if (r < 0.32) this.laser(() => done(900));
    else if (r < 0.6) this.rings(() => done(1000));
    else if (r < 0.82) this.dive(() => done(900));
    else this.summon(() => done(1200));
  }

  /** Laser: mira (linha fina), depois varre o chão de um lado ao outro. */
  private laser(done: () => void) {
    const gs = this.gs;
    this.moving = false;
    const left = this.arenaX + 20;
    const right = this.arenaX + GAME_WIDTH - 20;
    const fromLeft = gs.player.x > this.x;
    const start = fromLeft ? left : right;
    const end = fromLeft ? right : left;
    this.beamState = { active: true, lethal: false, gx: start };
    this.iris.setTint(0xffffff);
    gs.time.delayedCall(this.phase2 ? 450 : 700, () => {
      if (this.dying) return done();
      this.beamState.lethal = true;
      gs.cameras.main.shake(this.phase2 ? 1100 : 1400, 0.004);
      gs.tweens.add({
        targets: this.beamState,
        gx: end,
        duration: this.phase2 ? 1100 : 1400,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.iris.clearTint();
          if (!this.phase2 || this.dying) {
            this.beamState.active = false;
            this.beamState.lethal = false;
            return done();
          }
          // fase 2: varre de volta
          gs.tweens.add({
            targets: this.beamState,
            gx: start,
            duration: 1100,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              this.beamState.active = false;
              this.beamState.lethal = false;
              done();
            },
          });
        },
      });
    });
  }

  private updateBeam(time: number) {
    const b = this.beamState;
    if (!b.active || this.dying) {
      this.beam.setVisible(false);
      return;
    }
    const ex = this.iris.x;
    const ey = this.iris.y;
    const gx = b.gx;
    const gy = GROUND_Y - 2;
    const len = Phaser.Math.Distance.Between(ex, ey, gx, gy);
    this.beam
      .setVisible(true)
      .setPosition(ex, ey)
      .setRotation(Math.atan2(gy - ey, gx - ex))
      .setSize(len, b.lethal ? 8 : 2)
      .setAlpha(b.lethal ? 0.85 + Math.random() * 0.15 : Math.floor(time / 60) % 2 ? 0.6 : 0.2);
    this.beam.tilePositionX -= 6;
    if (!b.lethal) return;
    if (Math.random() < 0.5) this.gs.dust(gx, GROUND_Y, 0.7);
    // colisão: distância do centro do herói ao segmento do feixe
    const p = this.gs.player;
    const line = new Phaser.Geom.Line(ex, ey, gx, gy);
    const near = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(p.x, p.y));
    const onSegment = Math.min(ex, gx) - 2 <= near.x && near.x <= Math.max(ex, gx) + 2 && near.y <= gy + 2;
    const pb = p.body;
    const hitsBody = onSegment && near.x > pb.left - 3 && near.x < pb.right + 3 && near.y > pb.top && near.y < pb.bottom;
    if (hitsBody) this.gs.hurtPlayer(1, gx);
  }

  /** Anéis de projéteis (dois anéis desencontrados na fase 2). */
  private rings(done: () => void) {
    const gs = this.gs;
    this.moving = false;
    const fire = (offset: number) => {
      if (this.dying) return;
      const n = 12;
      for (let i = 0; i < n; i++) gs.spawnEnemyBullet(this.iris.x, this.iris.y, (i / n) * Math.PI * 2 + offset, 105);
      gs.cameras.main.flash(60, 255, 40, 90);
    };
    gs.time.delayedCall(300, () => fire(0));
    if (this.phase2) gs.time.delayedCall(700, () => fire(Math.PI / 12));
    gs.time.delayedCall(this.phase2 ? 1100 : 800, done);
  }

  /** Mergulho: avança sobre a posição do herói e volta ao alto. */
  private dive(done: () => void) {
    const gs = this.gs;
    this.moving = false;
    this.diving = true;
    const tx = Phaser.Math.Clamp(gs.player.x, this.arenaX + 50, this.arenaX + GAME_WIDTH - 50);
    this.iris.setTint(0xff9ab0);
    gs.tweens.add({
      targets: this,
      x: tx,
      y: GROUND_Y - 50,
      duration: this.phase2 ? 380 : 500,
      delay: 350,
      ease: 'Quad.easeIn',
      onComplete: () => {
        gs.cameras.main.shake(160, 0.01);
        gs.dust(this.x - 20, GROUND_Y, 1);
        gs.dust(this.x + 20, GROUND_Y, 1);
        gs.tweens.add({
          targets: this,
          y: 92,
          duration: 600,
          delay: 250,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.diving = false;
            this.iris.clearTint();
            done();
          },
        });
      },
    });
  }

  /** Invocação: fecha as pálpebras (invulnerável) e chama robôs por teletransporte. */
  private summon(done: () => void) {
    const gs = this.gs;
    this.moving = false;
    this.setLids(1, () => {
      const n = this.phase2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        gs.time.delayedCall(i * 300, () => {
          if (this.dying) return;
          const x = this.arenaX + [60, GAME_WIDTH - 60, GAME_WIDTH / 2][i];
          gs.spawnEnemy(i === 2 ? 'exterminator' : 'hunter', x, undefined, true);
        });
      }
      gs.time.delayedCall(1300, () => this.setLids(0, done));
    });
  }

  private setLids(target: number, done?: () => void) {
    this.gs.tweens.add({
      targets: this,
      lidsClosed: target,
      duration: 220,
      onComplete: () => done?.(),
    });
  }

  // ------------------------------------------------------------ corpo

  private layout(time: number) {
    const { x, y } = this;
    this.ball.setPosition(x, y);
    this.glow.setPosition(x, y).setAlpha(0.35 + Math.sin(time / 300) * 0.15);
    this.ringA.setPosition(x, y);
    this.ringB.setPosition(x, y);
    // íris acompanha o herói
    const p = this.gs.player;
    const a = Math.atan2(p.y - y, p.x - x);
    const dist = Math.min(1, Phaser.Math.Distance.Between(x, y, p.x, p.y) / 180);
    this.iris.setPosition(x + Math.cos(a) * 16 * dist, y + Math.sin(a) * 9 * dist);
    // pálpebras: 0 = abertas (fora do olho), 1 = fechadas no centro
    const lh = 23 * this.lidsClosed;
    this.lidTop.setPosition(x, y - 23).setScale(1, this.lidsClosed);
    this.lidBot.setPosition(x, y + 23).setScale(1, this.lidsClosed);
    this.lidTop.setVisible(lh > 0.5);
    this.lidBot.setVisible(lh > 0.5);
    // zonas: íris é fraca só com o olho aberto
    this.irisZone.setPosition(this.iris.x, this.iris.y);
    this.setWeak(this.irisZone, this.lidsClosed < 0.3);
    // cabos pendurados balançando
    const g = this.cables.clear();
    for (let i = 0; i < 5; i++) {
      const sx = x - 30 + i * 15;
      const sy = y + 20;
      const sway = Math.sin(time / 400 + i) * 10 + (this.diving ? 0 : 0);
      const ex = sx + sway;
      const ey = sy + 40 + (i % 2) * 14;
      g.lineStyle(3, 0x02030a, 1).beginPath().moveTo(sx, sy);
      g.lineTo((sx + ex) / 2 + sway * 0.5, (sy + ey) / 2);
      g.lineTo(ex, ey).strokePath();
      g.fillStyle(i % 2 ? 0xff2a5a : 0x00e0ff, 1).fillRect(ex - 1, ey - 1, 3, 3);
    }
  }

  protected bounds() {
    return new Phaser.Geom.Rectangle(this.x - 50, this.y - 35, 100, 70);
  }

  protected flash() {
    this.iris.setTintFill(0xffffff);
    this.gs.time.delayedCall(50, () => this.iris.active && this.iris.clearTint());
  }

  protected onPhase2() {
    this.speedMul = 1.6;
    this.glow.setTint(0xff0030);
    this.gs.cameras.main.shake(400, 0.01);
  }

  protected cleanup() {
    [this.ringA, this.ringB, this.ball, this.iris, this.glow, this.lidTop, this.lidBot, this.cables, this.beam].forEach((o) => o.destroy());
  }
}
