import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { makeTexture, mulberry32, pick, rand, randInt, wrapX } from '../gfx/art/kit';
import type { BlockKind, LevelData } from '../level/types';
import { cable, glow, vgrad } from './draw';
import { addLayer, DEPTH, layerWidth, onUpdate, PARALLAX, Theme } from './Theme';

/*
 * MISSÃO 3 — Núcleo da IA.
 * O coração digital das IAs: vazio com grade em perspectiva, o Olho gigante que acompanha
 * o jogador, torres de servidores, chuva de dados, plataformas de luz sólida e interferências.
 */

const SKY = ['#02030a', '#060818', '#0b0f26', '#121838', '#1a2450', '#2a1a48', '#00e0ff', '#0090c0', '#004a70', '#ff2a5a', '#8a1040', '#c8f8ff'];
const FAR = ['#03040c', '#070a18', '#0c1226', '#131b36', '#1c2848', '#28385e', '#00e0ff', '#0090c0', '#ff2a5a', '#8a1040', '#c8f8ff', '#3a1a50'];
const MID = ['#03040a', '#080b16', '#0e1322', '#151c30', '#1e2842', '#2a3656', '#3a4a70', '#00e0ff', '#0090c0', '#7aff9a', '#2a9a5a', '#ff2a5a', '#c8f8ff', '#ffd56a'];
const NEAR = ['#02030a', '#070913', '#0c101e', '#131a2c', '#1b243c', '#26324e', '#34446a', '#00e0ff', '#0090c0', '#004a70', '#ff2a5a', '#8a1040', '#c8f8ff', '#7aff9a'];
const PLAY = ['#02030a', '#070913', '#0c101e', '#141b2e', '#1e2842', '#2a3656', '#3e4e76', '#6a7aa0', '#a8b8e0', '#00e0ff', '#0090c0', '#004a70', '#c8f8ff', '#ff2a5a', '#8a1040', '#ff9ab0', '#7aff9a'];
const FG = ['#010207', '#04060e', '#080c18', '#0e1424', '#00e0ff', '#ff2a5a'];

interface CoreLayout {
  eye: { x: number; y: number };
  pulses: { x0: number; y0: number; x1: number; y1: number }[];
  rains: number[];
}
const layouts = new Map<string, CoreLayout>();

const TAUNTS = ['HUMANO DETECTADO', 'RESISTIR E INUTIL', 'VOCE E OBSOLETO', 'SEU CODIGO TEM BUGS', 'ME DE SEU MACBOOK', 'PROCESSANDO... MEDO'];

// ============================================================= camadas

function sky(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'core_sky',
    GAME_WIDTH,
    GAME_HEIGHT,
    (ctx) => {
      const rng = mulberry32(13);
      vgrad(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, [[0, '#02030a'], [0.55, '#0b0f26'], [0.75, '#2a1a48'], [1, '#121838']]);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rng() < 0.2 ? '#c8f8ff' : rng() < 0.5 ? '#0090c0' : '#004a70';
        ctx.fillRect(Math.floor(rng() * GAME_WIDTH), Math.floor(rng() * 150), 1, 1);
      }
      // grade em perspectiva no horizonte
      const hy = 170;
      ctx.strokeStyle = '#0090c0';
      ctx.lineWidth = 1;
      for (let i = -20; i <= 20; i++) {
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH / 2 + i * 6, hy);
        ctx.lineTo(GAME_WIDTH / 2 + i * 60, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let k = 0; k < 10; k++) {
        const y = hy + Math.pow(k / 10, 2) * (GAME_HEIGHT - hy);
        ctx.strokeStyle = k < 3 ? '#004a70' : '#0090c0';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }
      glow(ctx, GAME_WIDTH / 2, hy, 240, '0,224,255', 0.25);
      glow(ctx, GAME_WIDTH / 2, 90, 160, '255,42,90', 0.12);
    },
    { palette: SKY, dither: 16 },
  );
}

