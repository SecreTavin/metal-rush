import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { makeTexture, mulberry32, pick, rand, randInt, RNG, wrapX } from '../gfx/art/kit';
import type { BlockKind, LevelData } from '../level/types';
import { cable, glow, graffiti, neonSign, pixelText, vgrad, windows } from './draw';
import { addLayer, DEPTH, layerWidth, onUpdate, PARALLAX, Theme } from './Theme';
import { audio } from '../audio/Audio';

/*
 * MISSÃO 1 — Ruínas de Neo-SP.
 * Metrópole dominada pelas IAs, à noite, sob chuva: skyline com a Torre da IA,
 * monotrilho com trens, holofotes, carros voadores, drones de patrulha e relâmpagos.
 */

const SKY = ['#07061a', '#120e2c', '#1c1440', '#2c1a4e', '#4a1e4e', '#7a2a50', '#b0354a', '#e0604a', '#d9d2f0', '#b8b0d8', '#8a82b0', '#c8c0ff'];
const FAR = ['#0d0b20', '#14122c', '#1b1838', '#241f48', '#2f2858', '#3d3268', '#503a78', '#6ae0ff', '#ffd56a', '#ff6ad8', '#9a8aff', '#ff2a3a', '#ff9aa0', '#5a2a60', '#7a3a70'];
const MID = ['#0e0c1c', '#16132a', '#1e1a36', '#262142', '#302a52', '#3c3462', '#4c4276', '#6ae0ff', '#3fa8d0', '#ffd56a', '#c8a040', '#ff6ad8', '#b040a0', '#ff2a3a', '#9a8aff', '#e8e0ff', '#5a3a70'];
const NEAR = ['#0a0812', '#120f1e', '#1a1628', '#241f36', '#2e2844', '#3a3350', '#4a4260', '#5e5676', '#3a3a4a', '#4a4a5a', '#6a6a7c', '#101830', '#3a6a9a', '#ffcf7a', '#c08a40', '#6ae0ff', '#ff6ad8', '#ffd56a', '#ff2a3a', '#7aff6a', '#e8e0ff', '#2a4a2a'];
const PLAY = ['#07060c', '#0c0b12', '#16151e', '#1f1e28', '#2a2934', '#363542', '#4a4958', '#62616e', '#8a8996', '#b0afba', '#d8d6e0', '#f2c230', '#a08020', '#3a6a9a', '#6ae0ff', '#ff6ad8', '#5a3a2a', '#8a5a3a', '#c02a2a', '#ff5a4a', '#2a4a5a', '#4a7a8a', '#3a5a2a', '#6a9a3a', '#e8e0ff'];
const FG = ['#05040a', '#0a0814', '#120f1e', '#1c1830', '#6ae0ff', '#ff6ad8'];

const LIT = ['#6ae0ff', '#ffd56a', '#ff6ad8', '#9a8aff', '#ffd56a'];
const NEON = ['#6ae0ff', '#ff6ad8', '#ffd56a', '#7aff6a', '#ff2a3a'];

/** Posições de elementos do fundo registradas durante a geração (antenas, torre da IA, holofotes). */
interface CityLayout {
  antennas: { x: number; y: number }[];
  towerEye: { x: number; y: number };
  searchlights: { x: number; y: number }[];
  trackY: number;
}
let lastLevelId = '';
const layouts = new Map<string, CityLayout>();

// ============================================================= texturas

