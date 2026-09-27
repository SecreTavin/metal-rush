import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { makeTexture, mulberry32, pick, rand, randInt, RNG, wrapX } from '../gfx/art/kit';
import type { BlockKind, LevelData } from '../level/types';
import { cable, glow, vgrad } from './draw';
import { addLayer, DEPTH, layerWidth, onUpdate, PARALLAX, Theme } from './Theme';

/*
 * MISSÃO 3 — Zona de Contágio.
 * Antes do Núcleo: a área onde a IA injeta o vírus worm nas máquinas. Cidade industrial em ruínas
 * pegando fogo, névoa tóxica, uma torre-seringa bombeando o worm e robôs imperfeitos ao fundo,
 * sofrendo para se adaptar ao vírus (tremem, desabam, se arrastam, pendurados na linha parada).
 */

const SKY = ['#030604', '#060c08', '#0a140e', '#0f1e14', '#16301c', '#1e4424', '#2a5a2e', '#5aff5a', '#aaff8a', '#ff3a4a', '#8a1a24', '#ff9a3a', '#3a1a14'];
const FAR = ['#040806', '#08100a', '#0c1810', '#122418', '#1a3220', '#24422a', '#5aff5a', '#2a9a3a', '#ff9a3a', '#ffcf3a', '#8a3a14', '#ff3a4a', '#c8ffb0'];
const MID = ['#030604', '#070d09', '#0c160f', '#132218', '#1c3022', '#27402e', '#34523c', '#5a7a60', '#5aff5a', '#2a9a3a', '#c8ffb0', '#ff9a3a', '#8a3a14'];
const NEAR = ['#020403', '#060a07', '#0b120d', '#121c15', '#1a281e', '#243628', '#304634', '#5aff5a', '#2a9a3a', '#ff9a3a', '#c8d4c0', '#6a7a6c'];
const PLAY = ['#020403', '#070c08', '#0d1510', '#142018', '#1d2c22', '#28392d', '#364a3b', '#4e6452', '#6e8672', '#a0b4a2', '#5aff5a', '#2a9a3a', '#c8ffb0', '#ff9a3a', '#8a3a14', '#ff3a4a', '#c8d4c0'];
const FG = ['#010201', '#040805', '#08100a', '#0e180f', '#5aff5a', '#2a9a3a'];

interface ContagionLayout {
  tower: { x: number; top: number; bottom: number };
  fires: { x: number; y: number }[];
  hooks: number[];
  sufferers: number[];
}
let lastLevelId = '';
const layouts = new Map<string, ContagionLayout>();

const TAUNTS = ['WORM: INSTALANDO... 67%', 'ADAPTE-SE OU SEJA APAGADO', 'FIRMWARE REESCRITO', 'SEU MACBOOK E O PROXIMO', 'INFECCAO: 99% DAS MAQUINAS', 'NAO HA ANTIVIRUS PARA ISSO'];

// ============================================================= camadas

function sky(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'contagion_sky',
    GAME_WIDTH,
    GAME_HEIGHT,
    (ctx) => {
      const rng = mulberry32(17);
      vgrad(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, [[0, '#030604'], [0.5, '#0f1e14'], [0.78, '#1e4424'], [1, '#16301c']]);
      // o Núcleo brilha vermelho no horizonte (a próxima missão)
      glow(ctx, GAME_WIDTH * 0.86, 190, 150, '255,58,74', 0.35);
      glow(ctx, GAME_WIDTH * 0.3, 170, 200, '90,255,90', 0.12);
      // nuvens de fumaça
      for (let i = 0; i < 14; i++) {
        const x = rand(rng, -40, GAME_WIDTH + 40);
        const y = rand(rng, 10, 120);
        const r = rand(rng, 30, 70);
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, 'rgba(40,70,45,0.35)');
        g.addColorStop(1, 'rgba(40,70,45,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = rng() < 0.3 ? '#aaff8a' : '#2a5a2e';
        ctx.fillRect(Math.floor(rng() * GAME_WIDTH), Math.floor(rng() * 150), 1, 1);
      }
    },
    { palette: SKY, dither: 18 },
  );
}

