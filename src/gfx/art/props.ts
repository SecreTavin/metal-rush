import Phaser from 'phaser';
import { makeTexture, mulberry32, offscreen, rand, randInt, RNG, wrapX } from './kit';
import {
  BARK_NEAR, FOREGROUND, LEAF_PLAY, MOSS_PLAY, PLAY, SAND, Shades, STONE_PLAY, WOOD,
} from './palettes';
import { column, foliage, mossTop, shadedCircle, stoneBlock, stoneHead, trunk, vine } from './primitives';

export const GROUND_TILE_W = 128;
export const GROUND_H = 44;

export type DecorKind = 'idol' | 'brokenColumn' | 'bush' | 'tree' | 'barrel' | 'rubble';
export type ForegroundKind = 'fern' | 'vines';
export type BlockKind = 'sandbags' | 'crate' | 'rock';

export function generateProps(scene: Phaser.Scene) {
  const rng = mulberry32(4242);
  generateGround(scene, rng);
  generateDecor(scene, rng);
  generateForeground(scene, rng);
  makeTexture(scene, 'leaf', 5, 3, (ctx) => {
    ctx.fillStyle = '#7c9636';
    ctx.fillRect(1, 0, 3, 1);
    ctx.fillRect(0, 1, 5, 1);
    ctx.fillStyle = '#556b26';
    ctx.fillRect(1, 2, 3, 1);
  });
}

// ---------- Chão ----------

function generateGround(scene: Phaser.Scene, rng: RNG) {
  const W = GROUND_TILE_W;
  makeTexture(
    scene,
    'ground_fill',
    W,
    GROUND_H,
    (ctx) => {
      // terra de fundo
      const dirt = ctx.createLinearGradient(0, 0, 0, GROUND_H);
      dirt.addColorStop(0, '#7f5e38');
      dirt.addColorStop(1, '#3b2a16');
      ctx.fillStyle = dirt;
      ctx.fillRect(0, 0, W, GROUND_H);
      // duas fileiras de blocos de pedra (larguras somam W para repetir sem emenda)
      const rows: { y: number; h: number; widths: number[]; offset: number }[] = [
        { y: 4, h: 18, widths: [34, 30, 36, 28], offset: 0 },
        { y: 22, h: 22, widths: [40, 44, 44], offset: 18 },
      ];
      for (const row of rows) {
        let x = row.offset;
        for (const bw of row.widths) {
          const gap = rng() < 0.12; // bloco faltando = terra aparente
          if (!gap) {
            const brick = offscreen(bw, row.h, (b) => stoneBlock(b, rng, 0, 0, bw, row.h, STONE_PLAY));
            wrapX(W, (o) => ctx.drawImage(brick, x + o, row.y));
          }
          x += bw;
        }
      }
      // escurece a base (profundidade)
      const shade = ctx.createLinearGradient(0, 24, 0, GROUND_H);
      shade.addColorStop(0, 'rgba(30,20,8,0)');
      shade.addColorStop(1, 'rgba(30,20,8,0.55)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 24, W, GROUND_H - 24);
      // musgo no topo
      mossTop(ctx, rng, 0, 0, W, MOSS_PLAY, 5);
    },
    { palette: PLAY, dither: 10 },
  );

  // Tufos de grama que ficam por cima da borda do chão
  makeTexture(
    scene,
    'ground_lip',
    W,
    10,
    (ctx) => {
      for (let x = 0; x < W; x++) {
        if (rng() < 0.45) {
          const bh = randInt(rng, 2, 8);
          ctx.fillStyle = rng() < 0.3 ? MOSS_PLAY.light : rng() < 0.5 ? MOSS_PLAY.base : MOSS_PLAY.dark;
          ctx.fillRect(x, 10 - bh, 1, bh);
        }
      }
      ctx.fillStyle = MOSS_PLAY.base;
      ctx.fillRect(0, 8, W, 2);
    },
    { palette: PLAY, dither: 0 },
  );

  // Interior do buraco: escurece com a profundidade e tem raízes penduradas
  makeTexture(
    scene,
    'pit_fill',
    64,
    GROUND_H,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_H);
      g.addColorStop(0, '#4a3520');
      g.addColorStop(0.35, '#22170c');
      g.addColorStop(1, '#070403');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, GROUND_H);
      const roots: Shades = { light: '#7b5d36', base: '#553f24', dark: '#352711', deep: '#1c140a' };
      for (let i = 0; i < 5; i++) vine(ctx, rng, rand(rng, 4, 60), 0, rand(rng, 12, 34), roots);
    },
    { palette: PLAY, dither: 18 },
  );

  // Borda de barranco (usada nos buracos)
  makeTexture(
    scene,
    'ground_edge',
    14,
    GROUND_H + 10,
    (ctx) => {
      ctx.fillStyle = STONE_PLAY.dark;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      let y = 0;
      ctx.lineTo(10, 0);
      while (y < GROUND_H + 10) {
        y += randInt(rng, 4, 8);
        ctx.lineTo(rand(rng, 6, 13), y);
      }
      ctx.lineTo(0, GROUND_H + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = STONE_PLAY.deep;
      ctx.fillRect(0, 0, 3, GROUND_H + 10);
      mossTop(ctx, rng, 0, 8, 14, MOSS_PLAY, 6);
    },
    { palette: PLAY, dither: 8 },
  );
}