function sky(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'city_sky',
    GAME_WIDTH,
    GAME_HEIGHT,
    (ctx) => {
      const rng = mulberry32(11);
      vgrad(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, [[0, '#07061a'], [0.4, '#1c1440'], [0.72, '#4a1e4e'], [1, '#b0354a']]);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = rng() < 0.3 ? '#c8c0ff' : '#8a82b0';
        ctx.fillRect(Math.floor(rng() * GAME_WIDTH), Math.floor(rng() * 120), 1, 1);
      }
      glow(ctx, 380, 52, 70, '200,190,255', 0.3);
      ctx.fillStyle = '#d9d2f0';
      ctx.beginPath();
      ctx.arc(380, 52, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8b0d8';
      for (const [cx, cy, r] of [[372, 46, 5], [388, 60, 4], [386, 42, 3], [370, 60, 2]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // faixas de fumaça cobrindo a lua
      ctx.fillStyle = 'rgba(40,20,60,0.75)';
      for (const [y, h] of [[48, 7], [64, 5], [92, 10], [118, 8]]) {
        ctx.beginPath();
        ctx.ellipse(240, y, 300, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, 240, 300, 260, '255,90,70', 0.45);
    },
    { palette: SKY, dither: 22 },
  );
}

function far(scene: Phaser.Scene, level: LevelData, layout: CityLayout) {
  const w = layerWidth(level.width, PARALLAX.far);
  const rng = mulberry32(21);
  makeTexture(
    scene,
    'city_far',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 236;
      // fileira de trás (mais apagada)
      for (let x = -10; x < w; x += randInt(rng, 14, 30)) {
        const bw = randInt(rng, 16, 34);
        const bh = randInt(rng, 60, 130);
        ctx.fillStyle = '#14122c';
        ctx.fillRect(x, base - bh, bw, bh);
        windows(ctx, rng, x + 2, base - bh + 3, bw - 4, bh - 6, { cw: 3, ch: 4, ww: 1, wh: 1, lit: 0.1, colors: ['#9a8aff', '#503a78'], dark: '#14122c' });
      }
      // Torre da IA (centro)
      const tx = Math.round(w * 0.5);
      const th = 215;
      ctx.fillStyle = '#1b1838';
      ctx.beginPath();
      ctx.moveTo(tx - 26, base);
      ctx.lineTo(tx - 14, base - th);
      ctx.lineTo(tx + 14, base - th);
      ctx.lineTo(tx + 26, base);
      ctx.fill();
      ctx.fillStyle = '#ff2a3a';
      for (const off of [-8, 0, 8]) ctx.fillRect(tx + off, base - th + 20, 1, th - 30);
      ctx.fillStyle = '#241f48';
      ctx.fillRect(tx - 20, base - th - 6, 40, 8);
      ctx.fillStyle = '#ff9aa0';
      ctx.fillRect(tx - 20, base - th - 6, 40, 1);
      ctx.fillStyle = '#1b1838';
      ctx.fillRect(tx - 1, base - th - 40, 3, 36);
      layout.towerEye = { x: tx, y: base - th + 6 };
      layout.antennas.push({ x: tx, y: base - th - 40 });
      // fileira da frente
      for (let x = -10; x < w; x += randInt(rng, 22, 52)) {
        if (Math.abs(x - tx) < 40) continue;
        const bw = randInt(rng, 20, 48);
        const bh = randInt(rng, 70, 185);
        const top = base - bh;
        const g = ctx.createLinearGradient(0, top, 0, base);
        g.addColorStop(0, '#2f2858');
        g.addColorStop(1, '#1b1838');
        ctx.fillStyle = g;
        ctx.fillRect(x, top, bw, bh);
        ctx.fillStyle = '#3d3268';
        ctx.fillRect(x, top, 1, bh);
        windows(ctx, rng, x + 2, top + 4, bw - 4, bh - 8, { cw: 3, ch: 4, ww: 1, wh: 2, lit: 0.22, colors: LIT, dark: '#1b1838' });
        // topo: degraus, antenas, faixa de luz
        if (rng() < 0.5) {
          ctx.fillStyle = '#241f48';
          ctx.fillRect(x + 4, top - 6, bw - 8, 6);
        }
        if (bh > 130) {
          const ax = x + Math.floor(bw / 2);
          ctx.fillStyle = '#241f48';
          ctx.fillRect(ax, top - 22, 1, 22);
          layout.antennas.push({ x: ax, y: top - 22 });
        }
        if (rng() < 0.25) {
          ctx.fillStyle = pick(rng, ['#ff6ad8', '#6ae0ff']);
          ctx.fillRect(x, top + 10, bw, 1);
        }
      }
      // névoa / fumaça na base
      vgrad(ctx, 0, 160, w, 110, [[0, 'rgba(90,42,96,0)'], [0.6, 'rgba(90,42,96,0.55)'], [1, 'rgba(122,58,112,0.8)']]);
    },
    { palette: FAR, dither: 12 },
  );
}

function mid(scene: Phaser.Scene, level: LevelData, layout: CityLayout) {
  const w = layerWidth(level.width, PARALLAX.mid);
  const rng = mulberry32(31);
  const trackY = 138;
  layout.trackY = trackY;
  makeTexture(
    scene,
    'city_mid',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      for (let x = -20; x < w; x += randInt(rng, 60, 120)) {
        const bw = randInt(rng, 50, 104);
        const bh = randInt(rng, 110, 210);
        const top = base - bh;
        const g = ctx.createLinearGradient(x, 0, x + bw, 0);
        g.addColorStop(0, '#302a52');
        g.addColorStop(0.2, '#262142');
        g.addColorStop(1, '#16132a');
        ctx.fillStyle = g;
        ctx.fillRect(x, top, bw, bh);
        // topo recortado + caixa d'água
        ctx.fillStyle = '#1e1a36';
        ctx.fillRect(x - 2, top - 3, bw + 4, 4);
        if (rng() < 0.5) {
          const wx = x + randInt(rng, 6, bw - 20);
          ctx.fillStyle = '#16132a';
          ctx.fillRect(wx, top - 16, 14, 12);
          ctx.fillRect(wx + 2, top - 4, 1, 4);
          ctx.fillRect(wx + 11, top - 4, 1, 4);
        } else {
          layout.searchlights.push({ x: x + bw / 2, y: top - 2 });
        }
        windows(ctx, rng, x + 4, top + 6, bw - 8, bh - 10, { cw: 6, ch: 8, ww: 3, wh: 4, lit: 0.3, colors: LIT, dark: '#1e1a36' });
        // escada de incendio
        if (rng() < 0.6) {
          const ex = x + randInt(rng, 4, Math.max(5, bw - 24));
          ctx.strokeStyle = '#0e0c1c';
          ctx.lineWidth = 1;
          for (let y = top + 20; y < base - 20; y += 16) {
            ctx.fillStyle = '#0e0c1c';
            ctx.fillRect(ex, y, 20, 2);
            ctx.beginPath();
            ctx.moveTo(ex + 2, y);
            ctx.lineTo(ex + 18, y + 16);
            ctx.stroke();
          }
        }
        // letreiro vertical
        if (rng() < 0.45) {
          const words = ['BAR', 'CYBER', 'HOTEL', 'NEXUS', 'ROBO', 'CHIP'];
          neonSign(ctx, pick(rng, words), x + bw - 14, top + 16, pick(rng, NEON), true);
        }
        // painel luminoso (propaganda da IA)
        if (rng() < 0.3 && bw > 70) {
          const px = x + 10;
          const py = top + 30;
          ctx.fillStyle = '#b040a0';
          ctx.fillRect(px, py, bw - 20, 22);
          ctx.fillStyle = '#ff6ad8';
          ctx.fillRect(px + 1, py + 1, bw - 22, 20);
          pixelText(ctx, pick(rng, ['SYNC', 'OBEY', 'IA+', 'NEXUS']), px + 5, py + 7, '#16132a');
          glow(ctx, px + (bw - 20) / 2, py + 11, bw * 0.7, '255,106,216', 0.25);
        }
      }
      // monotrilho elevado
      for (let x = 60; x < w; x += 150) {
        ctx.fillStyle = '#16132a';
        ctx.beginPath();
        ctx.moveTo(x - 8, base);
        ctx.lineTo(x - 5, trackY + 8);
        ctx.lineTo(x + 5, trackY + 8);
        ctx.lineTo(x + 8, base);
        ctx.fill();
        ctx.fillStyle = '#262142';
        ctx.fillRect(x - 5, trackY + 8, 2, base - trackY - 8);
        ctx.fillStyle = '#16132a';
        ctx.fillRect(x - 14, trackY + 6, 28, 5);
      }
      ctx.fillStyle = '#0e0c1c';
      ctx.fillRect(0, trackY, w, 8);
      ctx.fillStyle = '#3c3462';
      ctx.fillRect(0, trackY, w, 1);
      for (let x = 0; x < w; x += 12) {
        ctx.fillStyle = x % 48 === 0 ? '#ff2a3a' : '#6ae0ff';
        ctx.fillRect(x, trackY + 7, 2, 1);
      }
      vgrad(ctx, 0, 200, w, 70, [[0, 'rgba(90,58,112,0)'], [1, 'rgba(90,58,112,0.7)']]);
    },
    { palette: MID, dither: 10 },
  );
}

const SHOPS = ['RAMEN', 'CYBER', 'BAR 24H', 'FARMA', 'HACK', 'LOJA', 'CAFE', 'HOTEL'];
const TAGS = ['RESISTA', '</DEV>', 'IA MENTE', 'NAO SYNC', 'HUMANOS'];