/** Silhueta de prédio destruído: topo serrilhado, vigas expostas e janelas com brilho verde. */
function ruin(ctx: CanvasRenderingContext2D, rng: RNG, x: number, w: number, top: number, base: number, body: string, lit: string) {
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, top + randInt(rng, 0, 10));
  for (let k = 1; k < 5; k++) ctx.lineTo(x + (w * k) / 5, top + randInt(rng, -4, 18));
  ctx.lineTo(x + w, top + randInt(rng, 0, 14));
  ctx.lineTo(x + w, base);
  ctx.fill();
  if (rng() < 0.55) {
    const bx = x + randInt(rng, 4, w - 4);
    ctx.fillRect(bx, top - randInt(rng, 8, 20), 2, 22);
  }
  for (let wy = top + 10; wy < base - 4; wy += 7) {
    for (let wx = x + 4; wx < x + w - 4; wx += 6) {
      if (rng() < 0.05) {
        ctx.fillStyle = lit;
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
  }
}

function far(scene: Phaser.Scene, level: LevelData, layout: ContagionLayout) {
  const w = layerWidth(level.width, PARALLAX.far);
  const rng = mulberry32(27);
  makeTexture(
    scene,
    'contagion_far',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = 250;
      const tx = Math.round(w * 0.55);
      layout.tower = { x: tx, top: 44, bottom: 196 };
      for (let x = -10; x < w; ) {
        const bw = randInt(rng, 22, 50);
        if (Math.abs(x + bw / 2 - tx) > 40) {
          const top = randInt(rng, 90, 150);
          ruin(ctx, rng, x, bw, top, base, '#122418', 'rgba(90,255,90,0.6)');
          if (rng() < 0.3) layout.fires.push({ x: x + bw / 2, y: top + 6 });
        }
        x += bw + randInt(rng, 0, 8);
      }
      // torre injetora (seringa gigante)
      const t = layout.tower;
      ctx.fillStyle = '#0c1810';
      ctx.fillRect(tx - 16, t.top, 32, t.bottom - t.top + 60);
      ctx.fillRect(tx - 22, t.top - 8, 44, 12);
      ctx.fillRect(tx - 4, t.top - 30, 8, 24);
      ctx.fillStyle = '#1a3220';
      ctx.fillRect(tx - 16, t.top, 2, t.bottom - t.top);
      for (const y of [t.top + 24, t.top + 70, t.top + 116]) {
        ctx.fillStyle = '#040806';
        ctx.fillRect(tx - 12, y, 24, 4);
      }
      // cabos-verme saindo da torre para os dois lados
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1;
        const y0 = t.top + 30 + i * 18;
        const x1 = tx + side * randInt(rng, 90, 260);
        ctx.strokeStyle = '#08100a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(tx + side * 14, y0);
        ctx.quadraticCurveTo(tx + side * 60, y0 - 50, x1, randInt(rng, 170, 230));
        ctx.stroke();
        ctx.strokeStyle = '#2a9a3a';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      glow(ctx, tx, (t.top + t.bottom) / 2, 90, '90,255,90', 0.22);
      vgrad(ctx, 0, 180, w, 90, [[0, 'rgba(22,48,28,0)'], [1, 'rgba(22,48,28,0.85)']]);
    },
    { palette: FAR, dither: 10 },
  );
}

