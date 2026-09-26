import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { makeTexture, mulberry32, pick, rand, randInt, wrapX } from '../gfx/art/kit';
import type { BlockKind, LevelData } from '../level/types';
import { cable, glow, pixelText, truss, vgrad, windows } from './draw';
import { addLayer, DEPTH, layerWidth, onUpdate, PARALLAX, Theme } from './Theme';

/*
 * MISSÃO 2 — Fábrica de Sintéticos.
 * O galpão onde as IAs produzem os robôs-esqueleto: linha de montagem com corpos pendurados,
 * fornalha, engrenagens gigantes, ponte rolante, faíscas de solda e poças de metal derretido.
 */

const BACK = ['#07080c', '#0e1118', '#151a24', '#1d2330', '#262e3e', '#33394a', '#5a1a14', '#8a2a18', '#c8401c', '#ff7a2a', '#ffd08a', '#3a2a2a'];
const FAR = ['#0b0d13', '#11141c', '#181c27', '#202634', '#2a3142', '#363e52', '#ff7a2a', '#c8401c', '#ffd56a', '#6ae0ff', '#ff2a3a', '#4a2418'];
const MID = ['#0a0c11', '#11141c', '#191d28', '#222836', '#2c3345', '#3a4256', '#4c566c', '#ff7a2a', '#c8401c', '#ffd08a', '#fff0c0', '#6ae0ff', '#ff2a3a', '#f2c230', '#5a2418'];
const NEAR = ['#08090d', '#0f1118', '#161a23', '#1f2430', '#29303e', '#343c4d', '#46505f', '#5e6878', '#7d8796', '#f2c230', '#8a6a18', '#ff7a2a', '#c8401c', '#6ae0ff', '#3fa0c0', '#ff2a3a', '#7aff6a', '#c9ced6', '#3a4a2a'];
const PLAY = ['#07080c', '#0f1118', '#161a23', '#1f2430', '#29303e', '#343c4d', '#46505f', '#5e6878', '#7d8796', '#a5aebb', '#d0d6de', '#f2c230', '#8a6a18', '#ff7a2a', '#c8401c', '#ffd08a', '#6ae0ff', '#ff2a3a', '#3a2a1a', '#5a4020'];
const LAVA = ['#3a0a04', '#6a1406', '#a82a0a', '#e0501a', '#ff8a2a', '#ffc860', '#fff0b0'];
const FG = ['#040507', '#08090d', '#0e1016', '#171a22', '#ff7a2a', '#f2c230'];

interface FactoryLayout {
  railY: number;
  craneY: number;
  gears: { x: number; y: number; r: number }[];
  welds: { x: number; y: number }[];
  fans: { x: number; y: number }[];
  furnaces: { x: number; y: number }[];
}
const layouts = new Map<string, FactoryLayout>();

function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size = 4) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#0f1118';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f2c230';
  for (let i = -h; i < w + h; i += size * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + size, y + h);
    ctx.lineTo(x + i + size + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.fill();
  }
  ctx.restore();
}

function rivetRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, step: number, light: string, dark: string) {
  for (let xx = x; xx < x + w; xx += step) {
    ctx.fillStyle = light;
    ctx.fillRect(xx, y, 1, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(xx + 1, y + 1, 1, 1);
  }
}

function pipe(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, thick: number, vertical: boolean, c: [string, string, string]) {
  const g = vertical ? ctx.createLinearGradient(x, 0, x + thick, 0) : ctx.createLinearGradient(0, y, 0, y + thick);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.35, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  if (vertical) ctx.fillRect(x, y, thick, len);
  else ctx.fillRect(x, y, len, thick);
  ctx.fillStyle = c[2];
  for (let i = 12; i < len; i += 30) {
    if (vertical) ctx.fillRect(x - 1, y + i, thick + 2, 3);
    else ctx.fillRect(x + i, y - 1, 3, thick + 2);
  }
}

// ============================================================= camadas

function back(scene: Phaser.Scene, layout: FactoryLayout) {
  makeTexture(
    scene,
    'factory_back',
    GAME_WIDTH,
    GAME_HEIGHT,
    (ctx) => {
      const rng = mulberry32(12);
      vgrad(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, [[0, '#0e1118'], [0.5, '#151a24'], [1, '#262e3e']]);
      // janelões com o céu vermelho e chaminés lá fora
      for (let x = 10; x < GAME_WIDTH; x += 118) {
        vgrad(ctx, x, 14, 96, 70, [[0, '#5a1a14'], [0.6, '#8a2a18'], [1, '#c8401c']]);
        ctx.fillStyle = '#0e1118';
        for (let c = 0; c < 3; c++) {
          const cx = x + 10 + c * 30 + randInt(rng, 0, 8);
          const ch = randInt(rng, 24, 46);
          ctx.fillRect(cx, 84 - ch, 8, ch);
          glow(ctx, cx + 4, 84 - ch - 6, 10, '255,122,42', 0.3);
        }
        ctx.fillStyle = '#07080c';
        for (let gx = x; gx <= x + 96; gx += 24) ctx.fillRect(gx, 14, 2, 70);
        for (let gy = 14; gy <= 84; gy += 17) ctx.fillRect(x, gy, 96, 2);
      }
      // colunas estruturais
      for (let x = 0; x < GAME_WIDTH; x += 118) {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(x, 0, 10, GAME_HEIGHT);
        ctx.fillStyle = '#262e3e';
        ctx.fillRect(x + 1, 0, 2, GAME_HEIGHT);
      }
      // viga do teto
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, GAME_WIDTH, 12);
      for (let x = 0; x < GAME_WIDTH; x += 16) {
        ctx.fillStyle = '#1d2330';
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x + 8, 2);
        ctx.lineTo(x + 16, 12);
        ctx.stroke();
      }
      // luminárias
      for (let x = 60; x < GAME_WIDTH; x += 118) {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(x, 12, 1, 90);
        ctx.fillRect(x - 5, 100, 11, 4);
        glow(ctx, x, 110, 40, '255,208,138', 0.25);
      }
      layout.fans = [{ x: 128, y: 150 }, { x: 364, y: 150 }];
    },
    { palette: BACK, dither: 14 },
  );
}