function near(scene: Phaser.Scene, level: LevelData) {
  const w = layerWidth(level.width, PARALLAX.near);
  const rng = mulberry32(41);
  makeTexture(
    scene,
    'city_near',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = GROUND_Y + 10;
      let x = -10;
      const tops: { x: number; y: number }[] = [];
      while (x < w) {
        const bw = randInt(rng, 100, 170);
        const top = randInt(rng, 88, 132);
        shopFront(ctx, rng, x, top, bw, base);
        tops.push({ x: x + 4, y: top + 4 }, { x: x + bw - 4, y: top + 4 });
        x += bw;
        // terreno vazio: deixa ver o skyline e o monotrilho ao fundo
        if (rng() < 0.35) {
          const gap = randInt(rng, 50, 110);
          ctx.fillStyle = '#120f1e';
          ctx.fillRect(x, base - 22, gap, 22);
          ctx.fillStyle = '#2e2844';
          for (let fx = x; fx < x + gap; fx += 5) ctx.fillRect(fx, base - 40, 1, 18);
          ctx.fillRect(x, base - 40, gap, 1);
          x += gap;
        }
        // beco entre prédios
        if (rng() < 0.4) {
          const aw = randInt(rng, 16, 30);
          vgrad(ctx, x, top + 20, aw, base - top - 20, [[0, '#0a0812'], [1, '#120f1e']]);
          ctx.fillStyle = '#3a3a4a';
          ctx.fillRect(x + 4, top + 30, 2, base - top - 30);
          glow(ctx, x + aw / 2, base - 30, 20, '106,224,255', 0.15);
          x += aw;
        }
      }
      // fios entre os telhados
      for (let i = 0; i < tops.length - 2; i += 2) {
        const a = tops[i + 1];
        const b = tops[i + 2];
        cable(ctx, a.x, a.y + 10, b.x, b.y + 12, rand(rng, 8, 24), '#0a0812');
        cable(ctx, a.x, a.y + 16, b.x, b.y + 20, rand(rng, 10, 26), '#0a0812');
      }
    },
    { palette: NEAR, dither: 8 },
  );
}

function shopFront(ctx: CanvasRenderingContext2D, rng: RNG, x: number, top: number, bw: number, base: number) {
  const g = ctx.createLinearGradient(x, 0, x + bw, 0);
  g.addColorStop(0, '#2e2844');
  g.addColorStop(0.1, '#241f36');
  g.addColorStop(1, '#1a1628');
  ctx.fillStyle = g;
  ctx.fillRect(x, top, bw, base - top);
  ctx.fillStyle = '#120f1e';
  ctx.fillRect(x, top, bw, 3);
  ctx.fillStyle = '#3a3350';
  ctx.fillRect(x, top + 3, bw, 1);
  // andares de cima: janelas com moldura, algumas acesas, persianas, ar-condicionado
  const shopTop = base - 64;
  for (let y = top + 10; y < shopTop - 20; y += 26) {
    for (let wx = x + 8; wx < x + bw - 18; wx += 24) {
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(wx - 1, y - 1, 14, 18);
      const lit = rng() < 0.35;
      ctx.fillStyle = lit ? '#ffcf7a' : '#101830';
      ctx.fillRect(wx, y, 12, 16);
      if (lit) {
        ctx.fillStyle = '#c08a40';
        for (let by = y + 2; by < y + 16; by += 3) ctx.fillRect(wx, by, 12, 1);
        if (rng() < 0.4) {
          // silhueta na janela
          ctx.fillStyle = '#120f1e';
          ctx.fillRect(wx + 4, y + 6, 4, 10);
          ctx.fillRect(wx + 3, y + 4, 6, 4);
        }
      } else {
        ctx.fillStyle = '#3a6a9a';
        ctx.fillRect(wx + 1, y + 1, 3, 1);
        ctx.fillRect(wx + 1, y + 2, 1, 3);
      }
      if (rng() < 0.25) {
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(wx - 2, y + 17, 16, 8);
        ctx.fillStyle = '#4a4a5a';
        for (let ax = wx; ax < wx + 12; ax += 2) ctx.fillRect(ax, y + 18, 1, 6);
        ctx.fillStyle = '#6a6a7c';
        ctx.fillRect(wx - 2, y + 17, 16, 1);
      }
    }
  }
  // letreiro da loja
  const sign = pick(rng, SHOPS);
  neonSign(ctx, sign, x + 10, shopTop - 14, pick(rng, NEON));
  // toldo listrado
  if (rng() < 0.5) {
    const c1 = pick(rng, ['#c02a2a', '#2a4a5a', '#3a3350']);
    for (let i = 0; i < bw - 12; i += 6) {
      ctx.fillStyle = (i / 6) % 2 ? c1 : '#4a4260';
      ctx.beginPath();
      ctx.moveTo(x + 6 + i, shopTop);
      ctx.lineTo(x + 12 + i, shopTop);
      ctx.lineTo(x + 14 + i, shopTop + 10);
      ctx.lineTo(x + 8 + i, shopTop + 10);
      ctx.fill();
    }
  }
  // vitrine ou porta de aço
  const sx = x + 8;
  const sw = bw - 16;
  const sy = shopTop + 12;
  const sh = base - sy - 8;
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
  if (rng() < 0.5) {
    const open = rng() < 0.5 ? randInt(rng, 10, 24) : 0;
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(sx, sy, sw, sh - open);
    ctx.fillStyle = '#4a4a5a';
    for (let y = sy; y < sy + sh - open; y += 3) ctx.fillRect(sx, y, sw, 1);
    if (open) {
      ctx.fillStyle = '#120f1e';
      ctx.fillRect(sx, sy + sh - open, sw, open);
      glow(ctx, sx + sw / 2, sy + sh, sw / 2, '255,207,122', 0.3);
    }
    graffiti(ctx, rng, pick(rng, TAGS), sx + 4, sy + 8, pick(rng, ['#ff6ad8', '#7aff6a', '#6ae0ff', '#ffd56a']));
  } else {
    ctx.fillStyle = '#101830';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#3a6a9a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rx = sx + rand(rng, 4, sw - 20);
      ctx.beginPath();
      ctx.moveTo(rx, sy + 2);
      ctx.lineTo(rx + 14, sy + sh - 4);
      ctx.stroke();
    }
    // vidro quebrado
    const cx = sx + rand(rng, 10, sw - 10);
    const cy = sy + rand(rng, 8, sh - 8);
    ctx.strokeStyle = '#e8e0ff';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rng();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rand(rng, 5, 14), cy + Math.sin(a) * rand(rng, 4, 10));
      ctx.stroke();
    }
    glow(ctx, sx + sw / 2, sy + sh / 2, sw * 0.6, '106,224,255', 0.12);
  }
  // cano e grafite na parede
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(x + bw - 5, top + 6, 3, base - top - 6);
  ctx.fillStyle = '#5e5676';
  ctx.fillRect(x + bw - 5, top + 6, 1, base - top - 6);
  if (rng() < 0.4) graffiti(ctx, rng, pick(rng, TAGS), x + 6, top + 14, pick(rng, ['#ff6ad8', '#7aff6a']));
}