function mid(scene: Phaser.Scene, level: LevelData, layout: ContagionLayout) {
  const w = layerWidth(level.width, PARALLAX.mid);
  const rng = mulberry32(37);
  makeTexture(
    scene,
    'contagion_mid',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const floor = 214;
      // salão de montagem destruído: pilares, viga do teto quebrada e trilho de ganchos
      for (let x = 20; x < w; x += randInt(rng, 110, 170)) {
        vgrad(ctx, x, 40, 12, floor - 40, [[0, '#1c3022'], [1, '#0c160f']]);
        ctx.fillStyle = '#34523c';
        ctx.fillRect(x, 40, 2, floor - 40);
        // viga do teto, às vezes partida
        const beamW = randInt(rng, 90, 160);
        if (rng() < 0.7) {
          ctx.fillStyle = '#132218';
          ctx.fillRect(x, 50, beamW, 8);
          ctx.fillStyle = '#27402e';
          ctx.fillRect(x, 50, beamW, 1);
        } else {
          ctx.save();
          ctx.translate(x + 10, 54);
          ctx.rotate(0.35);
          ctx.fillStyle = '#132218';
          ctx.fillRect(0, 0, beamW * 0.6, 8);
          ctx.restore();
        }
        // pilha de sucata no chão do fundo
        if (rng() < 0.6) {
          const px = x + randInt(rng, 20, 80);
          for (let k = 0; k < 10; k++) {
            ctx.fillStyle = pick(rng, ['#1c3022', '#27402e', '#34523c', '#132218']);
            const pw = randInt(rng, 4, 12);
            ctx.fillRect(px + randInt(rng, -18, 18), floor - randInt(rng, 2, 18), pw, randInt(rng, 3, 6));
          }
          if (rng() < 0.5) {
            ctx.fillStyle = '#5aff5a';
            ctx.fillRect(px, floor - 10, 1, 1);
          }
        }
      }
      // trilho da linha de montagem (ganchos para os robôs pendurados)
      ctx.fillStyle = '#1c3022';
      ctx.fillRect(0, 64, w, 3);
      for (let x = 40; x < w; x += randInt(rng, 70, 140)) {
        layout.hooks.push(x);
        ctx.fillStyle = '#34523c';
        ctx.fillRect(x - 1, 66, 2, 10);
      }
      // piso do salão
      ctx.fillStyle = '#132218';
      ctx.fillRect(0, floor, w, GAME_HEIGHT - floor);
      ctx.fillStyle = '#34523c';
      ctx.fillRect(0, floor, w, 1);
      vgrad(ctx, 0, 190, w, 80, [[0, 'rgba(12,22,15,0)'], [1, 'rgba(12,22,15,0.8)']]);
    },
    { palette: MID, dither: 8 },
  );
}

function near(scene: Phaser.Scene, level: LevelData, layout: ContagionLayout) {
  const w = layerWidth(level.width, PARALLAX.near);
  const rng = mulberry32(47);
  makeTexture(
    scene,
    'contagion_near',
    w,
    GAME_HEIGHT,
    (ctx) => {
      const base = GROUND_Y + 10;
      let x = 0;
      while (x < w) {
        const bw = randInt(rng, 70, 140);
        const top = randInt(rng, 130, 170);
        const kind = rng();
        if (kind < 0.45) {
          // muro rachado com manchas de vírus
          ctx.fillStyle = '#0b120d';
          ctx.beginPath();
          ctx.moveTo(x, base);
          ctx.lineTo(x, top + 8);
          ctx.lineTo(x + bw * 0.3, top);
          ctx.lineTo(x + bw * 0.5, top + 14);
          ctx.lineTo(x + bw * 0.8, top + 4);
          ctx.lineTo(x + bw, top + 12);
          ctx.lineTo(x + bw, base);
          ctx.fill();
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = 'rgba(90,255,90,0.35)';
            const sx = x + randInt(rng, 6, bw - 12);
            const sy = randInt(rng, top + 16, base - 10);
            ctx.fillRect(sx, sy, randInt(rng, 3, 8), 2);
            ctx.fillRect(sx + 1, sy + 2, 1, randInt(rng, 3, 10));
          }
        } else if (kind < 0.75) {
          // contêiner de quarentena tombado
          vgrad(ctx, x, top + 20, bw, base - top - 20, [[0, '#1a281e'], [1, '#060a07']]);
          for (let sx = x + 4; sx < x + bw - 4; sx += 6) {
            ctx.fillStyle = '#060a07';
            ctx.fillRect(sx, top + 22, 2, base - top - 24);
          }
          ctx.fillStyle = '#ff9a3a';
          for (let sx = x + 6; sx < x + bw - 10; sx += 12) ctx.fillRect(sx, top + 26, 6, 2);
        } else {
          // tanques de vírus com vidro verde
          for (let i = 0; i < 2; i++) {
            const tx = x + 10 + i * 30;
            ctx.fillStyle = '#060a07';
            ctx.fillRect(tx, top, 22, base - top);
            vgrad(ctx, tx + 3, top + 10, 16, base - top - 20, [[0, '#2a9a3a'], [1, '#0b120d']]);
            ctx.fillStyle = '#c8ffb0';
            ctx.fillRect(tx + 5, top + 12, 1, base - top - 30);
          }
        }
        x += bw + randInt(rng, 10, 60);
      }
      // cabos-verme pendurados no alto
      for (let cx = 0; cx < w; cx += randInt(rng, 60, 120)) cable(ctx, cx, 0, cx + randInt(rng, 40, 90), 0, rand(rng, 40, 90), '#020403');
      for (let sx = 90; sx < w; sx += randInt(rng, 150, 260)) layout.sufferers.push(sx);
    },
    { palette: NEAR, dither: 8 },
  );
}