function far(scene: Phaser.Scene, level: LevelData, layout: FactoryLayout) {
  const w = layerWidth(level.width, PARALLAX.far);
  const rng = mulberry32(22);
  makeTexture(
    scene,
    'factory_far',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      // torres de montagem e tanques
      for (let x = 0; x < w; x += randInt(rng, 70, 130)) {
        const kind = rng();
        if (kind < 0.4) {
          const tw = randInt(rng, 30, 50);
          const th = randInt(rng, 120, 190);
          truss(ctx, x, base - th, tw, th, '#202634', '#2a3142');
          ctx.fillStyle = '#181c27';
          ctx.fillRect(x - 6, base - th, tw + 12, 8);
          ctx.fillStyle = '#ffd56a';
          for (let ly = base - th + 20; ly < base; ly += 30) ctx.fillRect(x + tw / 2, ly, 2, 2);
        } else if (kind < 0.7) {
          const r = randInt(rng, 20, 34);
          const th = randInt(rng, 70, 120);
          vgrad(ctx, x, base - th, r * 2, th, [[0, '#2a3142'], [1, '#181c27']]);
          ctx.fillStyle = '#2a3142';
          ctx.beginPath();
          ctx.ellipse(x + r, base - th, r, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#11141c';
          for (let ly = base - th + 14; ly < base; ly += 18) ctx.fillRect(x, ly, r * 2, 2);
        } else {
          // sala de controle com janelas acesas
          const bw = randInt(rng, 50, 80);
          const bh = randInt(rng, 60, 110);
          ctx.fillStyle = '#181c27';
          ctx.fillRect(x, base - bh, bw, bh);
          windows(ctx, rng, x + 4, base - bh + 6, bw - 8, bh - 12, { cw: 6, ch: 7, ww: 4, wh: 3, lit: 0.4, colors: ['#6ae0ff', '#ffd56a'], dark: '#11141c' });
        }
      }
      // robô gigante em construção
      const gx = Math.round(w * 0.45);
      ctx.fillStyle = '#11141c';
      ctx.beginPath();
      ctx.arc(gx, 70, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(gx - 4, 90, 8, 20);
      for (let i = 0; i < 6; i++) ctx.fillRect(gx - 26, 110 + i * 10, 52, 5);
      ctx.fillRect(gx - 38, 108, 10, 70);
      ctx.fillRect(gx + 28, 108, 10, 70);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(gx + 4, 66, 8, 4);
      truss(ctx, gx - 60, 40, 12, base - 40, '#202634', '#2a3142');
      truss(ctx, gx + 48, 40, 12, base - 40, '#202634', '#2a3142');
      ctx.fillStyle = '#202634';
      ctx.fillRect(gx - 60, 40, 120, 6);
      // trilho da linha de montagem
      layout.railY = 56;
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, layout.railY - 2, w, 4);
      ctx.fillStyle = '#363e52';
      ctx.fillRect(0, layout.railY - 2, w, 1);
      vgrad(ctx, 0, 180, w, 90, [[0, 'rgba(255,122,42,0)'], [1, 'rgba(200,64,28,0.35)']]);
    },
    { palette: FAR, dither: 10 },
  );
}