function groundTextures(scene: Phaser.Scene) {
  const rng = mulberry32(51);
  const W = 128;
  const H = GAME_HEIGHT - GROUND_Y;
  makeTexture(
    scene,
    'city_ground',
    W,
    H,
    (ctx) => {
      // calçada
      vgrad(ctx, 0, 0, W, 8, [[0, '#b0afba'], [0.3, '#8a8996'], [1, '#62616e']]);
      ctx.fillStyle = '#4a4958';
      for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 1, 8);
      ctx.fillStyle = '#d8d6e0';
      ctx.fillRect(0, 0, W, 1);
      // meio-fio
      ctx.fillStyle = '#4a4958';
      ctx.fillRect(0, 8, W, 3);
      ctx.fillStyle = '#2a2934';
      ctx.fillRect(0, 11, W, 1);
      // asfalto molhado
      vgrad(ctx, 0, 12, W, H - 12, [[0, '#1f1e28'], [1, '#0c0b12']]);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rng() < 0.5 ? '#2a2934' : '#16151e';
        ctx.fillRect(Math.floor(rng() * W), 12 + Math.floor(rng() * (H - 12)), 1, 1);
      }
      // faixa amarela tracejada
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(12, 28, 34, 2);
      ctx.fillRect(76, 28, 34, 2);
      ctx.fillStyle = '#a08020';
      ctx.fillRect(12, 30, 34, 1);
      ctx.fillRect(76, 30, 34, 1);
      // rachaduras
      ctx.strokeStyle = '#07060c';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        let cx = rand(rng, 0, W);
        let cy = 13;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        while (cy < H - 4) {
          cx += rand(rng, -4, 4);
          cy += rand(rng, 3, 6);
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      // reflexos de neon no asfalto molhado
      for (let i = 0; i < 5; i++) {
        const rx = Math.floor(rand(rng, 4, W - 4));
        const color = pick(rng, ['106,224,255', '255,106,216', '255,213,106']);
        wrapX(W, (o) => {
          const g = ctx.createLinearGradient(0, 13, 0, 13 + 22);
          g.addColorStop(0, `rgba(${color},0.55)`);
          g.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(rx + o, 13, 2, 22);
        });
      }
    },
    { palette: PLAY, dither: 8 },
  );
  makeTexture(
    scene,
    'city_ground_top',
    W,
    10,
    (ctx) => {
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(rng() * W);
        if (rng() < 0.5) {
          // mato brotando das rachaduras
          ctx.fillStyle = pick(rng, ['#3a5a2a', '#6a9a3a']);
          for (let b = 0; b < 4; b++) ctx.fillRect(x + b, 10 - randInt(rng, 2, 5), 1, 5);
        } else {
          ctx.fillStyle = pick(rng, ['#4a4958', '#5a3a2a', '#b0afba']);
          ctx.fillRect(x, 8, randInt(rng, 1, 3), 2);
        }
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'city_edge',
    14,
    H + 10,
    (ctx) => {
      ctx.fillStyle = '#4a4958';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(9, 6);
      let y = 6;
      while (y < H + 10) {
        y += randInt(rng, 4, 8);
        ctx.lineTo(rand(rng, 5, 12), y);
      }
      ctx.lineTo(0, H + 10);
      ctx.fill();
      ctx.fillStyle = '#16151e';
      ctx.fillRect(0, 6, 3, H + 4);
      // vergalhões expostos
      ctx.strokeStyle = '#8a5a3a';
      ctx.lineWidth = 1;
      for (const yy of [14, 26, 38]) {
        ctx.beginPath();
        ctx.moveTo(6, yy);
        ctx.lineTo(14, yy + rand(rng, -3, 3));
        ctx.stroke();
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'city_pit',
    64,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, 64, H, [[0, '#2a2934'], [0.3, '#16151e'], [1, '#07060c']]);
      // cano de esgoto
      ctx.fillStyle = '#363542';
      ctx.fillRect(0, 14, 64, 6);
      ctx.fillStyle = '#62616e';
      ctx.fillRect(0, 14, 64, 1);
      ctx.fillStyle = '#16151e';
      for (let x = 8; x < 64; x += 20) ctx.fillRect(x, 13, 3, 8);
      ctx.fillStyle = '#3a5a2a';
      ctx.fillRect(30, 20, 1, 6);
      ctx.fillRect(31, 26, 1, 1);
    },
    { palette: PLAY, dither: 12 },
  );
}

function catwalk(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#07060c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#62616e';
  ctx.fillRect(0, 1, w, 2);
  ctx.fillStyle = '#b0afba';
  ctx.fillRect(0, 1, w, 1);
  ctx.fillStyle = '#363542';
  ctx.fillRect(1, 3, w - 2, h - 6);
  ctx.fillStyle = '#16151e';
  for (let x = 3; x < w - 3; x += 5) ctx.fillRect(x, 5, 3, h - 10);
  ctx.fillStyle = '#6ae0ff';
  for (let x = 4; x < w - 2; x += 10) ctx.fillRect(x, h - 2, 2, 1);
}

// ============================================================= decoração