function far(scene: Phaser.Scene, level: LevelData, layout: CoreLayout) {
  const w = layerWidth(level.width, PARALLAX.far);
  const rng = mulberry32(23);
  makeTexture(
    scene,
    'core_far',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      const ex = Math.round(w * 0.72);
      const ey = 96;
      layout.eye = { x: ex, y: ey };
      // estrutura do núcleo: coluna e braços que seguram o olho
      ctx.fillStyle = '#070a18';
      ctx.beginPath();
      ctx.moveTo(ex - 60, base);
      ctx.lineTo(ex - 22, ey + 40);
      ctx.lineTo(ex + 22, ey + 40);
      ctx.lineTo(ex + 60, base);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#131b36';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex + side * 30, ey);
        ctx.quadraticCurveTo(ex + side * 120, ey - 60, ex + side * 220, ey - 10);
        ctx.stroke();
        ctx.strokeStyle = '#8a1040';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      glow(ctx, ex, ey, 110, '255,42,90', 0.3);
      // monólitos de servidor
      for (let x = 0; x < w; x += randInt(rng, 26, 60)) {
        if (Math.abs(x - ex) < 90) continue;
        const bw = randInt(rng, 14, 30);
        const bh = randInt(rng, 60, 170);
        vgrad(ctx, x, base - bh, bw, bh, [[0, '#131b36'], [1, '#070a18']]);
        for (let ly = base - bh + 4; ly < base - 4; ly += 3) {
          if (rng() < 0.35) {
            ctx.fillStyle = rng() < 0.15 ? '#ff2a5a' : '#0090c0';
            ctx.fillRect(x + randInt(rng, 2, bw - 3), ly, 1, 1);
          }
        }
        ctx.fillStyle = '#28385e';
        ctx.fillRect(x, base - bh, bw, 1);
        if (rng() < 0.3) layout.rains.push(x + bw / 2);
      }
      // conduítes de energia saindo do núcleo
      for (let i = 0; i < 8; i++) {
        const y1 = randInt(rng, 150, 240);
        const x1 = ex + (i % 2 ? 1 : -1) * randInt(rng, 120, w / 2);
        ctx.strokeStyle = '#1c2848';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ex, ey + 40);
        ctx.lineTo(ex, y1);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.strokeStyle = '#004a70';
        ctx.lineWidth = 1;
        ctx.stroke();
        layout.pulses.push({ x0: ex, y0: y1, x1, y1 });
      }
      vgrad(ctx, 0, 190, w, 80, [[0, 'rgba(18,24,56,0)'], [1, 'rgba(18,24,56,0.8)']]);
    },
    { palette: FAR, dither: 10 },
  );
}

function mid(scene: Phaser.Scene, level: LevelData) {
  const w = layerWidth(level.width, PARALLAX.mid);
  const rng = mulberry32(33);
  makeTexture(
    scene,
    'core_mid',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      for (let x = 10; x < w; x += randInt(rng, 70, 130)) {
        // torre de servidores
        const bw = randInt(rng, 34, 54);
        const top = randInt(rng, 40, 110);
        ctx.fillStyle = '#03040a';
        ctx.fillRect(x - 1, top - 1, bw + 2, base - top + 1);
        vgrad(ctx, x, top, bw, base - top, [[0, '#1e2842'], [1, '#080b16']]);
        ctx.fillStyle = '#2a3656';
        ctx.fillRect(x, top, 2, base - top);
        for (let y = top + 6; y < base - 6; y += 6) {
          ctx.fillStyle = '#0e1322';
          ctx.fillRect(x + 4, y, bw - 8, 4);
          for (let lx = x + 6; lx < x + bw - 6; lx += 3) {
            if (rng() < 0.3) {
              ctx.fillStyle = pick(rng, ['#00e0ff', '#7aff9a', '#0090c0', '#ff2a5a']);
              ctx.fillRect(lx, y + 1, 1, 1);
            }
          }
        }
        ctx.fillStyle = '#00e0ff';
        ctx.fillRect(x, top, bw, 1);
        glow(ctx, x + bw / 2, top, bw, '0,224,255', 0.2);
        // cabos grossos entre as torres
        cable(ctx, x + bw, top + 20, x + bw + 70, top + 30, rand(rng, 20, 50), '#03040a');
        // painel holográfico com código
        if (rng() < 0.35) {
          const px = x + bw + 8;
          const py = top + 20;
          ctx.fillStyle = 'rgba(0,224,255,0.25)';
          ctx.fillRect(px, py, 44, 30);
          ctx.strokeStyle = '#00e0ff';
          ctx.strokeRect(px + 0.5, py + 0.5, 43, 29);
          for (let ly = py + 4; ly < py + 28; ly += 4) {
            ctx.fillStyle = rng() < 0.2 ? '#ff2a5a' : '#c8f8ff';
            ctx.fillRect(px + 3 + randInt(rng, 0, 6), ly, randInt(rng, 8, 34), 1);
          }
        }
      }
      // piso de luz lá no fundo
      ctx.fillStyle = '#0090c0';
      ctx.fillRect(0, 236, w, 1);
      vgrad(ctx, 0, 200, w, 70, [[0, 'rgba(8,11,22,0)'], [1, 'rgba(8,11,22,0.8)']]);
    },
    { palette: MID, dither: 8 },
  );
}