function mid(scene: Phaser.Scene, level: LevelData, layout: FactoryLayout) {
  const w = layerWidth(level.width, PARALLAX.mid);
  const rng = mulberry32(32);
  makeTexture(
    scene,
    'factory_mid',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      layout.craneY = 30;
      // trilho da ponte rolante
      ctx.fillStyle = '#0a0c11';
      ctx.fillRect(0, 24, w, 10);
      hazard(ctx, 0, 34, w, 3, 3);
      for (let x = 0; x < w; x += 90) {
        truss(ctx, x, 37, 10, base - 37, '#191d28', '#2c3345');
      }
      let x = 20;
      while (x < w) {
        const kind = rng();
        if (kind < 0.3) {
          // fornalha
          const fw = randInt(rng, 70, 100);
          const fh = randInt(rng, 110, 150);
          vgrad(ctx, x, base - fh, fw, fh, [[0, '#2c3345'], [1, '#191d28']]);
          ctx.fillStyle = '#0a0c11';
          ctx.fillRect(x + 12, base - 60, fw - 24, 44);
          vgrad(ctx, x + 14, base - 58, fw - 28, 40, [[0, '#c8401c'], [0.6, '#ff7a2a'], [1, '#ffd08a']]);
          ctx.fillStyle = '#5a2418';
          for (let gx = x + 16; gx < x + fw - 14; gx += 6) ctx.fillRect(gx, base - 58, 2, 40);
          glow(ctx, x + fw / 2, base - 38, fw, '255,122,42', 0.45);
          ctx.fillStyle = '#222836';
          ctx.fillRect(x + fw / 2 - 8, base - fh - 40, 16, 40);
          layout.furnaces.push({ x: x + fw / 2, y: base - 38 });
          x += fw + randInt(rng, 20, 50);
        } else if (kind < 0.55) {
          // engrenagem gigante (a textura gira num ator separado; aqui fica o eixo/suporte)
          const r = randInt(rng, 26, 40);
          const gy = randInt(rng, 110, 160);
          ctx.fillStyle = '#191d28';
          ctx.fillRect(x + r - 4, gy, 8, base - gy);
          layout.gears.push({ x: x + r, y: gy, r });
          x += r * 2 + randInt(rng, 20, 60);
        } else if (kind < 0.8) {
          // feixe de canos
          for (let i = 0; i < 4; i++) {
            pipe(ctx, x + i * 9, randInt(rng, 60, 110), base, 7, true, ['#3a4256', '#4c566c', '#191d28']);
          }
          pipe(ctx, x - 20, randInt(rng, 70, 120), 80, 6, false, ['#3a4256', '#4c566c', '#191d28']);
          layout.welds.push({ x: x + 20, y: randInt(rng, 130, 190) });
          x += 60 + randInt(rng, 20, 60);
        } else {
          // sala de controle elevada
          const bw = randInt(rng, 60, 90);
          const top = randInt(rng, 90, 130);
          ctx.fillStyle = '#222836';
          ctx.fillRect(x, top, bw, 40);
          ctx.fillStyle = '#0a0c11';
          ctx.fillRect(x + 4, top + 6, bw - 8, 18);
          ctx.fillStyle = '#6ae0ff';
          for (let sx = x + 6; sx < x + bw - 10; sx += 10) ctx.fillRect(sx, top + 8, 7, 5);
          glow(ctx, x + bw / 2, top + 15, bw * 0.6, '106,224,255', 0.2);
          truss(ctx, x + 6, top + 40, 8, base - top - 40, '#191d28', '#2c3345');
          truss(ctx, x + bw - 14, top + 40, 8, base - top - 40, '#191d28', '#2c3345');
          pixelText(ctx, 'CTRL', x + 6, top + 28, '#f2c230');
          x += bw + randInt(rng, 30, 70);
        }
      }
      vgrad(ctx, 0, 190, w, 80, [[0, 'rgba(90,36,24,0)'], [1, 'rgba(90,36,24,0.5)']]);
    },
    { palette: MID, dither: 10 },
  );
}

