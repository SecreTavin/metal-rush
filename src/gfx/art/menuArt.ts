import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { makeTexture, mulberry32, RNG } from './kit';

/*
 * Arte da tela inicial: céu, silhuetas da cidade, telhado, olho da IA, logo e efeitos.
 * Tudo desenhado em canvas na primeira vez que o menu abre.
 */

export const LOGO = { w: 250, h: 92, lineGap: 36, font: 32 };
/** Posição do "M" dentro da textura do logo (para o brilho de joia). */
export const LOGO_M = { x: 4, y: 4, size: 32 };
export const EYE_R = 58;
export const ROOF_Y = 222;
export const ROOF_X = 246;

const FONT = '"Press Start 2P"';

/** Alfa binário: o texto do canvas fica com borda de pixel, sem serrilhado borrado. */
function hardAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
}

function skyline(ctx: CanvasRenderingContext2D, rng: RNG, baseY: number, body: string, windows: string[], hMin: number, hMax: number, wMin: number, wMax: number, lit: number) {
  let x = -10;
  while (x < GAME_WIDTH + 10) {
    const w = Math.floor(wMin + rng() * (wMax - wMin));
    const h = Math.floor(hMin + rng() * (hMax - hMin));
    ctx.fillStyle = body;
    ctx.fillRect(x, baseY - h, w, GAME_HEIGHT);
    if (rng() < 0.3) {
      ctx.fillRect(x + Math.floor(w / 2), baseY - h - 10, 1, 10);
      ctx.fillStyle = '#ff3a5a';
      ctx.fillRect(x + Math.floor(w / 2), baseY - h - 11, 1, 1);
    }
    for (let wy = baseY - h + 4; wy < GAME_HEIGHT; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        if (rng() < lit) {
          ctx.fillStyle = windows[Math.floor(rng() * windows.length)];
          ctx.fillRect(wx, wy, 2, 3);
        }
      }
    }
    x += w + Math.floor(rng() * 5);
  }
}