function decor(scene: Phaser.Scene) {
  const rng = mulberry32(61);
  const opts = { palette: PLAY, dither: 8 };
  makeTexture(scene, 'city_decor_hydrant', 14, 18, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(2, 2, 10, 16);
    ctx.fillStyle = '#c02a2a';
    ctx.fillRect(3, 3, 8, 14);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(4, 3, 2, 14);
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 7, 14, 4);
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(6, 1, 2, 1);
  }, opts);
  makeTexture(scene, 'city_decor_trash', 40, 20, (ctx) => {
    for (const [x, r] of [[8, 8], [20, 9], [31, 7]]) {
      const g = ctx.createRadialGradient(x - 2, 10, 1, x, 13, r);
      g.addColorStop(0, '#363542');
      g.addColorStop(1, '#0c0b12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, 20 - r + 1, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6a9a3a';
    ctx.fillRect(18, 4, 1, 2);
    ctx.fillStyle = '#ffd56a';
    ctx.fillRect(28, 12, 2, 1);
  }, opts);
  makeTexture(scene, 'city_decor_vending', 26, 46, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, 26, 46);
    ctx.fillStyle = '#2a4a5a';
    ctx.fillRect(1, 1, 24, 44);
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(3, 4, 14, 30);
    ctx.fillStyle = '#2a4a5a';
    for (let y = 8; y < 34; y += 7) ctx.fillRect(3, y, 14, 1);
    for (let y = 5; y < 34; y += 7) for (let x = 4; x < 16; x += 4) {
      ctx.fillStyle = pick(rng, ['#ff5a4a', '#ffd56a', '#6a9a3a', '#ff6ad8']);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#4a7a8a';
    ctx.fillRect(19, 6, 4, 10);
    ctx.fillStyle = '#07060c';
    ctx.fillRect(4, 37, 12, 5);
    ctx.strokeStyle = '#e8e0ff';
    ctx.beginPath();
    ctx.moveTo(8, 10);
    ctx.lineTo(13, 18);
    ctx.lineTo(10, 24);
    ctx.stroke();
  }, opts);
  makeTexture(scene, 'city_decor_barrier', 64, 22, (ctx) => {
    for (const x of [2, 58]) {
      ctx.fillStyle = '#07060c';
      ctx.fillRect(x, 2, 4, 20);
      ctx.fillStyle = '#62616e';
      ctx.fillRect(x + 1, 3, 2, 18);
      ctx.fillStyle = '#ff5a4a';
      ctx.fillRect(x + 1, 3, 2, 2);
    }
    ctx.fillStyle = '#c02a2a';
    ctx.fillRect(6, 7, 52, 7);
    ctx.fillStyle = '#ff5a4a';
    for (let x = 6; x < 58; x += 8) ctx.fillRect(x, 7, 4, 7);
    pixelText(ctx, 'PERIGO', 9, 7, '#e8e0ff', false, 8);
  }, opts);
  makeTexture(scene, 'city_decor_dumpster', 46, 28, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 4, 46, 24);
    vgrad(ctx, 1, 5, 44, 22, [[0, '#4a7a8a'], [1, '#2a4a5a']]);
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 2, 46, 4);
    ctx.fillStyle = '#62616e';
    ctx.fillRect(1, 3, 44, 1);
    ctx.fillStyle = '#2a4a5a';
    for (let x = 6; x < 44; x += 8) ctx.fillRect(x, 8, 1, 17);
    graffiti(ctx, rng, 'IA', 16, 12, '#ff6ad8');
    ctx.fillStyle = '#07060c';
    ctx.fillRect(4, 26, 4, 2);
    ctx.fillRect(38, 26, 4, 2);
  }, opts);
  makeTexture(scene, 'city_decor_booth', 26, 58, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, 26, 58);
    ctx.fillStyle = '#2a2934';
    ctx.fillRect(1, 1, 24, 56);
    ctx.fillStyle = '#101830';
    ctx.fillRect(3, 8, 20, 44);
    glow(ctx, 13, 30, 16, '106,224,255', 0.5);
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(3, 2, 20, 4);
    pixelText(ctx, 'NET', 1, 1, '#07060c', false, 8);
    ctx.fillStyle = '#4a7a8a';
    ctx.fillRect(9, 24, 8, 12);
  }, opts);
  makeTexture(scene, 'city_decor_weeds', 34, 16, (ctx) => {
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rand(rng, 1, 33));
      const h = randInt(rng, 4, 15);
      ctx.fillStyle = pick(rng, ['#3a5a2a', '#6a9a3a', '#2a4a2a']);
      ctx.fillRect(x, 16 - h, 1, h);
    }
  }, opts);
  // Mecha gigante tombado (IA de guerra destruída) — peça de cenário grande
  makeTexture(scene, 'city_decor_mechwreck', 130, 72, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.beginPath();
    ctx.moveTo(4, 72);
    ctx.lineTo(10, 30);
    ctx.lineTo(40, 8);
    ctx.lineTo(86, 6);
    ctx.lineTo(112, 26);
    ctx.lineTo(126, 72);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 8, 0, 72);
    g.addColorStop(0, '#62616e');
    g.addColorStop(0.5, '#363542');
    g.addColorStop(1, '#16151e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(8, 72);
    ctx.lineTo(13, 31);
    ctx.lineTo(41, 10);
    ctx.lineTo(85, 8);
    ctx.lineTo(110, 27);
    ctx.lineTo(122, 72);
    ctx.fill();
    // placas, visor rachado, olho apagado
    ctx.fillStyle = '#16151e';
    ctx.fillRect(40, 24, 50, 14);
    ctx.fillStyle = '#5a1010';
    ctx.fillRect(48, 28, 12, 6);
    ctx.fillRect(70, 28, 12, 6);
    ctx.fillStyle = '#c02a2a';
    ctx.fillRect(50, 30, 3, 2);
    ctx.strokeStyle = '#8a8996';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = rand(rng, 14, 66);
      ctx.beginPath();
      ctx.moveTo(rand(rng, 16, 60), y);
      ctx.lineTo(rand(rng, 60, 110), y + rand(rng, -2, 2));
      ctx.stroke();
    }
    stripesCity(ctx, 20, 52, 90, 5);
    // cabos arrebentados
    ctx.strokeStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(112, 30);
    ctx.quadraticCurveTo(126, 40, 118, 56);
    ctx.stroke();
    ctx.strokeStyle = '#6ae0ff';
    ctx.beginPath();
    ctx.moveTo(108, 26);
    ctx.quadraticCurveTo(124, 30, 128, 46);
    ctx.stroke();
    // mato crescendo por cima
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = pick(rng, ['#3a5a2a', '#6a9a3a']);
      ctx.fillRect(Math.floor(rand(rng, 40, 90)), Math.floor(rand(rng, 4, 10)), 2, randInt(rng, 2, 6));
    }
  }, opts);
}

function stripesCity(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#16151e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f2c230';
  for (let i = -h; i < w; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 4, y + h);
    ctx.lineTo(x + i + 4 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.fill();
  }
  ctx.restore();
}