function near(scene: Phaser.Scene, level: LevelData) {
  const w = layerWidth(level.width, PARALLAX.near);
  const rng = mulberry32(42);
  makeTexture(
    scene,
    'factory_near',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = GROUND_Y + 10;
      let x = 0;
      while (x < w) {
        const kind = rng();
        const top = randInt(rng, 110, 150);
        if (kind < 0.25) {
          // parede de painéis com placas de aviso
          const bw = randInt(rng, 90, 150);
          vgrad(ctx, x, top, bw, base - top, [[0, '#29303e'], [1, '#161a23']]);
          for (let py = top; py < base; py += 22) {
            ctx.fillStyle = '#0f1118';
            ctx.fillRect(x, py, bw, 1);
            rivetRow(ctx, x + 3, py + 3, bw - 6, 10, '#5e6878', '#08090d');
          }
          hazard(ctx, x, top, bw, 5);
          const sign = pick(rng, ['PERIGO', 'ALTA TENSAO', 'AREA RESTRITA', 'LINHA 07']);
          ctx.fillStyle = '#f2c230';
          ctx.fillRect(x + 10, top + 16, sign.length * 8 + 6, 12);
          pixelText(ctx, sign, x + 13, top + 18, '#08090d');
        } else if (kind < 0.45) {
          // prateleira com crânios de robô
          const bw = randInt(rng, 60, 90);
          ctx.fillStyle = '#161a23';
          ctx.fillRect(x, top, bw, base - top);
          for (let sy = top + 14; sy < base - 8; sy += 22) {
            ctx.fillStyle = '#46505f';
            ctx.fillRect(x, sy, bw, 3);
            for (let sx = x + 4; sx < x + bw - 10; sx += 12) {
              ctx.fillStyle = '#7d8796';
              ctx.beginPath();
              ctx.arc(sx + 4, sy - 5, 5, Math.PI, 0);
              ctx.fill();
              ctx.fillRect(sx, sy - 5, 9, 4);
              ctx.fillStyle = rng() < 0.3 ? '#ff2a3a' : '#08090d';
              ctx.fillRect(sx + 5, sy - 6, 2, 2);
              ctx.fillStyle = '#c9ced6';
              ctx.fillRect(sx + 2, sy - 2, 5, 1);
            }
          }
        } else if (kind < 0.65) {
          // válvulas e canos
          const bw = randInt(rng, 60, 100);
          for (let i = 0; i < 3; i++) pipe(ctx, x + 6 + i * 14, top, base - top, 9, true, ['#5e6878', '#7d8796', '#1f2430']);
          pipe(ctx, x, top + 30, bw, 8, false, ['#5e6878', '#7d8796', '#1f2430']);
          for (let i = 0; i < 2; i++) {
            const vx = x + 14 + i * 28;
            ctx.fillStyle = '#c8401c';
            ctx.beginPath();
            ctx.arc(vx, top + 34, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#08090d';
            ctx.fillRect(vx - 6, top + 33, 12, 2);
            ctx.fillRect(vx - 1, top + 28, 2, 12);
          }
          ctx.fillStyle = '#6ae0ff';
          ctx.fillRect(x + bw - 16, top + 50, 10, 6);
          ctx.fillStyle = '#08090d';
          ctx.fillRect(x + bw - 11, top + 52, 1, 3);
        } else if (kind < 0.82) {
          // armários de servidor
          const bw = randInt(rng, 50, 80);
          for (let sx = x; sx < x + bw; sx += 18) {
            ctx.fillStyle = '#08090d';
            ctx.fillRect(sx, top + 10, 17, base - top - 10);
            ctx.fillStyle = '#1f2430';
            ctx.fillRect(sx + 1, top + 11, 15, base - top - 12);
            for (let ly = top + 16; ly < base - 6; ly += 4) {
              ctx.fillStyle = '#0f1118';
              ctx.fillRect(sx + 3, ly, 11, 2);
              if (rng() < 0.4) {
                ctx.fillStyle = pick(rng, ['#7aff6a', '#6ae0ff', '#ff2a3a', '#f2c230']);
                ctx.fillRect(sx + 3 + randInt(rng, 0, 9), ly, 1, 1);
              }
            }
          }
        } else {
          // vão escuro (deixa ver o fundo)
          x += randInt(rng, 40, 90);
          continue;
        }
        x += randInt(rng, 70, 140);
      }
      // cabos pendurados do teto
      for (let cx = 0; cx < w; cx += randInt(rng, 40, 90)) cable(ctx, cx, 0, cx + randInt(rng, 30, 80), 0, rand(rng, 30, 80), '#08090d');
    },
    { palette: NEAR, dither: 8 },
  );
}

// ============================================================= chão, estruturas, decoração