// ---------- Coberturas e plataformas (geradas sob demanda por tamanho) ----------

export function blockTexture(scene: Phaser.Scene, kind: BlockKind, w: number, h: number) {
  const key = `block_${kind}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const rng = mulberry32(w * 31 + h * 17 + kind.length);
  if (kind === 'sandbags') {
    makeTexture(scene, key, w, h, (ctx) => drawSandbags(ctx, w, h), { palette: SAND, dither: 8 });
  } else if (kind === 'crate') {
    makeTexture(scene, key, w, h, (ctx) => drawCrate(ctx, w, h), { palette: WOOD, dither: 8 });
  } else {
    makeTexture(
      scene,
      key,
      w,
      h,
      (ctx) => {
        ctx.fillStyle = STONE_PLAY.base;
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.62, w / 2, h * 0.62, 0, Math.PI, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
        ctx.save();
        ctx.clip();
        for (let i = 0; i < 6; i++) shadedCircle(ctx, rand(rng, 0, w), rand(rng, 0, h), rand(rng, h * 0.3, h * 0.6), STONE_PLAY.light, STONE_PLAY.dark);
        ctx.restore();
        mossTop(ctx, rng, w * 0.2, 1, w * 0.6, MOSS_PLAY, 4);
      },
      { palette: PLAY, dither: 10 },
    );
  }
  return key;
}

function drawSandbags(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bw = 16;
  const bh = 8;
  let row = 0;
  for (let y = h - bh; y > -bh; y -= bh - 1, row++) {
    for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw - 1) {
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, '#f3e5b8');
      g.addColorStop(0.5, '#d2b986');
      g.addColorStop(1, '#8a6e44');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 3);
      ctx.fill();
      ctx.strokeStyle = '#3b2d19';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#94784a';
      ctx.fillRect(x + bw / 2, y + 2, 1, bh - 4);
    }
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#b07c40';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8a5a2a';
  for (let y = 5; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = '#d4a060';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  // cantoneiras + diagonal
  ctx.strokeStyle = '#62401c';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.beginPath();
  ctx.moveTo(2, h - 2);
  ctx.lineTo(w - 2, 2);
  ctx.stroke();
  ctx.fillStyle = '#c9ccd2';
  for (const [x, y] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) ctx.fillRect(x, y, 1, 1);
  ctx.strokeStyle = '#3e2812';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export function ledgeTexture(scene: Phaser.Scene, w: number) {
  const key = `ledge_${w}`;
  if (scene.textures.exists(key)) return key;
  const rng = mulberry32(w * 7);
  makeTexture(
    scene,
    key,
    w,
    14,
    (ctx) => {
      let x = 0;
      while (x < w) {
        const bw = Math.min(w - x, randInt(rng, 20, 30));
        stoneBlock(ctx, rng, x, 2, bw, 12, STONE_PLAY);
        x += bw;
      }
      ctx.fillStyle = STONE_PLAY.deep;
      ctx.fillRect(0, 13, w, 1);
      mossTop(ctx, rng, 0, 0, w, MOSS_PLAY, 4);
    },
    { palette: PLAY, dither: 10 },
  );
  return key;
}

export function pillarTexture(scene: Phaser.Scene, h: number) {
  const key = `pillar_${h}`;
  if (scene.textures.exists(key)) return key;
  const rng = mulberry32(h * 13);
  makeTexture(scene, key, 18, h, (ctx) => ctx.drawImage(column(rng, 12, h, STONE_PLAY, undefined, false), 0, 0), {
    palette: PLAY,
    dither: 10,
  });
  return key;
}

// ---------- Decoração (sem colisão) ----------

function generateDecor(scene: Phaser.Scene, rng: RNG) {
  const opts = { palette: PLAY, dither: 10 };
  makeTexture(scene, 'decor_idol', 44, 60, (ctx) => ctx.drawImage(stoneHead(rng, 44, 60, STONE_PLAY, MOSS_PLAY), 0, 0), opts);
  makeTexture(
    scene,
    'decor_brokenColumn',
    28,
    74,
    (ctx) => ctx.drawImage(column(rng, 22, 74, STONE_PLAY, MOSS_PLAY, true), 0, 0),
    opts,
  );
  makeTexture(scene, 'decor_bush', 80, 36, (ctx) => foliage(ctx, rng, 6, 4, 68, 32, LEAF_PLAY, 7, 12), opts);
  makeTexture(
    scene,
    'decor_tree',
    84,
    250,
    (ctx) => {
      ctx.drawImage(trunk(rng, 34, 250, BARK_NEAR), 0, 0);
      for (let i = 0; i < 3; i++) vine(ctx, rng, rand(rng, 30, 54), 0, rand(rng, 40, 120), LEAF_PLAY);
    },
    opts,
  );
  makeTexture(
    scene,
    'decor_barrel',
    18,
    22,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 18, 0);
      g.addColorStop(0, '#8a5a2a');
      g.addColorStop(0.3, '#d4a060');
      g.addColorStop(1, '#3e2812');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(9, 11, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(1, 1, 16, 20);
      ctx.fillStyle = '#62401c';
      for (const y of [4, 11, 17]) ctx.fillRect(0, y, 18, 2);
    },
    { palette: WOOD, dither: 8 },
  );
  makeTexture(
    scene,
    'decor_rubble',
    48,
    18,
    (ctx) => {
      stoneBlock(ctx, rng, 2, 8, 18, 10, STONE_PLAY);
      stoneBlock(ctx, rng, 18, 4, 16, 14, STONE_PLAY);
      stoneBlock(ctx, rng, 32, 10, 14, 8, STONE_PLAY);
      stoneBlock(ctx, rng, 10, 1, 12, 8, STONE_PLAY);
      mossTop(ctx, rng, 18, 4, 14, MOSS_PLAY, 3);
    },
    opts,
  );
}

// ---------- Primeiro plano (na frente dos personagens) ----------

function generateForeground(scene: Phaser.Scene, rng: RNG) {
  makeTexture(
    scene,
    'fg_fern',
    110,
    54,
    (ctx) => {
      const cx = 55;
      const by = 54;
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI / 2 + rand(rng, -1.25, 1.25);
        const len = rand(rng, 34, 56);
        const ex = cx + Math.cos(ang) * len;
        const ey = by + Math.sin(ang) * len * 0.8;
        const mx = cx + Math.cos(ang) * len * 0.5;
        const my = by - len * 0.6;
        ctx.strokeStyle = FOREGROUND[1];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
        for (let t = 0.15; t < 1; t += 0.08) {
          const px = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * ex;
          const py = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * my + t * t * ey;
          const size = 7 * (1 - t) + 2;
          ctx.fillStyle = t < 0.5 ? FOREGROUND[0] : FOREGROUND[4];
          ctx.beginPath();
          ctx.ellipse(px, py - size * 0.4, size * 0.35, size * 0.8, ang + 1.2, 0, Math.PI * 2);
          ctx.ellipse(px, py + size * 0.4, size * 0.35, size * 0.8, ang - 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    { palette: FOREGROUND, dither: 0 },
  );
  makeTexture(
    scene,
    'fg_vines',
    70,
    120,
    (ctx) => {
      foliage(ctx, rng, 0, -10, 70, 26, { light: '#3c5a2e', base: '#2f4a26', dark: '#223a1c', deep: '#172a14' }, 6, 11);
      for (let i = 0; i < 5; i++) {
        vine(ctx, rng, rand(rng, 8, 62), 8, rand(rng, 50, 110), {
          light: '#3c5a2e',
          base: '#2f4a26',
          dark: '#223a1c',
          deep: '#0f1d0d',
        });
      }
    },
    { palette: FOREGROUND, dither: 0 },
  );
}