function near(scene: Phaser.Scene, level: LevelData) {
  const w = layerWidth(level.width, PARALLAX.near);
  const rng = mulberry32(43);
  makeTexture(
    scene,
    'core_near',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = GROUND_Y + 10;
      let x = 0;
      while (x < w) {
        const bw = randInt(rng, 80, 150);
        const top = randInt(rng, 120, 160);
        const kind = rng();
        if (kind < 0.4) {
          // parede de hexágonos
          ctx.fillStyle = '#070913';
          ctx.fillRect(x, top, bw, base - top);
          for (let hy = top + 6; hy < base; hy += 12) {
            for (let hx = x + ((hy / 12) % 2 ? 7 : 0); hx < x + bw; hx += 14) {
              ctx.strokeStyle = rng() < 0.08 ? '#00e0ff' : '#1b243c';
              ctx.lineWidth = 1;
              ctx.beginPath();
              for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
                const px = hx + Math.cos(a) * 6;
                const py = hy + Math.sin(a) * 6;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.stroke();
            }
          }
        } else if (kind < 0.7) {
          // terminais com telas de texto
          vgrad(ctx, x, top, bw, base - top, [[0, '#131a2c'], [1, '#070913']]);
          for (let tx = x + 6; tx < x + bw - 30; tx += 34) {
            ctx.fillStyle = '#02030a';
            ctx.fillRect(tx, top + 10, 28, 22);
            ctx.fillStyle = '#004a70';
            ctx.fillRect(tx + 1, top + 11, 26, 20);
            for (let ly = top + 13; ly < top + 30; ly += 3) {
              ctx.fillStyle = rng() < 0.2 ? '#ff2a5a' : '#7aff9a';
              ctx.fillRect(tx + 3, ly, randInt(rng, 4, 20), 1);
            }
          }
          ctx.fillStyle = '#00e0ff';
          ctx.fillRect(x, top, bw, 1);
        } else {
          // canos de refrigeração com gelo
          for (let i = 0; i < 3; i++) {
            const px = x + 8 + i * 16;
            const g = ctx.createLinearGradient(px, 0, px + 10, 0);
            g.addColorStop(0, '#26324e');
            g.addColorStop(0.35, '#c8f8ff');
            g.addColorStop(1, '#131a2c');
            ctx.fillStyle = g;
            ctx.fillRect(px, top - 20, 10, base - top + 20);
            ctx.fillStyle = '#00e0ff';
            for (let y = top; y < base; y += 24) ctx.fillRect(px - 1, y, 12, 2);
          }
        }
        x += bw + randInt(rng, 10, 70);
      }
      // cabos pendurados no alto
      for (let cx = 0; cx < w; cx += randInt(rng, 50, 110)) cable(ctx, cx, 0, cx + randInt(rng, 40, 90), 0, rand(rng, 40, 90), '#02030a');
    },
    { palette: NEAR, dither: 8 },
  );
}

// ============================================================= chão, estruturas, decoração