function groundTextures(scene: Phaser.Scene) {
  const rng = mulberry32(52);
  const W = 128;
  const H = GAME_HEIGHT - GROUND_Y;
  makeTexture(
    scene,
    'factory_ground',
    W,
    H,
    (ctx) => {
      // chapa xadrez (diamond plate)
      vgrad(ctx, 0, 0, W, 14, [[0, '#7d8796'], [1, '#46505f']]);
      ctx.fillStyle = '#a5aebb';
      for (let y = 2; y < 13; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 5) ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = '#d0d6de';
      ctx.fillRect(0, 0, W, 1);
      ctx.fillStyle = '#1f2430';
      for (let x = 0; x < W; x += 64) ctx.fillRect(x, 0, 1, 14);
      // faixa de perigo
      hazard(ctx, 0, 14, W, 5, 4);
      // estrutura inferior com vigas e parafusos
      vgrad(ctx, 0, 19, W, H - 19, [[0, '#29303e'], [1, '#0f1118']]);
      for (let x = 0; x < W; x += 32) {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(x, 19, 3, H - 19);
        ctx.fillStyle = '#46505f';
        ctx.fillRect(x + 3, 19, 1, H - 19);
      }
      ctx.strokeStyle = '#1f2430';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x + 4, 20);
        ctx.lineTo(x + 32, H);
        ctx.stroke();
      }
      rivetRow(ctx, 2, 22, W, 8, '#7d8796', '#07080c');
      // manchas de óleo
      for (let i = 0; i < 3; i++) {
        const ox = rand(rng, 8, W - 8);
        wrapX(W, (o) => {
          ctx.fillStyle = 'rgba(15,17,24,0.55)';
          ctx.beginPath();
          ctx.ellipse(ox + o, 7, rand(rng, 4, 9), 2, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    },
    { palette: PLAY, dither: 6 },
  );
  makeTexture(
    scene,
    'factory_ground_top',
    W,
    10,
    (ctx) => {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = pick(rng, ['#5e6878', '#3a2a1a', '#a5aebb']);
        ctx.fillRect(Math.floor(rng() * W), 8 + randInt(rng, 0, 1), randInt(rng, 1, 3), 1);
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'factory_edge',
    14,
    H + 10,
    (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 6, 8, H + 4);
      hazard(ctx, 1, 6, 6, H + 4, 3);
      ctx.fillStyle = '#ff7a2a';
      ctx.fillRect(7, 6, 1, H + 4);
    },
    { palette: PLAY, dither: 0 },
  );
  // metal derretido (buracos)
  makeTexture(
    scene,
    'factory_pit',
    64,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, 64, H, [[0, '#fff0b0'], [0.15, '#ffc860'], [0.4, '#e0501a'], [1, '#3a0a04']]);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = pick(rng, ['#ff8a2a', '#a82a0a', '#fff0b0']);
        ctx.beginPath();
        ctx.arc(rand(rng, 0, 64), rand(rng, 8, H), rand(rng, 1, 3), 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { palette: LAVA, dither: 16 },
  );
}

function decor(scene: Phaser.Scene) {
  const rng = mulberry32(62);
  const opts = { palette: PLAY, dither: 6 };
  makeTexture(scene, 'factory_decor_tank', 36, 62, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(2, 4, 32, 58);
    const g = ctx.createLinearGradient(3, 0, 33, 0);
    g.addColorStop(0, '#46505f');
    g.addColorStop(0.3, '#a5aebb');
    g.addColorStop(1, '#1f2430');
    ctx.fillStyle = g;
    ctx.fillRect(3, 5, 30, 56);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 10, 36, 3);
    ctx.fillRect(0, 50, 36, 3);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(8, 22, 20, 14);
    pixelText(ctx, '!', 14, 25, '#07080c');
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(28, 16, 2, 30);
    ctx.fillStyle = '#16a0c0';
    ctx.fillRect(28, 30, 2, 16);
  }, opts);
  makeTexture(scene, 'factory_decor_panel', 34, 34, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 8, 34, 26);
    ctx.fillStyle = '#29303e';
    ctx.fillRect(1, 9, 32, 24);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(2, 0, 30, 12);
    ctx.fillStyle = '#0f1118';
    ctx.fillRect(3, 1, 28, 10);
    ctx.fillStyle = '#6ae0ff';
    for (let x = 5; x < 29; x += 3) ctx.fillRect(x, 10 - randInt(rng, 1, 7), 2, 1);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = pick(rng, ['#ff2a3a', '#7aff6a', '#f2c230']);
      ctx.fillRect(4 + i * 5, 14, 3, 3);
    }
    ctx.fillStyle = '#46505f';
    ctx.fillRect(4, 22, 26, 6);
  }, opts);
  makeTexture(scene, 'factory_decor_pod', 28, 64, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, 28, 64);
    ctx.fillStyle = '#46505f';
    ctx.fillRect(1, 1, 26, 8);
    ctx.fillRect(1, 55, 26, 8);
    // tubo de vidro com fluido verde e um esqueleto dentro
    vgrad(ctx, 3, 9, 22, 46, [[0, '#3a4a2a'], [1, '#1f2430']]);
    ctx.fillStyle = 'rgba(122,255,106,0.35)';
    ctx.fillRect(3, 9, 22, 46);
    ctx.fillStyle = '#a5aebb';
    ctx.beginPath();
    ctx.arc(14, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(13, 22, 2, 18);
    for (let y = 25; y < 36; y += 3) ctx.fillRect(10, y, 8, 1);
    ctx.fillRect(10, 40, 2, 12);
    ctx.fillRect(16, 40, 2, 12);
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(15, 17, 2, 1);
    ctx.fillStyle = '#d0d6de';
    ctx.fillRect(5, 11, 1, 40);
    ctx.fillStyle = '#7aff6a';
    for (let i = 0; i < 5; i++) ctx.fillRect(randInt(rng, 5, 22), randInt(rng, 12, 52), 1, 1);
  }, opts);
  makeTexture(scene, 'factory_decor_spool', 30, 26, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.beginPath();
    ctx.arc(15, 13, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a4020';
    ctx.beginPath();
    ctx.arc(15, 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8401c';
    ctx.beginPath();
    ctx.arc(15, 13, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(15, 13, 3, 0, Math.PI * 2);
    ctx.fill();
  }, opts);
  makeTexture(scene, 'factory_decor_forklift', 40, 32, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(6, 8, 26, 18);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(7, 9, 24, 16);
    ctx.fillStyle = '#8a6a18';
    ctx.fillRect(7, 20, 24, 5);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(10, 0, 2, 10);
    ctx.fillRect(24, 0, 2, 10);
    ctx.fillRect(10, 0, 16, 2);
    ctx.fillRect(32, 2, 3, 26);
    ctx.fillRect(32, 26, 8, 2);
    for (const wx of [11, 27]) {
      ctx.fillStyle = '#07080c';
      ctx.beginPath();
      ctx.arc(wx, 27, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5e6878';
      ctx.fillRect(wx - 1, 26, 2, 2);
    }
  }, opts);
  makeTexture(scene, 'factory_decor_sign', 34, 44, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(15, 12, 4, 32);
    ctx.fillStyle = '#07080c';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(34, 26);
    ctx.lineTo(0, 26);
    ctx.fill();
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(17, 3);
    ctx.lineTo(31, 24);
    ctx.lineTo(3, 24);
    ctx.fill();
    ctx.fillStyle = '#07080c';
    ctx.fillRect(16, 9, 2, 8);
    ctx.fillRect(16, 19, 2, 2);
  }, opts);
  makeTexture(scene, 'factory_decor_parts', 52, 20, (ctx) => {
    // pilha de peças de robô descartadas
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = pick(rng, ['#7d8796', '#46505f', '#a5aebb']);
      const x = rand(rng, 2, 46);
      const y = rand(rng, 6, 16);
      ctx.fillRect(x, y, randInt(rng, 3, 9), 2);
    }
    ctx.fillStyle = '#a5aebb';
    ctx.beginPath();
    ctx.arc(26, 9, 5, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(28, 7, 2, 2);
  }, opts);
}