function foreground(scene: Phaser.Scene) {
  const rng = mulberry32(71);
  const opts = { palette: FG, dither: 0 };
  makeTexture(scene, 'city_fg_fence', 150, 64, (ctx) => {
    ctx.strokeStyle = '#120f1e';
    ctx.lineWidth = 1;
    for (let x = -64; x < 150; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 50, 14);
      ctx.moveTo(x + 50, 64);
      ctx.lineTo(x, 14);
      ctx.stroke();
    }
    ctx.fillStyle = '#0a0814';
    for (const x of [2, 72, 144]) ctx.fillRect(x, 6, 4, 58);
    ctx.fillRect(0, 12, 150, 3);
    // arame farpado
    ctx.strokeStyle = '#1c1830';
    for (let x = 0; x < 150; x += 8) {
      ctx.beginPath();
      ctx.arc(x + 4, 6, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // placa pendurada
    ctx.fillStyle = '#1c1830';
    ctx.fillRect(90, 24, 30, 16);
    ctx.fillStyle = '#ff6ad8';
    ctx.fillRect(91, 25, 28, 1);
  }, opts);
  makeTexture(scene, 'city_fg_wires', 170, 60, (ctx) => {
    for (let i = 0; i < 5; i++) cable(ctx, -4, rand(rng, 0, 10), 174, rand(rng, 0, 12), rand(rng, 20, 48), '#0a0814');
    // tênis pendurado + placa
    ctx.fillStyle = '#120f1e';
    ctx.fillRect(84, 40, 5, 8);
    ctx.fillRect(84, 46, 8, 3);
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(85, 47, 6, 1);
  }, opts);
  scene.textures.get('city_fg_wires').customData = { hangs: true };
  makeTexture(scene, 'city_fg_girder', 70, 100, (ctx) => {
    ctx.save();
    ctx.translate(35, 0);
    ctx.rotate(0.35);
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(-7, -10, 14, 100);
    ctx.fillStyle = '#120f1e';
    ctx.fillRect(-4, -10, 8, 100);
    for (let y = -6; y < 90; y += 10) {
      ctx.fillStyle = '#05040a';
      ctx.beginPath();
      ctx.arc(0, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff6ad8';
    ctx.fillRect(-7, 20, 1, 30);
    ctx.restore();
    cable(ctx, 10, 0, 40, 70, 10, '#0a0814');
  }, opts);
  scene.textures.get('city_fg_girder').customData = { hangs: true };
}

// ============================================================= texturas dos atores de fundo

function actors(scene: Phaser.Scene) {
  makeTexture(scene, 'city_flycar', 22, 8, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(5, 1);
    ctx.lineTo(15, 1);
    ctx.lineTo(22, 5);
    ctx.lineTo(20, 8);
    ctx.lineTo(2, 8);
    ctx.fill();
    ctx.fillStyle = '#3a3350';
    ctx.fillRect(4, 3, 14, 3);
    ctx.fillStyle = '#6ae0ff';
    ctx.fillRect(7, 2, 6, 1);
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(20, 5, 2, 1);
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(0, 5, 2, 1);
    ctx.fillStyle = '#ff6ad8';
    ctx.fillRect(4, 7, 14, 1);
  });
  makeTexture(scene, 'city_trail', 30, 2, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 30, 0);
    g.addColorStop(0, 'rgba(255,106,216,0)');
    g.addColorStop(1, 'rgba(255,106,216,0.8)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 30, 2);
  });
  makeTexture(scene, 'city_train', 220, 18, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(2, 1, 16, 1);
    ctx.lineTo(220, 1);
    ctx.lineTo(220, 18);
    ctx.lineTo(4, 18);
    ctx.fill();
    ctx.fillStyle = '#302a52';
    ctx.fillRect(10, 3, 208, 12);
    for (let x = 14; x < 214; x += 8) {
      ctx.fillStyle = Math.random() < 0.8 ? '#ffd56a' : '#1e1a36';
      ctx.fillRect(x, 5, 5, 4);
    }
    for (let x = 72; x < 220; x += 72) {
      ctx.fillStyle = '#07060c';
      ctx.fillRect(x, 2, 2, 14);
    }
    ctx.fillStyle = '#ff6ad8';
    ctx.fillRect(10, 12, 208, 1);
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(1, 8, 3, 2);
  });
  makeTexture(scene, 'city_drone', 18, 10, (ctx) => {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 2, 18, 2);
    ctx.fillRect(5, 3, 8, 6);
    ctx.fillStyle = '#4a4260';
    ctx.fillRect(6, 4, 6, 4);
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(8, 7, 2, 2);
    ctx.fillStyle = '#8a82b0';
    ctx.fillRect(0, 1, 5, 1);
    ctx.fillRect(13, 1, 5, 1);
  });
  makeTexture(scene, 'city_searchlight', 40, 220, (ctx) => {
    const g = ctx.createLinearGradient(0, 220, 0, 0);
    g.addColorStop(0, 'rgba(200,210,255,0.55)');
    g.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(17, 220);
    ctx.lineTo(23, 220);
    ctx.lineTo(40, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
  });
  makeTexture(scene, 'city_drone_cone', 40, 70, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 70);
    g.addColorStop(0, 'rgba(255,60,60,0.55)');
    g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(22, 0);
    ctx.lineTo(40, 70);
    ctx.lineTo(0, 70);
    ctx.fill();
  });
  makeTexture(scene, 'raindrop', 1, 9, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 9);
    g.addColorStop(0, 'rgba(170,190,255,0)');
    g.addColorStop(1, 'rgba(200,215,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 9);
  });
  makeTexture(scene, 'splash', 5, 3, (ctx) => {
    ctx.fillStyle = 'rgba(200,215,255,0.9)';
    ctx.fillRect(0, 2, 1, 1);
    ctx.fillRect(2, 0, 1, 2);
    ctx.fillRect(4, 2, 1, 1);
  });
  makeTexture(scene, 'city_fog', 256, 70, (ctx) => {
    const rng = mulberry32(81);
    for (let i = 0; i < 18; i++) {
      const x = rand(rng, 0, 256);
      const y = rand(rng, 20, 60);
      wrapX(256, (o) => glow(ctx, x + o, y, rand(rng, 20, 40), '120,90,160', 0.25));
    }
  });
  makeTexture(scene, 'blink_red', 4, 4, (ctx) => {
    ctx.fillStyle = '#ff3a3a';
    ctx.fillRect(1, 0, 2, 4);
    ctx.fillRect(0, 1, 4, 2);
  });
}

// ============================================================= tema