export function generateMenuArt(scene: Phaser.Scene) {
  if (scene.textures.exists('menu_logo')) return;
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;

  // ---- céu
  makeTexture(scene, 'menu_sky', W, H, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07051a');
    g.addColorStop(0.6, '#1c0f3a');
    g.addColorStop(1, '#4a1440');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const rng = mulberry32(11);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${[0.35, 0.55, 0.85][Math.floor(rng() * 3)]})`;
      ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * 150), 1, 1);
    }
  });

  // ---- cidade (duas camadas)
  makeTexture(scene, 'menu_far', W, H, (ctx) => {
    skyline(ctx, mulberry32(1), 200, '#140c2a', ['#3a2a6a', '#5a3a8a'], 60, 120, 18, 34, 0.18);
  });
  makeTexture(scene, 'menu_near', W, H, (ctx) => {
    skyline(ctx, mulberry32(2), 215, '#0e0920', ['rgba(255,207,58,0.45)', 'rgba(89,194,244,0.45)', 'rgba(255,90,255,0.35)'], 30, 80, 24, 44, 0.05);
  });

  // ---- telhado onde o herói está
  makeTexture(scene, 'menu_roof', W - ROOF_X, H - ROOF_Y + 22, (ctx) => {
    const top = 22;
    ctx.fillStyle = '#0a0716';
    ctx.fillRect(0, top, W, H);
    ctx.fillStyle = '#2a2050';
    ctx.fillRect(0, top, W, 3);
    ctx.fillStyle = 'rgba(89,194,244,0.7)';
    ctx.fillRect(0, top, W, 1);
    // exaustor do ar-condicionado
    ctx.fillStyle = '#120e24';
    ctx.fillRect(196, top - 18, 30, 18);
    ctx.strokeStyle = '#2a2050';
    ctx.strokeRect(196.5, top - 17.5, 29, 17);
    for (let x = 200; x < 224; x += 4) ctx.fillRect(x, top - 14, 1, 10);
    // grade de proteção
    ctx.fillStyle = '#1a1432';
    for (let x = 4; x < W; x += 14) ctx.fillRect(x, top - 10, 1, 10);
    ctx.fillRect(0, top - 10, W, 1);
  });

  // ---- olho da IA
  const S = EYE_R * 2 + 60;
  const c = S / 2;
  makeTexture(scene, 'menu_eye', S, S, (ctx) => {
    // linhas de circuito
    const rng = mulberry32(5);
    ctx.strokeStyle = 'rgba(255,58,90,0.65)';
    ctx.fillStyle = '#ff8a9a';
    for (let a = 0; a < 360; a += 24) {
      const r = (a * Math.PI) / 180;
      const r0 = EYE_R + 3;
      const r1 = EYE_R + 10 + rng() * 16;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(r) * r0, c + Math.sin(r) * r0);
      ctx.lineTo(c + Math.cos(r) * r1, c + Math.sin(r) * r1);
      ctx.stroke();
      ctx.fillRect(Math.round(c + Math.cos(r) * r1) - 1, Math.round(c + Math.sin(r) * r1) - 1, 3, 3);
    }
    // globo
    ctx.fillStyle = '#2a0614';
    ctx.beginPath();
    ctx.arc(c, c, EYE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff3a5a';
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const [r, col] of [[EYE_R - 10, '#b01a38'], [EYE_R - 20, '#ff6a7a'], [EYE_R - 30, '#6a0a22']] as const) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // marcas de escaneamento no anel
    ctx.fillStyle = '#ff3a5a';
    for (let a = 0; a < 360; a += 15) {
      const r = (a * Math.PI) / 180;
      ctx.fillRect(Math.round(c + Math.cos(r) * (EYE_R - 5)), Math.round(c + Math.sin(r) * (EYE_R - 5)), 2, 2);
    }
  });
  makeTexture(scene, 'menu_iris', 44, 44, (ctx) => {
    const g = ctx.createRadialGradient(22, 22, 4, 22, 22, 22);
    g.addColorStop(0, '#ff8a9a');
    g.addColorStop(0.6, '#ff2a4a');
    g.addColorStop(1, '#8a0a24');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(22, 22, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd0d8';
    ctx.beginPath();
    ctx.arc(22, 22, 16, 0, Math.PI * 2);
    ctx.stroke();
  });
  makeTexture(scene, 'menu_pupil', 20, 20, (ctx) => {
    ctx.fillStyle = '#12000a';
    ctx.beginPath();
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd0d8';
    ctx.fillRect(4, 4, 3, 3);
  });
  makeTexture(scene, 'menu_eye_glow', 240, 240, (ctx) => {
    const g = ctx.createRadialGradient(120, 120, 20, 120, 120, 120);
    g.addColorStop(0, 'rgba(255,40,70,0.55)');
    g.addColorStop(0.5, 'rgba(255,40,70,0.22)');
    g.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 240, 240);
  });

  // ---- logo (duas linhas, dourado metálico com contorno grosso)
  const drawLogo = (ctx: CanvasRenderingContext2D, fill: 'full' | 'm') => {
    ctx.font = `${LOGO.font}px ${FONT}`;
    ctx.textBaseline = 'top';
    const lines: [string, number, number][] = [
      ['METAL', 4, 4],
      ['RUSH', 52, 4 + LOGO.lineGap],
    ];
    if (fill === 'm') {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('M', LOGO_M.x, LOGO_M.y);
      return;
    }
    for (const [t, x, y] of lines) {
      ctx.fillStyle = '#2a0608';
      for (let dx = -4; dx <= 4; dx++) for (let dy = -3; dy <= 6; dy++) ctx.fillText(t, x + dx, y + dy);
      ctx.fillStyle = '#8b1e10';
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) ctx.fillText(t, x + dx, y + dy);
    }
    for (const [t, x, y] of lines) {
      const g = ctx.createLinearGradient(0, y, 0, y + LOGO.font);
      g.addColorStop(0, '#fff6b0');
      g.addColorStop(0.44, '#ffcf3a');
      g.addColorStop(0.45, '#ff9a2a');
      g.addColorStop(0.56, '#ffb03a');
      g.addColorStop(1, '#d8501a');
      ctx.fillStyle = g;
      ctx.fillText(t, x, y);
    }
  };
  makeTexture(scene, 'menu_logo', LOGO.w, LOGO.h, (ctx) => {
    drawLogo(ctx, 'full');
    hardAlpha(ctx, LOGO.w, LOGO.h);
    // brilho branco no topo de cada letra
    const img = ctx.getImageData(0, 0, LOGO.w, LOGO.h);
    const d = img.data;
    const at = (x: number, y: number) => (y * LOGO.w + x) * 4;
    for (let y = 2; y < LOGO.h; y++) {
      for (let x = 0; x < LOGO.w; x++) {
        const i = at(x, y);
        const above = at(x, y - 3);
        const gold = d[i] > 240 && d[i + 1] > 180 && d[i + 2] < 190;
        const edge = d[above] < 200;
        if (gold && edge && d[i + 3]) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 240;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  makeTexture(scene, 'menu_logo_m', LOGO.w, LOGO.h, (ctx) => {
    drawLogo(ctx, 'm');
    hardAlpha(ctx, LOGO.w, LOGO.h);
  });

  // ---- brilho de joia (estrela de 4 pontas)
  makeTexture(scene, 'menu_star', 17, 17, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 0, 1, 17);
    ctx.fillRect(0, 8, 17, 1);
    ctx.fillRect(7, 4, 3, 9);
    ctx.fillRect(4, 7, 9, 3);
    ctx.fillStyle = '#fff6b0';
    ctx.fillRect(6, 6, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 3, 3);
  });

  // ---- chuva
  makeTexture(scene, 'menu_drop', 1, 7, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 7);
    g.addColorStop(0, 'rgba(160,190,255,0)');
    g.addColorStop(1, 'rgba(190,215,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 7);
  });
  makeTexture(scene, 'menu_splash', 3, 2, (ctx) => {
    ctx.fillStyle = 'rgba(190,215,255,0.9)';
    ctx.fillRect(0, 1, 1, 1);
    ctx.fillRect(2, 1, 1, 1);
    ctx.fillRect(1, 0, 1, 1);
  });
}
