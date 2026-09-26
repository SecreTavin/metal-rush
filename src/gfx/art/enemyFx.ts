import Phaser from 'phaser';
import { makeSheet, makeTexture } from './kit';

/* Efeitos dos robôs-esqueleto: plasma vermelho, clarão, brilho dos olhos. */

const RED = ['#ffffff', '#ffd0c0', '#ff7a6a', '#ff2a2a', '#b01818', '#5a0a0a'];

export function generateEnemyFx(scene: Phaser.Scene) {
  // Raio de plasma: núcleo branco, corpo vermelho e cauda
  makeTexture(
    scene,
    'plasma',
    14,
    5,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 14, 0);
      g.addColorStop(0, 'rgba(176,24,24,0)');
      g.addColorStop(0.4, '#b01818');
      g.addColorStop(1, '#ff2a2a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 1, 14, 3);
      ctx.fillStyle = '#ff7a6a';
      ctx.fillRect(6, 1, 8, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 2, 5, 1);
      ctx.fillStyle = '#ff2a2a';
      ctx.fillRect(11, 0, 2, 5);
    },
    { palette: RED, dither: 0 },
  );

  makeSheet(
    scene,
    'muzzle_plasma',
    14,
    12,
    2,
    (ctx, i) => {
      const r = i === 0 ? 6 : 4;
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(r, 6 - r * 0.8);
      ctx.lineTo(r * 2, 6);
      ctx.lineTo(r, 6 + r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd0c0';
      ctx.fillRect(2, 5, r, 2);
    },
    { palette: RED, dither: 0 },
  );

  makeTexture(scene, 'eye_glow', 12, 12, (ctx) => {
    const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,80,60,0.9)');
    g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 12, 12);
  });

  // Rasgo das garras do Rastreador
  makeTexture(scene, 'claw_slash', 22, 26, (ctx) => {
    ctx.strokeStyle = '#ff5060';
    ctx.lineWidth = 1.5;
    for (const dx of [0, 4, 8]) {
      ctx.beginPath();
      ctx.moveTo(4 + dx, 2);
      ctx.quadraticCurveTo(16 + dx, 12, 6 + dx, 24);
      ctx.stroke();
    }
  });

  scene.anims.create({
    key: 'muzzle_plasma',
    frames: [0, 1].map((frame) => ({ key: 'muzzle_plasma', frame })),
    frameRate: 30,
  });
}

/** Animações dos robôs (spritesheets gerados por tools/enemy/build_enemy.py). */
export function createEnemyAnimations(scene: Phaser.Scene) {
  for (const key of ['bot_soldier', 'bot_hunter']) {
    const f = (list: number[]) => list.map((frame) => ({ key, frame }));
    const fast = key === 'bot_hunter';
    scene.anims.create({ key: `${key}-idle`, frames: f([0, 1, 2, 3]), frameRate: 4, repeat: -1 });
    scene.anims.create({ key: `${key}-run`, frames: f([4, 5, 6, 7, 8, 9]), frameRate: fast ? 15 : 9, repeat: -1 });
    scene.anims.create({ key: `${key}-jump`, frames: f([6]) });
    scene.anims.create({ key: `${key}-attack`, frames: f([10, 11, 11]), frameRate: fast ? 12 : 16 });
    scene.anims.create({ key: `${key}-die`, frames: f([12, 13, 14]), frameRate: 9 });
  }
}
