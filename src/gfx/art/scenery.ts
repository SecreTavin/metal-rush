import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../../config';
import { makeTexture, mulberry32, pick, rand, randInt } from './kit';
import {
  BARK_MID, BARK_NEAR, FAR, LEAF_FAR, LEAF_MID, LEAF_NEAR, MID, MOSS_NEAR, NEAR, SKY, STONE_MID, STONE_NEAR,
} from './palettes';
import { brickWall, column, foliage, steppedPyramid, stoneHead, trunk, vine } from './primitives';

/** Fatores de parallax de cada camada (1 = mesma velocidade do jogador). */
export const PARALLAX = { far: 0.15, rays: 0.25, mid: 0.35, near: 0.6 } as const;

/** Largura necessária para uma camada cobrir a fase inteira sem repetir. */
export const layerWidth = (levelWidth: number, factor: number) =>
  Math.ceil(GAME_WIDTH + (levelWidth - GAME_WIDTH) * factor) + 8;

export function generateScenery(scene: Phaser.Scene, levelWidth: number, seed = 1) {
  generateSky(scene);
  generateFar(scene, layerWidth(levelWidth, PARALLAX.far), seed);
  generateMid(scene, layerWidth(levelWidth, PARALLAX.mid), seed + 1);
  generateNear(scene, layerWidth(levelWidth, PARALLAX.near), seed + 2);
  generateRay(scene);
}