// ============================================================= chão, estruturas, decoração

function groundTextures(scene: Phaser.Scene) {
  const rng = mulberry32(57);
  const W = 128;
  const H = GAME_HEIGHT - GROUND_Y;
  makeTexture(
    scene,
    'contagion_ground',
    W,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, W, H, [[0, '#28392d'], [0.15, '#0d1510'], [1, '#020403']]);
      // grade metálica
      for (let x = 0; x < W; x += 16) {
        ctx.fillStyle = '#070c08';
        ctx.fillRect(x, 3, 1, H);
      }
      for (let y = 12; y < H; y += 10) {
        ctx.fillStyle = '#070c08';
        ctx.fillRect(0, y, W, 1);
      }
      ctx.fillStyle = '#6e8672';
      ctx.fillRect(0, 0, W, 1);
      ctx.fillStyle = '#364a3b';
      ctx.fillRect(0, 1, W, 2);
      // rachaduras e veias do vírus
      for (let i = 0; i < 5; i++) {
        let x = randInt(rng, 0, W);
        let y = 3;
        const vein = rng() < 0.5;
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = vein ? '#2a9a3a' : '#020403';
          wrapX(W, (o) => ctx.fillRect(x + o, y, 1, 2));
          x += randInt(rng, -2, 2);
          y += 2;
        }
        if (vein) wrapX(W, (o) => {
          ctx.fillStyle = '#5aff5a';
          ctx.fillRect(x + o, y, 1, 1);
        });
      }
    },
    { palette: PLAY, dither: 6 },
  );
  makeTexture(
    scene,
    'contagion_ground_top',
    W,
    10,
    (ctx) => {
      // limo e restos no topo do piso
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = pick(rng, ['#2a9a3a', '#364a3b', '#4e6452', '#5aff5a']);
        ctx.fillRect(Math.floor(rng() * W), 8 + randInt(rng, 0, 1), randInt(rng, 1, 4), 1);
      }
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'contagion_edge',
    14,
    H + 10,
    (ctx) => {
      ctx.fillStyle = '#020403';
      ctx.fillRect(0, 6, 7, H + 4);
      ctx.fillStyle = '#4e6452';
      ctx.fillRect(6, 6, 1, H + 4);
      ctx.fillStyle = '#2a9a3a';
      for (let y = 12; y < H + 8; y += 7) ctx.fillRect(3, y, 1, 3);
    },
    { palette: PLAY, dither: 0 },
  );
  makeTexture(
    scene,
    'contagion_pit',
    64,
    H,
    (ctx) => {
      vgrad(ctx, 0, 0, 64, H, [[0, '#2a9a3a'], [0.25, '#0d1510'], [1, '#020403']]);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = pick(rng, ['#5aff5a', '#2a9a3a', '#c8ffb0']);
        ctx.fillRect(randInt(rng, 0, 63), randInt(rng, 2, 10), randInt(rng, 1, 3), 1);
      }
    },
    { palette: PLAY, dither: 10 },
  );
}