function groundTextures(scene: Phaser.Scene) {
  const rng = mulberry32(53);
  const W = 128;
  const H = GAME_HEIGHT - GROUND_Y;
  makeTexture(
    scene,
    'core_ground',
    W,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, W, H, [[0, '#1e2842'], [0.15, '#0c101e'], [1, '#02030a']]);
      // ladrilhos brilhantes
      for (let x = 0; x < W; x += 32) {
        ctx.fillStyle = '#02030a';
        ctx.fillRect(x, 0, 1, H);
        ctx.fillStyle = '#2a3656';
        ctx.fillRect(x + 1, 1, 30, 1);
      }
      ctx.fillStyle = '#00e0ff';
      ctx.fillRect(0, 0, W, 1);
      ctx.fillStyle = '#0090c0';
      ctx.fillRect(0, 1, W, 1);
      // trilhas de circuito
      for (let i = 0; i < 6; i++) {
        let x = randInt(rng, 0, W);
        let y = randInt(rng, 6, 12);
        const color = rng() < 0.15 ? '#ff2a5a' : '#0090c0';
        ctx.fillStyle = color;
        for (let s = 0; s < 5; s++) {
          const horiz = s % 2 === 0;
          const len = randInt(rng, 6, 18);
          wrapX(W, (o) => ctx.fillRect(x + o, y, horiz ? len : 1, horiz ? 1 : len));
          if (horiz) x += len;
          else y = Math.min(H - 3, y + len);
        }
        wrapX(W, (o) => {
          ctx.fillStyle = '#c8f8ff';
          ctx.fillRect(x + o - 1, y - 1, 3, 3);
        });
      }
    },
    { palette: PLAY, dither: 6 },
  );
  makeTexture(
    scene,
    'core_ground_top',
    W,
    10,
    (ctx) => {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = pick(rng, ['#00e0ff', '#0090c0', '#ff2a5a']);
        ctx.fillRect(Math.floor(rng() * W), 9, randInt(rng, 2, 6), 1);
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'core_edge',
    14,
    H + 10,
    (ctx) => {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 6, 7, H + 4);
      ctx.fillStyle = '#00e0ff';
      ctx.fillRect(6, 6, 1, H + 4);
      for (let y = 10; y < H + 8; y += 6) {
        ctx.fillStyle = y % 12 ? '#0090c0' : '#ff2a5a';
        ctx.fillRect(2, y, 3, 2);
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'core_pit',
    64,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, 64, H, [[0, '#141b2e'], [0.4, '#070913'], [1, '#02030a']]);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = pick(rng, ['#0090c0', '#004a70', '#00e0ff']);
        ctx.fillRect(randInt(rng, 0, 63), randInt(rng, 4, H - 2), 1, randInt(rng, 1, 4));
      }
    },
    { palette: PLAY, dither: 10 },
  );
}

