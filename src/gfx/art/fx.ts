import Phaser from 'phaser';
import { makeSheet, makeTexture, mulberry32, rand } from './kit';
import { FIRE } from './palettes';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function generateFx(scene: Phaser.Scene) {
  generateExplosion(scene);
  generateMuzzle(scene);
  generateSpark(scene);
  generatePuff(scene);
  generateHudParts(scene);

  makeTexture(scene, 'mote', 2, 2, (ctx) => {
    ctx.fillStyle = '#fff8d8';
    ctx.fillRect(0, 0, 2, 2);
  });
  // círculo simples (flash de dano etc.)
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1).fillCircle(16, 16, 16).generateTexture('fx_circle', 32, 32);
  g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3).generateTexture('fx_spark', 3, 3);
  g.clear().lineStyle(3, 0xffffff, 1).beginPath().arc(4, 14, 12, -1.2, 1.2).strokePath().generateTexture('fx_slash', 20, 28);
  g.destroy();

  scene.anims.create({ key: 'boom', frames: frames('boom', 10), frameRate: 20 });
  scene.anims.create({ key: 'muzzle', frames: frames('muzzle', 2), frameRate: 30 });
  scene.anims.create({ key: 'spark', frames: frames('spark', 4), frameRate: 24 });
  scene.anims.create({ key: 'puff', frames: frames('puff', 5), frameRate: 16 });
}

const frames = (key: string, n: number) => Array.from({ length: n }, (_, frame) => ({ key, frame }));

/** Explosão em 10 quadros: bola de fogo que cresce, esfria e vira fumaça. */
function generateExplosion(scene: Phaser.Scene) {
  const S = 72;
  const N = 10;
  const rng = mulberry32(99);
  const blobs = Array.from({ length: 11 }, () => ({
    a: rand(rng, 0, Math.PI * 2),
    d: rand(rng, 0, 1),
    s: rand(rng, 0.45, 1),
    rise: rand(rng, 0.6, 1.4),
  }));
  makeSheet(
    scene,
    'boom',
    S,
    S,
    N,
    (ctx, i) => {
      const t = i / (N - 1);
      const R = 6 + 26 * easeOut(Math.min(1, t * 1.7));
      const cx = S / 2;
      const cy = S * 0.58;
      for (const b of blobs) {
        const bx = cx + Math.cos(b.a) * b.d * R * 0.8;
        const by = cy + Math.sin(b.a) * b.d * R * 0.55 - t * 16 * b.rise;
        const br = R * b.s * 0.62 * (t > 0.55 ? 1 - (t - 0.55) * 0.9 : 1);
        if (br <= 0.5) continue;
        const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
        if (t < 0.2) {
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.5, '#fff4b0');
          g.addColorStop(1, '#ffa02a');
        } else if (t < 0.55) {
          g.addColorStop(0, '#fff4b0');
          g.addColorStop(0.4, '#ffd84a');
          g.addColorStop(0.75, '#f0641e');
          g.addColorStop(1, '#b8321a');
        } else {
          const smoke = t > 0.75;
          g.addColorStop(0, smoke ? '#7a6a60' : '#ffa02a');
          g.addColorStop(0.6, smoke ? '#51453f' : '#b8321a');
          g.addColorStop(1, smoke ? '#352d29' : '#6e2414');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      // buracos na fumaça no fim
      if (t > 0.65) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const hr = mulberry32(i * 7);
        for (let k = 0; k < (t - 0.6) * 30; k++) {
          ctx.beginPath();
          ctx.arc(rand(hr, 10, S - 10), rand(hr, 10, S - 10), rand(hr, 2, 3 + (t - 0.6) * 18), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    { palette: FIRE, dither: 10 },
  );
}

function generateMuzzle(scene: Phaser.Scene) {
  makeSheet(
    scene,
    'muzzle',
    18,
    12,
    2,
    (ctx, i) => {
      const len = i === 0 ? 17 : 12;
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(len * 0.35, 0);
      ctx.lineTo(len * 0.5, 4);
      ctx.lineTo(len, 6);
      ctx.lineTo(len * 0.5, 8);
      ctx.lineTo(len * 0.35, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(len * 0.3, 6, len * 0.25, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    { palette: FIRE, dither: 0 },
  );
}

function generateSpark(scene: Phaser.Scene) {
  makeSheet(
    scene,
    'spark',
    14,
    14,
    4,
    (ctx, i) => {
      const r = [3, 6, 6, 5][i];
      ctx.strokeStyle = i < 2 ? '#fff4b0' : '#ffa02a';
      ctx.lineWidth = i < 2 ? 2 : 1;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + i * 0.3;
        const r0 = i < 2 ? 0 : r - 3;
        ctx.beginPath();
        ctx.moveTo(7 + Math.cos(a) * r0, 7 + Math.sin(a) * r0);
        ctx.lineTo(7 + Math.cos(a) * r, 7 + Math.sin(a) * r);
        ctx.stroke();
      }
      if (i === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(5, 5, 4, 4);
      }
    },
    { palette: FIRE, dither: 0 },
  );
}

function generatePuff(scene: Phaser.Scene) {
  makeSheet(
    scene,
    'puff',
    18,
    14,
    5,
    (ctx, i) => {
      const r = 2 + i * 1.4;
      for (const [dx, dy] of [[-4, 2], [4, 2], [0, -1]]) {
        const g = ctx.createRadialGradient(9 + dx - 1, 9 + dy - 1, 0, 9 + dx, 9 + dy, r);
        g.addColorStop(0, '#f3e5b8');
        g.addColorStop(1, '#bda06a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(9 + dx * (1 + i * 0.2), 9 + dy - i * 0.5, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (i >= 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < i * 4; k++) ctx.fillRect(((k * 7) % 16) + 1, ((k * 5) % 12) + 1, 2, 2);
        ctx.restore();
      }
    },
    { palette: ['#f3e5b8', '#dcc690', '#bda06a'], dither: 0 },
  );
}

function generateHudParts(scene: Phaser.Scene) {
  // Moldura da barra (estilo arcade: metal com borda escura)
  makeTexture(scene, 'hud_gauge', 100, 10, (ctx) => {
    ctx.fillStyle = '#0c1020';
    ctx.fillRect(0, 0, 100, 10);
    ctx.fillStyle = '#8fa4c8';
    ctx.fillRect(1, 1, 98, 1);
    ctx.fillStyle = '#3a4c74';
    ctx.fillRect(1, 8, 98, 1);
    ctx.fillStyle = '#1c2440';
    ctx.fillRect(2, 2, 96, 6);
  });
  makeTexture(scene, 'hud_gauge_fill', 96, 6, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 6);
    g.addColorStop(0, '#bfe8ff');
    g.addColorStop(0.4, '#4fa8ff');
    g.addColorStop(1, '#1f4fb0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < 96; x += 4) ctx.fillRect(x, 0, 1, 6);
  });
  // Símbolo de infinito em pixel-art
  makeTexture(scene, 'hud_inf', 18, 9, (ctx) => {
    const rows = [
      '..kkk.....kkk.....',
      '.kyyyk...kyyyk....',
      'kyk.kyk.kyk.kyk...',
      'ky...kykyk...yk...',
      'ky....kyk....yk...',
      'ky...kykyk...yk...',
      'kyk.kyk.kyk.kyk...',
      '.kyyyk...kyyyk....',
      '..kkk.....kkk.....',
    ];
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === '.') return;
        ctx.fillStyle = c === 'k' ? '#000000' : '#ffd84a';
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  });
}