function decor(scene: Phaser.Scene) {
  const rng = mulberry32(67);
  const opts = { palette: PLAY, dither: 6 };
  makeTexture(scene, 'contagion_decor_scrap', 44, 22, (ctx) => {
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = pick(rng, ['#28392d', '#364a3b', '#4e6452', '#1d2c22', '#6e8672']);
      const w = randInt(rng, 4, 12);
      const h = randInt(rng, 3, 6);
      const x = randInt(rng, 2, 40 - w);
      const y = 22 - h - Math.round((1 - Math.abs(x + w / 2 - 22) / 22) * randInt(rng, 2, 14));
      ctx.fillRect(x, y, w, h);
    }
    ctx.fillStyle = '#5aff5a';
    ctx.fillRect(20, 9, 2, 1);
  }, opts);
  makeTexture(scene, 'contagion_decor_canister', 18, 32, (ctx) => {
    ctx.fillStyle = '#020403';
    ctx.fillRect(1, 2, 16, 30);
    vgrad(ctx, 3, 6, 12, 22, [[0, '#5aff5a'], [1, '#2a9a3a']]);
    ctx.fillStyle = '#c8ffb0';
    ctx.fillRect(5, 7, 1, 18);
    ctx.fillStyle = '#4e6452';
    ctx.fillRect(0, 0, 18, 4);
    ctx.fillRect(0, 28, 18, 4);
    glow(ctx, 9, 17, 12, '90,255,90', 0.3);
  }, opts);
  makeTexture(scene, 'contagion_decor_wreck', 44, 16, (ctx) => {
    // robô desmontado no chão, tronco e crânio separados
    ctx.fillStyle = '#6e8672';
    ctx.beginPath();
    ctx.arc(8, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020403';
    ctx.fillRect(8, 8, 3, 2);
    ctx.fillStyle = '#5aff5a';
    ctx.fillRect(9, 8, 1, 1);
    ctx.fillStyle = '#4e6452';
    ctx.fillRect(16, 8, 16, 7);
    ctx.fillStyle = '#020403';
    for (let x = 18; x < 31; x += 3) ctx.fillRect(x, 9, 1, 5);
    ctx.fillStyle = '#6e8672';
    ctx.fillRect(32, 12, 11, 2);
    ctx.fillStyle = '#2a9a3a';
    ctx.fillRect(20, 14, 10, 2);
  }, opts);
  makeTexture(scene, 'contagion_decor_pylon', 20, 50, (ctx) => {
    // mini-injetor ligado ao chão
    ctx.fillStyle = '#020403';
    ctx.fillRect(6, 4, 8, 46);
    ctx.fillStyle = '#28392d';
    ctx.fillRect(7, 4, 6, 46);
    ctx.fillStyle = '#5aff5a';
    for (let y = 10; y < 44; y += 6) ctx.fillRect(9, y, 2, 3);
    ctx.fillStyle = '#4e6452';
    ctx.fillRect(2, 0, 16, 5);
    ctx.fillRect(0, 46, 20, 4);
    glow(ctx, 10, 26, 12, '90,255,90', 0.25);
  }, opts);
  makeTexture(scene, 'contagion_decor_sign', 46, 34, (ctx) => {
    ctx.fillStyle = '#020403';
    ctx.fillRect(21, 16, 3, 18);
    ctx.save();
    ctx.translate(23, 10);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#ffcf3a';
    ctx.fillRect(-22, -8, 44, 15);
    ctx.fillStyle = '#020403';
    for (let x = -22; x < 22; x += 6) ctx.fillRect(x, -8, 3, 2);
    ctx.font = `8px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#020403';
    ctx.fillText('RISCO', -19, -4);
    ctx.restore();
  }, opts);
}

function foreground(scene: Phaser.Scene) {
  const rng = mulberry32(77);
  const opts = { palette: FG, dither: 0 };
  makeTexture(scene, 'contagion_fg_tendrils', 140, 100, (ctx) => {
    // cabos-verme pendurados em primeiro plano
    for (let i = 0; i < 5; i++) {
      const x0 = rand(rng, 0, 140);
      const len = rand(rng, 40, 95);
      ctx.strokeStyle = '#040805';
      ctx.lineWidth = randInt(rng, 3, 6);
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.quadraticCurveTo(x0 + rand(rng, -24, 24), len / 2, x0 + rand(rng, -12, 12), len);
      ctx.stroke();
      ctx.fillStyle = '#5aff5a';
      for (let y = 8; y < len; y += 12) ctx.fillRect(x0 + Math.sin(y) * 2, y, 2, 1);
    }
  }, opts);
  scene.textures.get('contagion_fg_tendrils').customData = { hangs: true };
  makeTexture(scene, 'contagion_fg_girder', 90, 80, (ctx) => {
    ctx.fillStyle = '#040805';
    ctx.save();
    ctx.translate(20, 80);
    ctx.rotate(-0.5);
    ctx.fillRect(0, -8, 110, 10);
    ctx.fillStyle = '#08100a';
    for (let x = 6; x < 110; x += 14) ctx.fillRect(x, -6, 6, 6);
    ctx.restore();
  }, opts);
}

function actors(scene: Phaser.Scene) {
  makeTexture(scene, 'contagion_fluid', 8, 16, (ctx) => {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = y % 8 < 5 ? '#5aff5a' : '#2a9a3a';
      ctx.fillRect(0, y, 8, 1);
    }
    ctx.fillStyle = '#c8ffb0';
    ctx.fillRect(2, 2, 1, 3);
  });
  makeTexture(scene, 'contagion_spore', 3, 3, (ctx) => {
    ctx.fillStyle = '#aaff8a';
    ctx.fillRect(1, 0, 1, 3);
    ctx.fillRect(0, 1, 3, 1);
  });
  makeTexture(scene, 'contagion_ember', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffcf3a';
    ctx.fillRect(0, 0, 2, 2);
  });
}

function crate(ctx: CanvasRenderingContext2D, w: number, h: number, rng: RNG, corroded: boolean) {
  ctx.fillStyle = '#020403';
  ctx.fillRect(0, 0, w, h);
  vgrad(ctx, 1, 1, w - 2, h - 2, [[0, '#4e6452'], [1, '#1d2c22']]);
  ctx.fillStyle = '#6e8672';
  ctx.fillRect(1, 1, w - 2, 1);
  for (let x = 4; x < w - 3; x += 6) {
    ctx.fillStyle = '#142018';
    ctx.fillRect(x, 3, 2, h - 5);
  }
  if (corroded) {
    for (let i = 0; i < w / 3; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#5aff5a' : '#2a9a3a';
      ctx.fillRect(randInt(rng, 1, w - 3), randInt(rng, 1, h - 3), 2, 1);
    }
  }
}

// ============================================================= tema

export const contagionTheme: Theme = {
  id: 'contagion',
  menuLayers: ['contagion_sky', 'contagion_far', 'contagion_mid', 'contagion_near'],
  ground: { fill: 'contagion_ground', top: 'contagion_ground_top', edge: 'contagion_edge', pit: 'contagion_pit' },
  pitGlow: 0x3aff4a,

  generate(scene, level) {
    if (lastLevelId === level.id && scene.textures.exists('contagion_near')) return;
    lastLevelId = level.id;
    layouts.clear();
    const layout: ContagionLayout = { tower: { x: 0, top: 0, bottom: 0 }, fires: [], hooks: [], sufferers: [] };
    layouts.set(level.id, layout);
    sky(scene);
    far(scene, level, layout);
    mid(scene, level, layout);
    near(scene, level, layout);
    groundTextures(scene);
    decor(scene);
    foreground(scene);
    actors(scene);
  },

  ledge(scene, w) {
    const key = `contagion_ledge_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 12, (ctx) => crate(ctx, w, 12, mulberry32(w), false), { palette: PLAY, dither: 0 });
    return key;
  },

  pillar(scene, h) {
    const key = `contagion_pillar_${h}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, 18, h, (ctx) => {
        ctx.fillStyle = '#020403';
        ctx.fillRect(3, 0, 12, h);
        ctx.fillStyle = '#28392d';
        ctx.fillRect(4, 0, 10, h);
        ctx.fillStyle = '#4e6452';
        ctx.fillRect(4, 0, 2, h);
        ctx.fillStyle = '#2a9a3a';
        for (let y = 6; y < h; y += 14) ctx.fillRect(10, y, 2, 4);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  block(scene, kind: BlockKind, w, h) {
    const key = `contagion_block_${kind}_${w}x${h}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, h, (ctx) => crate(ctx, w, h, mulberry32(w * 13 + h), kind !== 'barricade'), { palette: PLAY, dither: 4 });
    return key;
  },

  mover(scene, w) {
    const key = `contagion_mover_${w}`;
    if (!scene.textures.exists(key)) {
      makeTexture(scene, key, w, 10, (ctx) => {
        crate(ctx, w, 10, mulberry32(w + 5), false);
        ctx.fillStyle = '#5aff5a';
        ctx.fillRect(2, 8, w - 4, 1);
      }, { palette: PLAY, dither: 0 });
    }
    return key;
  },

  crumble(scene, w) {
    const key = `contagion_crumble_${w}`;
    if (!scene.textures.exists(key)) makeTexture(scene, key, w, 10, (ctx) => crate(ctx, w, 10, mulberry32(w + 9), true), { palette: PLAY, dither: 0 });
    return key;
  },

  background(gs, level) {
    const layout = layouts.get(level.id)!;
    gs.add.image(0, 0, 'contagion_sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);
    addLayer(gs, 'contagion_far', PARALLAX.far, DEPTH.far);
    const f = PARALLAX.far;

    // Fogo nas ruínas: brilho pulsando e brasas subindo
    for (const fire of layout.fires) {
      const g = gs.add.image(fire.x, fire.y, 'eye_glow').setScale(2.2, 1.6).setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(f).setDepth(DEPTH.farActors);
      gs.tweens.add({ targets: g, alpha: { from: 0.5, to: 1 }, scaleX: { from: 2, to: 2.6 }, duration: Phaser.Math.Between(180, 320), yoyo: true, repeat: -1 });
      gs.add
        .particles(fire.x, fire.y, 'contagion_ember', {
          x: { min: -6, max: 6 },
          speedY: { min: -30, max: -12 },
          speedX: { min: -6, max: 6 },
          lifespan: 1400,
          alpha: { start: 1, end: 0 },
          frequency: 160,
        })
        .setScrollFactor(f)
        .setDepth(DEPTH.farActors);
    }

    // Torre injetora: o worm sobe pelo tubo e, de tempos em tempos, pulsa
    const t = layout.tower;
    const fluid = gs.add.tileSprite(t.x, t.top + 8, 8, t.bottom - t.top - 8, 'contagion_fluid').setOrigin(0.5, 0).setScrollFactor(f).setDepth(DEPTH.farActors);
    const towerGlow = gs.add.image(t.x, (t.top + t.bottom) / 2, 'eye_glow').setScale(3, 9).setTint(0x5aff5a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setScrollFactor(f).setDepth(DEPTH.farActors);
    onUpdate(gs, () => {
      fluid.tilePositionY += 0.6;
    });

    addLayer(gs, 'contagion_mid', PARALLAX.mid, DEPTH.mid);
    const m = PARALLAX.mid;

    // Robôs pendurados na linha de montagem parada (balançando)
    const hanging: Phaser.GameObjects.Sprite[] = [];
    layout.hooks.forEach((hx, i) => {
      if (i % 2) return;
      const bot = gs.add
        .sprite(hx, 74, 'bot_hunter', 12 + (i % 2))
        .setOrigin(0.5, 0.04)
        .setTint(0x3a5a44)
        .setAngle(Phaser.Math.Between(-6, 0))
        .setFlipX(i % 4 === 0)
        .setScrollFactor(m)
        .setDepth(DEPTH.midActors);
      gs.tweens.add({ targets: bot, angle: bot.angle + Phaser.Math.Between(4, 8), duration: Phaser.Math.Between(1400, 2400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      hanging.push(bot);
    });

    addLayer(gs, 'contagion_near', PARALLAX.near, DEPTH.near);

    // Robôs imperfeitos lutando contra o vírus no primeiro plano do fundo
    const sufferers = layout.sufferers.map((sx, i) => {
      const bot = gs.add
        .sprite(sx, GROUND_Y - 27, 'bot_infected', 0)
        .setTint(0x55705a)
        .setFlipX(i % 2 === 1)
        .setScrollFactor(PARALLAX.near)
        .setDepth(DEPTH.nearActors);
      return { bot, mode: i % 3, next: 0 };
    });
    onUpdate(gs, () => {
      const now = gs.time.now;
      for (const s of sufferers) {
        if (now < s.next) continue;
        if (s.mode === 0) {
          // tremendo em pé, com espasmos
          s.bot.setFrame(Phaser.Math.Between(0, 3)).setAngle(Phaser.Math.Between(-6, 6));
          s.bot.x += Phaser.Math.Between(-1, 1);
          s.next = now + Phaser.Math.Between(60, 260);
        } else if (s.mode === 1) {
          // desaba e tenta se levantar de novo
          const frame = Number(s.bot.frame.name);
          const up = s.bot.getData('up') as boolean;
          let nf = up ? frame - 1 : frame + 1;
          if (nf > 14 || (frame < 12 && !up)) nf = up ? 0 : 12;
          if (nf >= 14) s.bot.setData('up', true);
          if (nf <= 12 && up) {
            s.bot.setData('up', false);
            nf = 0;
          }
          s.bot.setFrame(Phaser.Math.Clamp(nf, 0, 14));
          s.next = now + (nf === 0 ? Phaser.Math.Between(900, 1800) : Phaser.Math.Between(160, 320));
        } else {
          // se arrastando pelo chão
          s.bot.setFrame(14);
          s.bot.x += s.bot.flipX ? -1 : 1;
          s.bot.setAngle(Phaser.Math.Between(-3, 3));
          s.next = now + Phaser.Math.Between(90, 200);
        }
        if (Math.random() < 0.08) s.bot.setTintFill(0x7aff5a);
        else s.bot.setTint(0x55705a);
      }
    });

    // Pulso da torre: o vírus é injetado e todos os robôs do fundo se contorcem
    const pulse = () => {
      if (!gs.scene.isActive()) return;
      gs.tweens.add({ targets: towerGlow, alpha: 1, scaleX: 5, duration: 160, yoyo: true });
      const ring = gs.add.circle(t.x, (t.top + t.bottom) / 2, 10, 0x5aff5a, 0).setStrokeStyle(2, 0x5aff5a, 0.8).setScrollFactor(f).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.farActors);
      gs.tweens.add({ targets: ring, radius: 220, alpha: 0, duration: 1200, onComplete: () => ring.destroy() });
      for (const s of sufferers) {
        s.bot.setTintFill(0xaaff8a);
        gs.time.delayedCall(90, () => s.bot.active && s.bot.setTint(0x55705a));
      }
      hanging.forEach((h) => gs.tweens.add({ targets: h, y: h.y + 3, duration: 60, yoyo: true, repeat: 2 }));
      gs.time.delayedCall(Phaser.Math.Between(4500, 7000), pulse);
    };
    gs.time.delayedCall(2500, pulse);
  },

  ambience(gs) {
    // Esporos verdes flutuando e cinzas caindo
    gs.add
      .particles(0, 0, 'contagion_spore', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 20, max: 230 },
        lifespan: 4000,
        speedY: { min: -10, max: 6 },
        speedX: { min: -8, max: 8 },
        alpha: { start: 0.8, end: 0 },
        frequency: 140,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);
    gs.add
      .particles(0, -4, 'mote', {
        x: { min: 0, max: GAME_WIDTH },
        lifespan: 6000,
        speedY: { min: 14, max: 30 },
        speedX: { min: -10, max: 4 },
        alpha: { start: 0.5, end: 0 },
        tint: 0x8a9a8c,
        frequency: 120,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.weather);

    // Surto do vírus: tela esverdeada, faixas de glitch e a IA provocando
    const taunt = gs.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: FONT, fontSize: '8px', color: '#7aff5a' })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    const surge = () => {
      if (gs.state === 'playing') {
        for (let i = 0; i < 4; i++) {
          const bar = gs.add
            .rectangle(Phaser.Math.Between(-40, 40), Phaser.Math.Between(20, GAME_HEIGHT - 20), GAME_WIDTH, Phaser.Math.Between(2, 6), pick(Math.random, [0x5aff5a, 0x2a9a3a, 0xffffff]), 0.3)
            .setOrigin(0)
            .setScrollFactor(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.foreground + 2);
          gs.tweens.add({ targets: bar, x: bar.x + Phaser.Math.Between(-30, 30), alpha: 0, duration: 180, delay: i * 30, onComplete: () => bar.destroy() });
        }
        if (Math.random() < 0.6) {
          taunt.setText(`IA: ${pick(Math.random, TAUNTS)}`).setAlpha(1);
          gs.tweens.add({ targets: taunt, alpha: 0, delay: 1600, duration: 400 });
        }
      }
      gs.time.delayedCall(Phaser.Math.Between(7000, 12000), surge);
    };
    gs.time.delayedCall(6000, surge);
  },
};