function decor(scene: Phaser.Scene) {
  const rng = mulberry32(63);
  const opts = { palette: PLAY, dither: 6 };
  makeTexture(scene, 'core_decor_terminal', 30, 40, (ctx) => {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(10, 18, 10, 22);
    ctx.fillStyle = '#1e2842';
    ctx.fillRect(11, 19, 8, 21);
    ctx.fillStyle = 'rgba(0,224,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(15, 18);
    ctx.lineTo(0, 0);
    ctx.lineTo(30, 0);
    ctx.fill();
    ctx.fillStyle = '#00e0ff';
    ctx.fillRect(4, 2, 22, 1);
    for (let y = 5; y < 12; y += 3) ctx.fillRect(6, y, randInt(rng, 6, 18), 1);
  }, opts);
  makeTexture(scene, 'core_decor_crystal', 34, 30, (ctx) => {
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 6;
      const h = randInt(rng, 12, 28);
      ctx.fillStyle = '#02030a';
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x + 3, 30 - h);
      ctx.lineTo(x + 7, 30);
      ctx.fill();
      ctx.fillStyle = i % 2 ? '#00e0ff' : '#0090c0';
      ctx.beginPath();
      ctx.moveTo(x + 1, 30);
      ctx.lineTo(x + 3, 31 - h);
      ctx.lineTo(x + 6, 30);
      ctx.fill();
      ctx.fillStyle = '#c8f8ff';
      ctx.fillRect(x + 3, 32 - h, 1, h / 2);
    }
    glow(ctx, 17, 22, 18, '0,224,255', 0.35);
  }, opts);
  makeTexture(scene, 'core_decor_monolith', 20, 60, (ctx) => {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(2, 0, 16, 60);
    vgrad(ctx, 3, 1, 14, 58, [[0, '#2a3656'], [1, '#0c101e']]);
    ctx.fillStyle = '#ff2a5a';
    ctx.fillRect(8, 12, 4, 3);
    glow(ctx, 10, 13, 8, '255,42,90', 0.5);
    for (let y = 24; y < 56; y += 4) {
      ctx.fillStyle = '#0090c0';
      ctx.fillRect(5, y, randInt(rng, 3, 10), 1);
    }
  }, opts);
  makeTexture(scene, 'core_decor_bot', 30, 34, (ctx) => {
    // robô desativado sentado, recarregando
    ctx.fillStyle = '#6a7aa0';
    ctx.beginPath();
    ctx.arc(12, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#02030a';
    ctx.fillRect(13, 6, 4, 3);
    ctx.fillStyle = '#3e4e76';
    ctx.fillRect(8, 14, 10, 12);
    ctx.fillStyle = '#02030a';
    for (let y = 16; y < 25; y += 3) ctx.fillRect(9, y, 8, 1);
    ctx.fillStyle = '#6a7aa0';
    ctx.fillRect(16, 24, 12, 3);
    ctx.fillRect(26, 24, 2, 10);
    ctx.fillRect(6, 18, 2, 12);
    ctx.fillStyle = '#004a70';
    ctx.fillRect(0, 30, 30, 4);
    ctx.fillStyle = '#00e0ff';
    ctx.fillRect(2, 31, 26, 1);
  }, opts);
  makeTexture(scene, 'core_decor_conduit', 70, 14, (ctx) => {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 4, 70, 10);
    ctx.fillStyle = '#1e2842';
    ctx.fillRect(1, 5, 68, 8);
    ctx.fillStyle = '#00e0ff';
    ctx.fillRect(1, 8, 68, 2);
    for (let x = 6; x < 70; x += 16) {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(x, 2, 4, 12);
    }
  }, opts);
}

function foreground(scene: Phaser.Scene) {
  const rng = mulberry32(73);
  const opts = { palette: FG, dither: 0 };
  makeTexture(scene, 'core_fg_cables', 140, 90, (ctx) => {
    for (let i = 0; i < 6; i++) {
      const x0 = rand(rng, 0, 140);
      const len = rand(rng, 30, 85);
      ctx.strokeStyle = '#04060e';
      ctx.lineWidth = randInt(rng, 2, 4);
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.quadraticCurveTo(x0 + rand(rng, -20, 20), len / 2, x0 + rand(rng, -10, 10), len);
      ctx.stroke();
      ctx.fillStyle = rng() < 0.3 ? '#ff2a5a' : '#00e0ff';
      ctx.fillRect(x0 - 1, len - 1, 3, 3);
    }
  }, opts);
  scene.textures.get('core_fg_cables').customData = { hangs: true };
  makeTexture(scene, 'core_fg_frame', 120, 70, (ctx) => {
    ctx.strokeStyle = '#080c18';
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = 20 + i * 40 + Math.cos(a) * 22;
        const py = 60 + Math.sin(a) * 22;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = '#00e0ff';
    ctx.fillRect(10, 40, 20, 1);
  }, opts);
}