function generateSky(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'bg_sky',
    GAME_WIDTH,
    GAME_HEIGHT,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      g.addColorStop(0, '#a8c2aa');
      g.addColorStop(0.45, '#cbdac0');
      g.addColorStop(1, '#e8ebd0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      const sun = ctx.createRadialGradient(360, 20, 4, 360, 20, 180);
      sun.addColorStop(0, 'rgba(255,250,225,1)');
      sun.addColorStop(1, 'rgba(255,250,225,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    },
    { palette: SKY, dither: 22 },
  );
}

/** Selva distante: silhuetas de copas, troncos finos e pirâmides na névoa. */
function generateFar(scene: Phaser.Scene, w: number, seed: number) {
  const rng = mulberry32(seed * 101);
  makeTexture(
    scene,
    'bg_far',
    w,
    GAME_HEIGHT,
    (ctx) => {
      for (let x = rand(rng, 0, 120); x < w; x += rand(rng, 220, 380)) {
        steppedPyramid(ctx, rng, x, 200, rand(rng, 90, 150), rand(rng, 70, 110), '#a9bca4', '#bfcfb8');
      }
      for (let x = 0; x < w; x += rand(rng, 30, 70)) {
        const tw = randInt(rng, 3, 7);
        ctx.fillStyle = rng() < 0.5 ? '#9fb49b' : '#94aa91';
        ctx.fillRect(x, 0, tw, 210);
      }
      foliage(ctx, rng, -20, -30, w + 40, 70, LEAF_FAR, 14, 26);
      foliage(ctx, rng, -20, 170, w + 40, 110, LEAF_FAR, 12, 24);
      // névoa horizontal
      const mist = ctx.createLinearGradient(0, 150, 0, 230);
      mist.addColorStop(0, 'rgba(225,232,212,0)');
      mist.addColorStop(0.5, 'rgba(225,232,212,0.55)');
      mist.addColorStop(1, 'rgba(225,232,212,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 150, w, 80);
    },
    { palette: FAR, dither: 14 },
  );
}

/** Plano médio: troncos grandes, templos em ruínas, cipós e mato. */
function generateMid(scene: Phaser.Scene, w: number, seed: number) {
  const rng = mulberry32(seed * 131);
  makeTexture(
    scene,
    'bg_mid',
    w,
    GAME_HEIGHT,
    (ctx) => {
      for (let x = rand(rng, 0, 150); x < w; x += rand(rng, 260, 420)) {
        const ww = randInt(rng, 120, 220);
        const wh = randInt(rng, 60, 110);
        const wall = brickWall(rng, ww, wh, STONE_MID, undefined, { brickW: 22, brickH: 10, arch: rng() < 0.6 });
        ctx.drawImage(wall, Math.round(x), 222 - wh);
      }
      for (let x = rand(rng, 40, 120); x < w; x += rand(rng, 170, 300)) {
        const t = trunk(rng, randInt(rng, 16, 26), 240, BARK_MID);
        ctx.drawImage(t, Math.round(x - t.width / 2), -10);
      }
      foliage(ctx, rng, -20, -30, w + 40, 80, LEAF_MID, 12, 24);
      for (let x = 0; x < w; x += rand(rng, 14, 40)) vine(ctx, rng, x, rand(rng, 20, 40), rand(rng, 30, 130), LEAF_MID);
      foliage(ctx, rng, -20, 190, w + 40, 50, LEAF_MID, 8, 16);
    },
    { palette: MID, dither: 12 },
  );
}

/** Plano próximo: ruínas com cabeças de pedra, colunas, árvores e cipós. */
function generateNear(scene: Phaser.Scene, w: number, seed: number) {
  const rng = mulberry32(seed * 173);
  const base = GROUND_Y + 10;
  makeTexture(
    scene,
    'bg_near',
    w,
    GAME_HEIGHT,
    (ctx) => {
      let x = rand(rng, 60, 160);
      while (x < w) {
        const kind = pick(rng, ['wall', 'head', 'columns', 'wall', 'arch'] as const);
        let used = 0;
        if (kind === 'head') {
          const hw = randInt(rng, 110, 140);
          const hh = randInt(rng, 140, 165);
          const pedestal = brickWall(rng, hw + 30, 30, STONE_NEAR, MOSS_NEAR, { brickW: 30, brickH: 10 });
          ctx.drawImage(pedestal, Math.round(x - 15), base - 30);
          ctx.drawImage(stoneHead(rng, hw, hh, STONE_NEAR, MOSS_NEAR, LEAF_NEAR), Math.round(x), base - 30 - hh + 8);
          used = hw;
        } else if (kind === 'columns') {
          const n = randInt(rng, 2, 3);
          const gap = randInt(rng, 34, 50);
          const ch = randInt(rng, 100, 150);
          const intact = rng() < 0.4;
          for (let i = 0; i < n; i++) {
            const c = column(rng, 20, intact ? ch : ch - randInt(rng, 0, 50), STONE_NEAR, MOSS_NEAR, !intact);
            ctx.drawImage(c, Math.round(x + i * gap), base - c.height);
          }
          if (intact) {
            const lintel = brickWall(rng, (n - 1) * gap + 34, 14, STONE_NEAR, MOSS_NEAR, { brickW: 40, brickH: 14 });
            ctx.drawImage(lintel, Math.round(x - 4), base - ch - 12);
          }
          used = (n - 1) * gap + 26;
        } else {
          const ww = randInt(rng, 110, 200);
          const wh = randInt(rng, 70, 130);
          const wall = brickWall(rng, ww, wh, STONE_NEAR, MOSS_NEAR, { brickW: 28, brickH: 13, arch: kind === 'arch' });
          ctx.drawImage(wall, Math.round(x), base - wh);
          used = ww;
        }
        x += used + rand(rng, 60, 180);
      }
      // Árvores grandes com raízes
      for (let tx = rand(rng, 200, 400); tx < w; tx += rand(rng, 420, 700)) {
        const t = trunk(rng, randInt(rng, 26, 36), 250, BARK_NEAR);
        ctx.drawImage(t, Math.round(tx - t.width / 2), base - 250);
      }
      foliage(ctx, rng, -20, -34, w + 40, 60, LEAF_NEAR, 10, 22);
      for (let vx = 0; vx < w; vx += rand(rng, 18, 60)) vine(ctx, rng, vx, rand(rng, 6, 20), rand(rng, 30, 150), LEAF_NEAR);
      foliage(ctx, rng, -20, 196, w + 40, 44, LEAF_NEAR, 8, 18);
    },
    { palette: NEAR, dither: 10 },
  );
}

/** Raio de luz diagonal (desenhado suave; é aplicado com blend aditivo). */
function generateRay(scene: Phaser.Scene) {
  makeTexture(scene, 'fx_ray', 90, GAME_HEIGHT, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    g.addColorStop(0, 'rgba(255,248,210,0.9)');
    g.addColorStop(1, 'rgba(255,248,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(70, 0);
    ctx.lineTo(90, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();
  });
}