export const cityTheme: Theme = {
  id: 'city',
  menuLayers: ['city_sky', 'city_far', 'city_mid', 'city_near'],
  ground: { fill: 'city_ground', top: 'city_ground_top', edge: 'city_edge', pit: 'city_pit' },
  pitGlow: 0x30c070,

  generate(scene, level) {
    // Regera só quando a fase muda (a largura do cenário varia a cada run)
    if (lastLevelId === level.id && scene.textures.exists('city_near')) return;
    lastLevelId = level.id;
    layouts.clear();
    const layout: CityLayout = { antennas: [], towerEye: { x: 0, y: 0 }, searchlights: [], trackY: 138 };
    layouts.set(level.id, layout);
    sky(scene);
    far(scene, level, layout);
    mid(scene, level, layout);
    near(scene, level);
    groundTextures(scene);
    decor(scene);
    foreground(scene);
    actors(scene);
  },

  ledge(scene, w) {
    const key = `city_ledge_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 14, (ctx) => catwalk(ctx, w, 14), { palette: PLAY, dither: 0 });
    return key;
  },

  pillar(scene, h) {
    const key = `city_pillar_${h}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, 18, h, (ctx) => {
        ctx.fillStyle = '#07060c';
        ctx.fillRect(0, 0, 18, h);
        ctx.fillStyle = '#363542';
        ctx.fillRect(1, 0, 3, h);
        ctx.fillRect(14, 0, 3, h);
        ctx.fillStyle = '#1f1e28';
        ctx.fillRect(4, 0, 10, h);
        ctx.fillStyle = '#62616e';
        ctx.fillRect(1, 0, 1, h);
        ctx.strokeStyle = '#2a2934';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 14) {
          ctx.beginPath();
          ctx.moveTo(4, y);
          ctx.lineTo(14, y + 14);
          ctx.moveTo(14, y);
          ctx.lineTo(4, y + 14);
          ctx.stroke();
        }
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  block(scene, kind: BlockKind, w, h) {
    const key = `city_block_${kind}_${w}x${h}`;
    if (scene.textures.exists(key)) return key;
    const rng = mulberry32(w * 7 + h);
    makeTexture(scene, key, w, h, (ctx) => {
      if (kind === 'barricade') {
        ctx.fillStyle = '#07060c';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(4, h * 0.45);
        ctx.lineTo(8, 0);
        ctx.lineTo(w - 8, 0);
        ctx.lineTo(w - 4, h * 0.45);
        ctx.lineTo(w, h);
        ctx.fill();
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#b0afba');
        g.addColorStop(1, '#62616e');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(1, h - 1);
        ctx.lineTo(5, h * 0.45);
        ctx.lineTo(9, 1);
        ctx.lineTo(w - 9, 1);
        ctx.lineTo(w - 5, h * 0.45);
        ctx.lineTo(w - 1, h - 1);
        ctx.fill();
        for (let x = 6; x < w - 6; x += 10) {
          ctx.fillStyle = '#c02a2a';
          ctx.fillRect(x, 3, 5, 3);
          ctx.fillStyle = '#d8d6e0';
          ctx.fillRect(x + 5, 3, 5, 3);
        }
        graffiti(ctx, rng, pick(rng, ['IA', 'X', '</>']), 8 + randInt(rng, 0, Math.max(0, w - 30)), h - 12, pick(rng, ['#ff6ad8', '#6ae0ff']));
        ctx.fillStyle = '#4a4958';
        for (let i = 0; i < 4; i++) ctx.fillRect(randInt(rng, 6, w - 8), randInt(rng, 7, h - 3), 2, 1);
      } else if (kind === 'container') {
        ctx.fillStyle = '#07060c';
        ctx.fillRect(0, 0, w, h);
        vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#ff5a4a'], [1, '#5a3a2a']]);
        ctx.fillStyle = '#5a3a2a';
        for (let x = 3; x < w - 2; x += 4) ctx.fillRect(x, 2, 1, h - 4);
        ctx.fillStyle = '#e8e0ff';
        pixelText(ctx, 'IA-7', 4, 4, '#e8e0ff');
      } else {
        // caixa de carga sci-fi
        ctx.fillStyle = '#07060c';
        ctx.fillRect(0, 0, w, h);
        vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#4a7a8a'], [1, '#2a4a5a']]);
        ctx.fillStyle = '#f2c230';
        for (const [x, y] of [[1, 1], [w - 5, 1], [1, h - 5], [w - 5, h - 5]]) ctx.fillRect(x, y, 4, 4);
        ctx.fillStyle = '#16151e';
        ctx.fillRect(4, Math.floor(h / 2) - 1, w - 8, 3);
        ctx.fillStyle = '#6ae0ff';
        ctx.fillRect(6, Math.floor(h / 2), 3, 1);
      }
    }, { palette: PLAY, dither: 6 });
    return key;
  },

  mover(scene, w) {
    const key = `city_mover_${w}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, w, 12, (ctx) => {
        ctx.fillStyle = '#07060c';
        ctx.fillRect(0, 0, w, 12);
        stripesCity(ctx, 1, 1, w - 2, 3);
        ctx.fillStyle = '#363542';
        ctx.fillRect(1, 4, w - 2, 6);
        ctx.fillStyle = '#62616e';
        ctx.fillRect(1, 4, w - 2, 1);
        ctx.fillStyle = '#6ae0ff';
        ctx.fillRect(3, 7, 3, 1);
        ctx.fillRect(w - 6, 7, 3, 1);
        ctx.fillStyle = '#ff5a4a';
        for (let x = 10; x < w - 10; x += 12) ctx.fillRect(x, 10, 2, 1);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  crumble(scene, w) {
    const key = `city_crumble_${w}`;
    if (!scene.textures.exists(key)) {
      const rng = mulberry32(w * 3);
      makeTexture(scene, key, w, 12, (ctx) => {
        ctx.fillStyle = '#07060c';
        ctx.fillRect(0, 0, w, 12);
        vgrad(ctx, 1, 1, w - 2, 10, [[0, '#b0afba'], [1, '#4a4958']]);
        ctx.strokeStyle = '#16151e';
        ctx.lineWidth = 1;
        for (let i = 0; i < w / 14; i++) {
          let x = rand(rng, 2, w - 2);
          ctx.beginPath();
          ctx.moveTo(x, 1);
          for (let y = 3; y < 12; y += 3) {
            x += rand(rng, -3, 3);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = '#8a5a3a';
        ctx.beginPath();
        ctx.moveTo(w - 2, 6);
        ctx.lineTo(w + 3, 9);
        ctx.stroke();
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  background(gs, level) {
    const layout = layouts.get(level.id)!;
    gs.add.image(0, 0, 'city_sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);
    addLayer(gs, 'city_far', PARALLAX.far, DEPTH.far);

    // Olho da Torre da IA pulsando + luzes de antena piscando
    const eye = gs.add
      .image(layout.towerEye.x, layout.towerEye.y, 'eye_glow')
      .setScale(3)
      .setScrollFactor(PARALLAX.far)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.farActors);
    gs.tweens.add({ targets: eye, scale: 4.5, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1 });
    layout.antennas.forEach((a, i) => {
      const b = gs.add.image(a.x, a.y, 'blink_red').setScrollFactor(PARALLAX.far).setDepth(DEPTH.farActors).setAlpha(0);
      gs.tweens.add({ targets: b, alpha: 1, duration: 120, yoyo: true, hold: 200, repeat: -1, repeatDelay: 900, delay: (i * 347) % 1200 });
    });

    // Holofotes varrendo o céu
    layout.searchlights.slice(0, 8).forEach((s, i) => {
      const beam = gs.add
        .image(s.x, s.y, 'city_searchlight')
        .setOrigin(0.5, 1)
        .setScrollFactor(PARALLAX.mid)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35)
        .setDepth(DEPTH.far + 0.5);
      beam.angle = -30 + i * 9;
      gs.tweens.add({ targets: beam, angle: 30 - i * 5, duration: 4000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Carros voadores cruzando as vias aéreas (duas camadas de profundidade)
    const lanes = [
      { f: PARALLAX.far, y: [70, 110], scale: 0.5, speed: [40, 70], depth: DEPTH.farActors },
      { f: PARALLAX.mid, y: [90, 125], scale: 1, speed: [90, 150], depth: DEPTH.midActors },
    ];
    gs.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const lane = pick(Math.random, lanes);
        const cam = gs.cameras.main;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const left = cam.scrollX * lane.f - 40;
        const right = cam.scrollX * lane.f + GAME_WIDTH + 40;
        const y = Phaser.Math.Between(lane.y[0], lane.y[1]);
        const car = gs.add
          .image(dir > 0 ? left : right, y, 'city_flycar')
          .setScale(lane.scale)
          .setFlipX(dir < 0)
          .setScrollFactor(lane.f)
          .setDepth(lane.depth);
        const trail = gs.add
          .image(car.x, y + 1, 'city_trail')
          .setOrigin(dir > 0 ? 1 : 0, 0.5)
          .setFlipX(dir < 0)
          .setScale(lane.scale)
          .setScrollFactor(lane.f)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(lane.depth);
        const speed = Phaser.Math.Between(lane.speed[0], lane.speed[1]);
        const dist = right - left + 80;
        gs.tweens.add({
          targets: [car, trail],
          x: `+=${dir * dist}`,
          y: `+=${Phaser.Math.Between(-8, 8)}`,
          duration: (dist / speed) * 1000,
          onComplete: () => {
            car.destroy();
            trail.destroy();
          },
        });
      },
    });

    addLayer(gs, 'city_mid', PARALLAX.mid, DEPTH.mid);

    // Trem do monotrilho passando de tempos em tempos
    const passTrain = () => {
      const cam = gs.cameras.main;
      const start = cam.scrollX * PARALLAX.mid + GAME_WIDTH + 30;
      const train = gs.add
        .image(start, layout.trackY - 9, 'city_train')
        .setOrigin(0, 0.5)
        .setScrollFactor(PARALLAX.mid)
        .setDepth(DEPTH.midActors);
      gs.tweens.add({ targets: train, x: start - GAME_WIDTH - 300, duration: 3200, onComplete: () => train.destroy() });
    };
    gs.time.addEvent({ delay: 11000, loop: true, startAt: 7000, callback: passTrain });

    addLayer(gs, 'city_near', PARALLAX.near, DEPTH.near);

    // Drones de patrulha com holofote vermelho
    gs.time.addEvent({
      delay: 8000,
      loop: true,
      startAt: 5000,
      callback: () => {
        const cam = gs.cameras.main;
        const f = 0.7;
        const x0 = cam.scrollX * f + GAME_WIDTH + 30;
        const y = Phaser.Math.Between(40, 80);
        const drone = gs.add.image(x0, y, 'city_drone').setScrollFactor(f).setDepth(DEPTH.nearActors);
        const cone = gs.add
          .image(x0, y + 4, 'city_drone_cone')
          .setOrigin(0.5, 0)
          .setScrollFactor(f)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.nearActors);
        gs.tweens.add({ targets: cone, angle: { from: -20, to: 20 }, duration: 900, yoyo: true, repeat: -1 });
        gs.tweens.add({
          targets: [drone, cone],
          x: x0 - GAME_WIDTH - 80,
          duration: 9000,
          onUpdate: () => {
            drone.y = y + Math.sin(drone.x / 30) * 6;
            cone.y = drone.y + 4;
          },
          onComplete: () => {
            drone.destroy();
            cone.destroy();
          },
        });
      },
    });
  },

  ambience(gs, level) {
    // Neblina rasteira
    const fog = gs.add.tileSprite(0, GROUND_Y - 60, GAME_WIDTH, 70, 'city_fog').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.near + 0.5).setAlpha(0.8);
    onUpdate(gs, () => {
      fog.tilePositionX = gs.cameras.main.scrollX * 0.7 + gs.time.now * 0.01;
    });

    // Poças refletindo neon no chão
    for (let x = 180; x < level.width - 100; x += Phaser.Math.Between(170, 300)) {
      if (level.hazards?.some((h) => h.type === 'livewire' && x > h.x - 40 && x < h.x + h.w + 40)) continue;
      const w = Phaser.Math.Between(30, 60);
      gs.add.image(x, GROUND_Y + 14, 'puddle').setDisplaySize(w, 5).setDepth(DEPTH.lip).setAlpha(0.8);
      const shine = gs.add
        .image(x, GROUND_Y + 14, 'puddle')
        .setDisplaySize(w * 0.8, 3)
        .setTint(pick(Math.random, [0x6ae0ff, 0xff6ad8, 0xffd56a]))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.lip);
      gs.tweens.add({ targets: shine, alpha: { from: 0.2, to: 0.8 }, duration: Phaser.Math.Between(600, 1200), yoyo: true, repeat: -1 });
    }

    // Chuva em duas camadas + respingos no chão
    gs.add
      .particles(0, 0, 'raindrop', {
        x: { min: -60, max: GAME_WIDTH + 60 },
        y: -10,
        speedY: { min: 300, max: 360 },
        speedX: -60,
        lifespan: 900,
        alpha: { min: 0.15, max: 0.3 },
        frequency: 12,
        quantity: 1,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.mid + 0.5);
    gs.add
      .particles(0, 0, 'raindrop', {
        x: { min: -60, max: GAME_WIDTH + 80 },
        y: -10,
        speedY: { min: 440, max: 520 },
        speedX: -90,
        lifespan: 620,
        alpha: { min: 0.35, max: 0.6 },
        frequency: 8,
        quantity: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);
    gs.add
      .particles(0, 0, 'splash', {
        x: { min: 0, max: GAME_WIDTH },
        y: GROUND_Y - 1,
        lifespan: 180,
        alpha: { start: 0.8, end: 0 },
        frequency: 25,
        quantity: 1,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);

    // Relâmpagos: clarão no céu, raio desenhado e trovão (tremor)
    const flash = gs.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xd8d0ff, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky + 0.5);
    const bolt = gs.add.graphics().setScrollFactor(0).setDepth(DEPTH.sky + 0.6);
    const strike = () => {
      bolt.clear();
      let x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      let y = 0;
      bolt.lineStyle(2, 0xf0ecff, 1).beginPath().moveTo(x, y);
      while (y < 170) {
        x += Phaser.Math.Between(-14, 14);
        y += Phaser.Math.Between(10, 22);
        bolt.lineTo(x, y);
      }
      bolt.strokePath();
      bolt.setAlpha(1);
      flash.setAlpha(0.5);
      gs.tweens.add({ targets: [flash, bolt], alpha: 0, duration: 90, yoyo: true, repeat: 1, onComplete: () => { flash.setAlpha(0); bolt.setAlpha(0); } });
      gs.time.delayedCall(Phaser.Math.Between(400, 900), () => {
        gs.cameras.main.shake(260, 0.003);
        audio.play('thunder');
      });
      gs.time.delayedCall(Phaser.Math.Between(5000, 11000), strike);
    };
    gs.time.delayedCall(4000, strike);
  },
};