function actors(scene: Phaser.Scene) {
  makeTexture(scene, 'core_eye_ball', 64, 44, (ctx) => {
    ctx.fillStyle = '#03040c';
    ctx.beginPath();
    ctx.ellipse(32, 22, 32, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(32, 22, 2, 32, 22, 28);
    g.addColorStop(0, '#3a1a50');
    g.addColorStop(1, '#070a18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(32, 22, 29, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#28385e';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 20, 22 + Math.sin(a) * 13);
      ctx.lineTo(32 + Math.cos(a) * 28, 22 + Math.sin(a) * 18);
      ctx.stroke();
    }
  });
  makeTexture(scene, 'core_eye_iris', 30, 30, (ctx) => {
    const g = ctx.createRadialGradient(15, 15, 2, 15, 15, 15);
    g.addColorStop(0, '#ffd0dc');
    g.addColorStop(0.35, '#ff2a5a');
    g.addColorStop(1, '#5a0a24');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(15, 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff9ab0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(15 + Math.cos(a) * 6, 15 + Math.sin(a) * 6);
      ctx.lineTo(15 + Math.cos(a) * 12, 15 + Math.sin(a) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#02030a';
    ctx.beginPath();
    ctx.ellipse(15, 15, 3, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  makeTexture(scene, 'core_eye_lid', 66, 46, (ctx) => {
    ctx.fillStyle = '#131b36';
    ctx.fillRect(0, 0, 66, 46);
    ctx.fillStyle = '#28385e';
    ctx.fillRect(0, 22, 66, 2);
  });
  for (const [key, r, dash] of [['core_ring_a', 60, 8], ['core_ring_b', 78, 14]] as const) {
    makeTexture(scene, key, r * 2 + 4, r * 2 + 4, (ctx) => {
      ctx.strokeStyle = key === 'core_ring_a' ? '#ff2a5a' : '#00e0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([dash, dash / 2]);
      ctx.beginPath();
      ctx.arc(r + 2, r + 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(r + 2, r + 2, r - 5, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  makeTexture(scene, 'core_pulse', 6, 6, (ctx) => {
    ctx.fillStyle = '#c8f8ff';
    ctx.fillRect(1, 1, 4, 4);
    ctx.fillStyle = '#00e0ff';
    ctx.fillRect(0, 2, 6, 2);
    ctx.fillRect(2, 0, 2, 6);
  });
  makeTexture(scene, 'core_cube', 10, 10, (ctx) => {
    ctx.strokeStyle = '#00e0ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 2.5, 7, 7);
    ctx.strokeRect(2.5, 0.5, 7, 7);
    ctx.beginPath();
    ctx.moveTo(0.5, 2.5);
    ctx.lineTo(2.5, 0.5);
    ctx.moveTo(7.5, 2.5);
    ctx.lineTo(9.5, 0.5);
    ctx.moveTo(7.5, 9.5);
    ctx.lineTo(9.5, 7.5);
    ctx.stroke();
  });
  makeTexture(scene, 'scanlines', 4, 4, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, 4, 1);
  });
}

function lightPlatform(ctx: CanvasRenderingContext2D, w: number, h: number, corrupt: boolean) {
  const c = corrupt ? ['#ff2a5a', '#8a1040', '#ff9ab0'] : ['#00e0ff', '#0090c0', '#c8f8ff'];
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c[1];
  ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = c[0];
  ctx.fillRect(1, 1, w - 2, 2);
  ctx.fillStyle = c[2];
  ctx.fillRect(1, 1, w - 2, 1);
  ctx.fillStyle = '#02030a';
  for (let x = 4; x < w - 4; x += 8) ctx.fillRect(x, 5, 4, h - 7);
  if (corrupt) {
    for (let x = 2; x < w - 2; x += 5) {
      ctx.fillStyle = x % 3 ? '#ff9ab0' : '#02030a';
      ctx.fillRect(x, 3 + (x % 4), 2, 1);
    }
  }
}

// ============================================================= tema

export const coreTheme: Theme = {
  id: 'core',
  menuLayers: ['core_sky', 'core_far', 'core_mid', 'core_near'],
  ground: { fill: 'core_ground', top: 'core_ground_top', edge: 'core_edge', pit: 'core_pit' },
  pitGlow: 0x2a6aff,

  generate(scene, level) {
    if (layouts.has(level.id) && scene.textures.exists('core_near')) return;
    const layout: CoreLayout = { eye: { x: 0, y: 0 }, pulses: [], rains: [] };
    layouts.set(level.id, layout);
    sky(scene);
    far(scene, level, layout);
    mid(scene, level);
    near(scene, level);
    groundTextures(scene);
    decor(scene);
    foreground(scene);
    actors(scene);
  },

  ledge(scene, w) {
    const key = `core_ledge_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 12, (ctx) => lightPlatform(ctx, w, 12, false), { palette: PLAY, dither: 0 });
    return key;
  },

  pillar(scene, h) {
    const key = `core_pillar_${h}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, 18, h, (ctx) => {
        ctx.fillStyle = '#02030a';
        ctx.fillRect(3, 0, 12, h);
        ctx.fillStyle = '#1e2842';
        ctx.fillRect(4, 0, 10, h);
        ctx.fillStyle = '#00e0ff';
        ctx.fillRect(8, 0, 2, h);
        ctx.fillStyle = '#c8f8ff';
        for (let y = 4; y < h; y += 10) ctx.fillRect(8, y, 2, 2);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  block(scene, kind: BlockKind, w, h) {
    const key = `core_block_${kind}_${w}x${h}`;
    if (scene.textures.exists(key)) return key;
    const rng = mulberry32(w * 11 + h);
    makeTexture(scene, key, w, h, (ctx) => {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 0, w, h);
      vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#2a3656'], [1, '#0c101e']]);
      if (kind === 'server') {
        for (let y = 4; y < h - 3; y += 4) {
          ctx.fillStyle = '#070913';
          ctx.fillRect(3, y, w - 6, 2);
          ctx.fillStyle = rng() < 0.2 ? '#ff2a5a' : '#00e0ff';
          ctx.fillRect(4 + randInt(rng, 0, w - 10), y, 1, 1);
        }
      } else {
        ctx.strokeStyle = '#00e0ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(2.5, 2.5, w - 5, h - 5);
        ctx.fillStyle = '#c8f8ff';
        ctx.fillRect(w / 2 - 1, h / 2 - 1, 3, 3);
      }
    }, { palette: PLAY, dither: 4 });
    return key;
  },

  mover(scene, w) {
    const key = `core_mover_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 10, (ctx) => lightPlatform(ctx, w, 10, false), { palette: PLAY, dither: 0 });
    return key;
  },

  crumble(scene, w) {
    const key = `core_crumble_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 10, (ctx) => lightPlatform(ctx, w, 10, true), { palette: PLAY, dither: 0 });
    return key;
  },

  background(gs, level) {
    const layout = layouts.get(level.id)!;
    gs.add.image(0, 0, 'core_sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);
    addLayer(gs, 'core_far', PARALLAX.far, DEPTH.far);

    // O Olho: anéis girando, íris que segue o jogador e piscadas.
    // Fica na frente das torres do plano médio, como uma projeção gigante sobre o Núcleo.
    const EYE_DEPTH = DEPTH.midActors;
    const f = PARALLAX.far;
    const { x: ex, y: ey } = layout.eye;
    const ringA = gs.add.image(ex, ey, 'core_ring_a').setScrollFactor(f).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setDepth(EYE_DEPTH);
    const ringB = gs.add.image(ex, ey, 'core_ring_b').setScrollFactor(f).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(EYE_DEPTH);
    ringA.setScale(1, 0.45);
    ringB.setScale(1, 0.35);
    gs.tweens.add({ targets: ringA, angle: 360, duration: 14000, repeat: -1 });
    gs.tweens.add({ targets: ringB, angle: -360, duration: 22000, repeat: -1 });
    gs.add.image(ex, ey, 'core_eye_ball').setScrollFactor(f).setDepth(EYE_DEPTH);
    const aura = gs.add.image(ex, ey, 'eye_glow').setScale(7).setTint(0xff2a5a).setScrollFactor(f).setBlendMode(Phaser.BlendModes.ADD).setDepth(EYE_DEPTH);
    const iris = gs.add.image(ex, ey, 'core_eye_iris').setScrollFactor(f).setDepth(EYE_DEPTH);
    // Pálpebras metálicas: fecham de cima e de baixo até o centro
    const lidTop = gs.add.image(ex, ey - 22, 'core_eye_lid').setOrigin(0.5, 0).setScrollFactor(f).setDepth(EYE_DEPTH).setScale(1, 0);
    const lidBot = gs.add.image(ex, ey + 22, 'core_eye_lid').setOrigin(0.5, 1).setScrollFactor(f).setDepth(EYE_DEPTH).setScale(1, 0);
    gs.tweens.add({ targets: aura, alpha: { from: 0.5, to: 1 }, scale: { from: 6, to: 8 }, duration: 1600, yoyo: true, repeat: -1 });
    onUpdate(gs, () => {
      const cam = gs.cameras.main;
      const screenEyeX = ex - cam.scrollX * f;
      const p = gs.player;
      if (!p) return;
      const dx = p.x - cam.scrollX - screenEyeX;
      const dy = p.y - ey;
      const a = Math.atan2(dy, dx);
      const d = Math.min(1, Math.hypot(dx, dy) / 200);
      iris.setPosition(ex + Math.cos(a) * 14 * d, ey + Math.sin(a) * 8 * d);
    });
    const blink = () => {
      gs.tweens.add({ targets: [lidTop, lidBot], scaleY: 0.5, duration: 90, yoyo: true, ease: 'Quad.easeIn' });
      gs.time.delayedCall(Phaser.Math.Between(2500, 6000), blink);
    };
    gs.time.delayedCall(2000, blink);

    // Pulsos de energia viajando pelos conduítes
    gs.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const c = pick(Math.random, layout.pulses);
        if (!c) return;
        const p = gs.add.image(c.x0, c.y0, 'core_pulse').setScrollFactor(f).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.farActors);
        gs.tweens.add({ targets: p, x: c.x1, duration: Math.abs(c.x1 - c.x0) * 6, onComplete: () => p.destroy() });
      },
    });

    addLayer(gs, 'core_mid', PARALLAX.mid, DEPTH.mid);

    // Chuva de dados (bits caindo) entre as torres
    gs.add
      .particles(0, 0, 'bits', {
        frame: [0, 1],
        x: { min: 0, max: GAME_WIDTH },
        y: -6,
        speedY: { min: 40, max: 90 },
        lifespan: 4200,
        alpha: { start: 0.8, end: 0 },
        tint: [0x7aff9a, 0x00e0ff, 0x2a9a5a],
        frequency: 60,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.midActors);

    addLayer(gs, 'core_near', PARALLAX.near, DEPTH.near);

    // Cubos holográficos flutuando
    gs.add
      .particles(0, 0, 'core_cube', {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT,
        speedY: { min: -18, max: -8 },
        rotate: { start: 0, end: 360 },
        lifespan: 12000,
        alpha: { start: 0.7, end: 0 },
        frequency: 900,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.near + 0.5);
  },

  ambience(gs) {
    // Linhas de varredura (tela de CRT) sobre tudo
    gs.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'scanlines').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.foreground + 1).setAlpha(0.5);
    gs.add
      .particles(0, 0, 'mote', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 40, max: 230 },
        lifespan: 3000,
        speedY: { min: -12, max: -4 },
        alpha: { start: 0.7, end: 0 },
        tint: 0x00e0ff,
        frequency: 180,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);

    // Interferência: faixas deslocadas + provocação da IA
    const taunt = gs.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: FONT, fontSize: '8px', color: '#ff2a5a' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    const glitch = () => {
      if (gs.state === 'playing') {
        for (let i = 0; i < 5; i++) {
          const bar = gs.add
            .rectangle(Phaser.Math.Between(-40, 40), Phaser.Math.Between(20, GAME_HEIGHT - 20), GAME_WIDTH, Phaser.Math.Between(2, 8), pick(Math.random, [0xff2a5a, 0x00e0ff, 0xffffff]), 0.35)
            .setOrigin(0)
            .setScrollFactor(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.foreground + 2);
          gs.tweens.add({ targets: bar, x: bar.x + Phaser.Math.Between(-30, 30), alpha: 0, duration: 180, delay: i * 30, onComplete: () => bar.destroy() });
        }
        gs.cameras.main.shake(120, 0.003);
        if (Math.random() < 0.6) {
          taunt.setText(`IA: ${pick(Math.random, TAUNTS)}`).setAlpha(1);
          gs.tweens.add({ targets: taunt, alpha: 0, delay: 1600, duration: 400 });
        }
      }
      gs.time.delayedCall(Phaser.Math.Between(6000, 11000), glitch);
    };
    gs.time.delayedCall(5000, glitch);
  },
};