function foreground(scene: Phaser.Scene) {
  const rng = mulberry32(72);
  const opts = { palette: FG, dither: 0 };
  makeTexture(scene, 'factory_fg_chains', 60, 110, (ctx) => {
    for (const cx of [14, 38]) {
      const len = randInt(rng, 70, 100);
      for (let y = 0; y < len; y += 5) {
        ctx.strokeStyle = '#0e1016';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 2, y, 4, 6);
      }
      ctx.strokeStyle = '#171a22';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, len + 6, 6, 0, Math.PI);
      ctx.stroke();
    }
  }, opts);
  scene.textures.get('factory_fg_chains').customData = { hangs: true };
  makeTexture(scene, 'factory_fg_pipe', 180, 40, (ctx) => {
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 14, 180, 26);
    ctx.fillStyle = '#171a22';
    ctx.fillRect(0, 16, 180, 4);
    for (let x = 30; x < 180; x += 60) {
      ctx.fillStyle = '#040507';
      ctx.fillRect(x, 10, 10, 30);
    }
    ctx.fillStyle = '#ff7a2a';
    ctx.fillRect(0, 14, 180, 1);
  }, opts);
  makeTexture(scene, 'factory_fg_lamp', 40, 60, (ctx) => {
    ctx.fillStyle = '#08090d';
    ctx.fillRect(19, 0, 2, 40);
    ctx.beginPath();
    ctx.moveTo(8, 50);
    ctx.lineTo(14, 38);
    ctx.lineTo(26, 38);
    ctx.lineTo(32, 50);
    ctx.fill();
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(12, 50, 16, 2);
  }, opts);
  scene.textures.get('factory_fg_lamp').customData = { hangs: true };
}

function actors(scene: Phaser.Scene) {
  // engrenagem (gira como ator)
  for (const r of [26, 30, 34, 38, 40]) {
    const key = `factory_gear_${r}`;
    if (scene.textures.exists(key)) continue;
    makeTexture(
      scene,
      key,
      r * 2 + 8,
      r * 2 + 8,
      (ctx) => {
        const c = r + 4;
        const teeth = Math.round(r / 3);
        ctx.fillStyle = '#191d28';
        for (let i = 0; i < teeth; i++) {
          ctx.save();
          ctx.translate(c, c);
          ctx.rotate((i / teeth) * Math.PI * 2);
          ctx.fillRect(-3, -r - 4, 6, 8);
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3345';
        ctx.beginPath();
        ctx.arc(c, c, r - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#191d28';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(c + Math.cos(a) * r * 0.55, c + Math.sin(a) * r * 0.55, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#4c566c';
        ctx.beginPath();
        ctx.arc(c, c, 5, 0, Math.PI * 2);
        ctx.fill();
      },
      { palette: MID, dither: 0 },
    );
  }
  makeTexture(scene, 'factory_fan', 64, 64, (ctx) => {
    ctx.fillStyle = '#0e1118';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate((i / 4) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -15, 7, 15, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(32, 32, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  makeTexture(scene, 'factory_fan_ring', 72, 72, (ctx) => {
    ctx.strokeStyle = '#07080c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(36, 36, 33, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#262e3e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(36, 36, 31, 0, Math.PI * 2);
    ctx.stroke();
  });
  makeTexture(scene, 'factory_hook', 10, 20, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(4, 0, 2, 14);
    ctx.fillRect(2, 12, 6, 3);
    ctx.fillRect(6, 14, 2, 5);
  });
  makeTexture(scene, 'factory_crane', 70, 26, (ctx) => {
    ctx.fillStyle = '#0a0c11';
    ctx.fillRect(0, 0, 70, 12);
    hazard(ctx, 1, 1, 68, 4, 4);
    ctx.fillStyle = '#222836';
    ctx.fillRect(26, 12, 18, 10);
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(33, 14, 4, 2);
    ctx.fillStyle = '#0a0c11';
    ctx.fillRect(34, 22, 2, 4);
  });
  makeTexture(scene, 'factory_cargo', 40, 60, (ctx) => {
    ctx.fillStyle = '#0a0c11';
    ctx.fillRect(19, 0, 2, 26);
    ctx.fillRect(4, 24, 32, 36);
    ctx.fillStyle = '#5a2418';
    ctx.fillRect(5, 25, 30, 34);
    ctx.fillStyle = '#0a0c11';
    for (let x = 8; x < 34; x += 5) ctx.fillRect(x, 26, 1, 32);
  });
  makeTexture(scene, 'ember', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffc860';
    ctx.fillRect(0, 0, 2, 2);
  });
}

// ============================================================= tema

export const factoryTheme: Theme = {
  id: 'factory',
  menuLayers: ['factory_back', 'factory_far', 'factory_mid', 'factory_near'],
  ground: { fill: 'factory_ground', top: 'factory_ground_top', edge: 'factory_edge', pit: 'factory_pit' },
  pitGlow: 0xff6a20,

  generate(scene, level) {
    if (layouts.has(level.id) && scene.textures.exists('factory_near')) return;
    const layout: FactoryLayout = { railY: 56, craneY: 30, gears: [], welds: [], fans: [], furnaces: [] };
    layouts.set(level.id, layout);
    back(scene, layout);
    far(scene, level, layout);
    mid(scene, level, layout);
    near(scene, level);
    groundTextures(scene);
    decor(scene);
    foreground(scene);
    actors(scene);
  },

  ledge(scene, w) {
    const key = `factory_ledge_${w}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, w, 14, (ctx) => {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, w, 14);
        ctx.fillStyle = '#7d8796';
        ctx.fillRect(0, 1, w, 2);
        ctx.fillStyle = '#29303e';
        ctx.fillRect(1, 3, w - 2, 8);
        ctx.fillStyle = '#0f1118';
        for (let x = 2; x < w - 2; x += 4) ctx.fillRect(x, 4, 2, 6);
        hazard(ctx, 0, 11, w, 3, 3);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  pillar(scene, h) {
    const key = `factory_pillar_${h}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, 18, h, (ctx) => truss(ctx, 2, 0, 14, h, '#29303e', '#7d8796'), { palette: PLAY, dither: 0 });
    }
    return key;
  },

  block(scene, kind: BlockKind, w, h) {
    const key = `factory_block_${kind}_${w}x${h}`;
    if (scene.textures.exists(key)) return key;
    makeTexture(scene, key, w, h, (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, w, h);
      if (kind === 'server') {
        vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#343c4d'], [1, '#161a23']]);
        for (let y = 4; y < h - 3; y += 4) {
          ctx.fillStyle = '#0f1118';
          ctx.fillRect(3, y, w - 6, 2);
          ctx.fillStyle = y % 8 ? '#6ae0ff' : '#7aff6a';
          ctx.fillRect(4, y, 1, 1);
        }
      } else if (kind === 'container') {
        vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#c8401c'], [1, '#5a4020']]);
        ctx.fillStyle = '#5a4020';
        for (let x = 3; x < w - 2; x += 4) ctx.fillRect(x, 2, 1, h - 4);
        hazard(ctx, 1, h - 5, w - 2, 4, 3);
      } else {
        vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#5e6878'], [1, '#29303e']]);
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        ctx.beginPath();
        ctx.moveTo(3, h - 3);
        ctx.lineTo(w - 3, 3);
        ctx.stroke();
        hazard(ctx, 1, 1, w - 2, 3, 3);
      }
    }, { palette: PLAY, dither: 4 });
    return key;
  },

  mover(scene, w) {
    const key = `factory_mover_${w}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, w, 12, (ctx) => {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, w, 12);
        ctx.fillStyle = '#5e6878';
        ctx.fillRect(1, 1, w - 2, 3);
        ctx.fillStyle = '#a5aebb';
        ctx.fillRect(1, 1, w - 2, 1);
        ctx.fillStyle = '#29303e';
        ctx.fillRect(1, 4, w - 2, 6);
        hazard(ctx, 1, 9, w - 2, 2, 2);
        ctx.fillStyle = '#ff7a2a';
        ctx.fillRect(2, 5, 2, 2);
        ctx.fillRect(w - 4, 5, 2, 2);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  crumble(scene, w) {
    const key = `factory_crumble_${w}`;
    if (!scene.textures.exists(key)) {
      const rng = mulberry32(w);
      makeTexture(scene, key, w, 12, (ctx) => {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, w, 12);
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(1, 1, w - 2, 10);
        ctx.fillStyle = '#3a2a1a';
        for (let x = 2; x < w - 2; x += 4) ctx.fillRect(x, 2, 2, 8);
        ctx.fillStyle = '#c8401c';
        for (let i = 0; i < w / 6; i++) ctx.fillRect(randInt(rng, 1, w - 2), randInt(rng, 1, 10), 1, 1);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  background(gs, level) {
    const layout = layouts.get(level.id)!;
    gs.add.image(0, 0, 'factory_back').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);

    // Ventiladores gigantes na parede do fundo, com luz passando
    layout.fans.forEach((f) => {
      gs.add.image(f.x, f.y, 'factory_fan_ring').setScrollFactor(0).setDepth(DEPTH.sky + 0.1);
      const fan = gs.add.image(f.x, f.y, 'factory_fan').setScrollFactor(0).setDepth(DEPTH.sky + 0.2);
      gs.tweens.add({ targets: fan, angle: 360, duration: 2400, repeat: -1 });
      const light = gs.add.image(f.x, f.y, 'eye_glow').setScale(5).setTint(0xffd08a).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setDepth(DEPTH.sky + 0.15);
      gs.tweens.add({ targets: light, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1 });
    });

    addLayer(gs, 'factory_far', PARALLAX.far, DEPTH.far);

    // Linha de montagem: esqueletos pendurados passando no trilho
    const f = PARALLAX.far;
    const span = GAME_WIDTH + 110;
    const hangBody = (offset = 0) => {
      const cam = gs.cameras.main;
      const x0 = cam.scrollX * f - 30 + offset;
      const hook = gs.add.image(x0, layout.railY, 'factory_hook').setOrigin(0.5, 0).setScrollFactor(f).setDepth(DEPTH.farActors);
      const body = gs.add
        .image(x0, layout.railY + 40, 'bot_soldier', 0)
        .setTint(0x3a4256)
        .setScale(0.8)
        .setScrollFactor(f)
        .setDepth(DEPTH.farActors);
      gs.tweens.add({
        targets: [hook, body],
        x: x0 - offset + span,
        duration: ((span - offset) / span) * 16000,
        onUpdate: () => {
          body.x = hook.x;
          body.angle = Math.sin(gs.time.now / 400 + hook.x) * 3;
        },
        onComplete: () => {
          hook.destroy();
          body.destroy();
        },
      });
    };
    for (let i = 0; i < 6; i++) hangBody(i * (span / 6));
    gs.time.addEvent({ delay: 16000 / 6, loop: true, callback: () => hangBody() });

    addLayer(gs, 'factory_mid', PARALLAX.mid, DEPTH.mid);

    // Engrenagens girando
    layout.gears.forEach((g, i) => {
      const r = [26, 30, 34, 38, 40].reduce((a, b) => (Math.abs(b - g.r) < Math.abs(a - g.r) ? b : a));
      const gear = gs.add.image(g.x, g.y, `factory_gear_${r}`).setScrollFactor(PARALLAX.mid).setDepth(DEPTH.midActors);
      gs.tweens.add({ targets: gear, angle: i % 2 ? -360 : 360, duration: 6000 + r * 60, repeat: -1 });
    });
    // Fornalhas pulsando
    layout.furnaces.forEach((fu) => {
      const g = gs.add.image(fu.x, fu.y, 'eye_glow').setScale(8, 5).setTint(0xff7a2a).setScrollFactor(PARALLAX.mid).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.midActors);
      gs.tweens.add({ targets: g, alpha: { from: 0.4, to: 0.9 }, duration: Phaser.Math.Between(500, 900), yoyo: true, repeat: -1 });
    });
    // Ponte rolante indo e voltando com carga
    const crane = gs.add.image(100, layout.craneY, 'factory_crane').setOrigin(0.5, 0).setScrollFactor(PARALLAX.mid).setDepth(DEPTH.midActors);
    const cargo = gs.add.image(100, layout.craneY + 22, 'factory_cargo').setOrigin(0.5, 0).setScrollFactor(PARALLAX.mid).setDepth(DEPTH.midActors);
    onUpdate(gs, () => {
      const cx = gs.cameras.main.scrollX * PARALLAX.mid + GAME_WIDTH / 2 + Math.sin(gs.time.now / 3000) * 200;
      crane.x = cx;
      cargo.x = cx;
      cargo.angle = Math.cos(gs.time.now / 3000) * 4;
    });
    // Faíscas de solda
    gs.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const w = pick(Math.random, layout.welds);
        if (!w) return;
        const sp = gs.add
          .particles(w.x, w.y, 'ember', {
            speed: { min: 40, max: 120 },
            angle: { min: 200, max: 340 },
            gravityY: 300,
            lifespan: 500,
            scale: { start: 1, end: 0 },
            tint: [0xffffff, 0xffd08a, 0x6ae0ff],
            emitting: false,
          })
          .setScrollFactor(PARALLAX.mid)
          .setDepth(DEPTH.midActors);
        sp.explode(10);
        const flash = gs.add.image(w.x, w.y, 'eye_glow').setScale(2).setTint(0xaaf0ff).setScrollFactor(PARALLAX.mid).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.midActors);
        gs.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
        gs.time.delayedCall(700, () => sp.destroy());
      },
    });

    addLayer(gs, 'factory_near', PARALLAX.near, DEPTH.near);
  },

  ambience(gs) {
    // Fagulhas subindo do metal derretido e poeira no ar
    gs.add
      .particles(0, 0, 'ember', {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 4,
        speedY: { min: -60, max: -25 },
        speedX: { min: -10, max: 10 },
        lifespan: 4500,
        alpha: { start: 1, end: 0 },
        scale: { start: 1, end: 0.3 },
        frequency: 140,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);
    gs.add
      .particles(0, 0, 'mote', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 20, max: 200 },
        lifespan: 5000,
        speedX: { min: -5, max: 5 },
        speedY: { min: 2, max: 8 },
        alpha: { start: 0.35, end: 0 },
        frequency: 260,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);
    // Luz quente do chão (reflexo da fornalha)
    const warm = gs.add.rectangle(0, GROUND_Y - 80, GAME_WIDTH, 80, 0xff7a2a, 0.06).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.near + 0.5).setBlendMode(Phaser.BlendModes.ADD);
    gs.tweens.add({ targets: warm, alpha: { from: 0.04, to: 0.1 }, duration: 800, yoyo: true, repeat: -1 });
    // Luz do teto piscando de vez em quando
    const dark = gs.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.near + 0.6);
    const flicker = () => {
      gs.tweens.add({ targets: dark, fillAlpha: 0.35, duration: 40, yoyo: true, repeat: 2 });
      gs.time.delayedCall(Phaser.Math.Between(4000, 9000), flicker);
    };
    gs.time.delayedCall(3000, flicker);
  },
};
