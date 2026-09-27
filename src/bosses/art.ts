import Phaser from 'phaser';
import { FONT } from '../config';
import { makeSheet, makeTexture, mulberry32, rand } from '../gfx/art/kit';

/*
 * Arte dos chefes, em peças separadas (animadas por código): pernas articuladas,
 * braços-martelo, pálpebras, anéis. Tudo reduzido a paletas de pixel-art.
 */

const STEEL = ['#07080c', '#12151c', '#1c212b', '#282e3a', '#363e4d', '#4a5364', '#65707f', '#8a95a4', '#b8c0cc', '#e0e6ee', '#ff2a3a', '#a01018', '#ffd0c0', '#f2c230', '#6ae0ff'];
const FORGE = [...STEEL, '#ff7a2a', '#ffc860', '#fff0b0', '#c8401c', '#5a1a0a'];
const WORM = ['#07080c', '#12151c', '#1c212b', '#282e3a', '#363e4d', '#4a5364', '#65707f', '#8a95a4', '#b8c0cc', '#e0e6ee', '#0e2a14', '#1a5a24', '#2a9a3a', '#5aff5a', '#c8ffb0', '#3a2a1a'];
const EYE = ['#02030a', '#0c1226', '#1c2848', '#2a3a60', '#4a5a80', '#8a9ac0', '#ff2a5a', '#8a1040', '#ffd0dc', '#ffffff', '#00e0ff'];

type Ctx = CanvasRenderingContext2D;

function plate(ctx: Ctx, pts: [number, number][], light: string, dark: string) {
  const ys = pts.map((p) => p[1]);
  const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = '#07080c';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  pts.forEach(([x, y], i) => {
    const ix = x + Math.sign(cx - x) * 1;
    const iy = y + Math.sign(cy - y) * 1;
    if (i) ctx.lineTo(ix, iy);
    else ctx.moveTo(ix, iy);
  });
  ctx.closePath();
  ctx.fill();
}

function hazard(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#12151c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f2c230';
  for (let i = -h; i < w + h; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 4, y + h);
    ctx.lineTo(x + i + 4 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.fill();
  }
  ctx.restore();
}

function rivets(ctx: Ctx, pts: [number, number][]) {
  for (const [x, y] of pts) {
    ctx.fillStyle = '#b8c0cc';
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }
}

export function generateBossArt(scene: Phaser.Scene) {
  if (scene.textures.exists('sent_hull')) return;
  sentinel(scene);
  forger(scene);
  worm(scene);
  eye(scene);
  shared(scene);
}

// ============================================================== VERME-MÃE (cabeça apontando para a direita)

function worm(scene: Phaser.Scene) {
  const opts = { palette: WORM, dither: 6 };
  // segmento do corpo: anel blindado com faixa verde e espinhos
  makeTexture(scene, 'worm_seg', 42, 42, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.beginPath();
    ctx.arc(21, 21, 19, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(15, 13, 2, 21, 21, 19);
    g.addColorStop(0, '#8a95a4');
    g.addColorStop(0.5, '#4a5364');
    g.addColorStop(1, '#1c212b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(21, 21, 17, 0, Math.PI * 2);
    ctx.fill();
    // placas sobrepostas
    ctx.strokeStyle = '#12151c';
    ctx.lineWidth = 2;
    for (const a of [-0.9, 0, 0.9]) {
      ctx.beginPath();
      ctx.arc(21, 21, 17, a - 0.35, a + 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a5a24';
    ctx.fillRect(4, 19, 34, 5);
    ctx.fillStyle = '#5aff5a';
    ctx.fillRect(5, 20, 32, 2);
    ctx.fillStyle = '#c8ffb0';
    ctx.fillRect(12, 20, 6, 1);
    // espinhos no dorso
    ctx.fillStyle = '#b8c0cc';
    for (const x of [13, 21, 29]) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 5);
      ctx.lineTo(x, -1);
      ctx.lineTo(x + 3, 5);
      ctx.fill();
    }
    rivets(ctx, [[10, 12], [31, 12], [10, 30], [31, 30]]);
  }, opts);
  makeTexture(scene, 'worm_tail', 26, 26, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.beginPath();
    ctx.arc(13, 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#363e4d';
    ctx.beginPath();
    ctx.arc(13, 13, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a9a3a';
    ctx.fillRect(3, 12, 20, 2);
  }, opts);
  // cabeça: cone blindado com sensores e o injetor exposto no alto
  makeTexture(scene, 'worm_head', 74, 60, (ctx) => {
    plate(ctx, [[2, 10], [30, 0], [60, 12], [72, 30], [60, 48], [30, 60], [2, 50]], '#8a95a4', '#1c212b');
    plate(ctx, [[8, 18], [34, 10], [54, 20], [62, 30], [54, 40], [34, 50], [8, 42]], '#65707f', '#12151c');
    // fileira de sensores verdes
    for (const [x, y] of [[40, 22], [48, 26], [40, 38], [48, 34]]) {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(x - 1, y - 1, 5, 4);
      ctx.fillStyle = '#5aff5a';
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = '#c8ffb0';
      ctx.fillRect(x, y, 1, 1);
    }
    // encaixe do injetor (o núcleo brilhante fica por cima, em outra textura)
    ctx.fillStyle = '#07080c';
    ctx.fillRect(16, 20, 16, 20);
    ctx.fillStyle = '#0e2a14';
    ctx.fillRect(18, 22, 12, 16);
    hazard(ctx, 4, 44, 22, 4);
    rivets(ctx, [[10, 14], [26, 8], [10, 46], [26, 52], [58, 20], [58, 40]]);
  }, opts);
  makeTexture(scene, 'worm_core', 20, 22, (ctx) => {
    // ampola do injetor: o ponto fraco
    ctx.fillStyle = '#07080c';
    ctx.fillRect(3, 0, 14, 22);
    const g = ctx.createLinearGradient(0, 0, 0, 22);
    g.addColorStop(0, '#c8ffb0');
    g.addColorStop(0.4, '#5aff5a');
    g.addColorStop(1, '#1a5a24');
    ctx.fillStyle = g;
    ctx.fillRect(5, 2, 10, 18);
    ctx.fillStyle = '#e0e6ee';
    ctx.fillRect(7, 3, 1, 14);
    ctx.fillStyle = '#4a5364';
    ctx.fillRect(1, 0, 18, 2);
    ctx.fillRect(1, 20, 18, 2);
  }, opts);
  // mandíbula (a de baixo é a mesma espelhada)
  makeTexture(scene, 'worm_jaw', 40, 14, (ctx) => {
    ctx.fillStyle = '#07080c';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(28, 0);
    ctx.lineTo(40, 10);
    ctx.lineTo(30, 8);
    ctx.lineTo(0, 12);
    ctx.fill();
    ctx.fillStyle = '#b8c0cc';
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(27, 2);
    ctx.lineTo(36, 8);
    ctx.lineTo(28, 6);
    ctx.lineTo(2, 9);
    ctx.fill();
    ctx.fillStyle = '#e0e6ee';
    for (let x = 8; x < 28; x += 5) ctx.fillRect(x, 9, 2, 3);
  }, opts);
  makeTexture(scene, 'worm_glob', 12, 12, (ctx) => {
    ctx.fillStyle = '#1a5a24';
    ctx.beginPath();
    ctx.arc(6, 6, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5aff5a';
    ctx.beginPath();
    ctx.arc(6, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ffb0';
    ctx.fillRect(3, 3, 2, 2);
  });
  makeTexture(scene, 'worm_crack', 70, 10, (ctx) => {
    ctx.strokeStyle = '#5aff5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    for (let x = 5; x <= 70; x += 5) ctx.lineTo(x, 6 + (x % 10 ? -3 : 3));
    for (const x of [15, 30, 45, 60]) {
      ctx.moveTo(x, 6);
      ctx.lineTo(x + rand(mulberry32(x), -4, 4), 0);
    }
    ctx.stroke();
  });
}

// ============================================================== SENTINELA (virado para a direita)

function sentinel(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'sent_hull',
    110,
    64,
    (ctx) => {
      // casco principal
      plate(ctx, [[6, 20], [22, 6], [78, 4], [100, 18], [106, 36], [96, 54], [16, 58], [4, 42]], '#65707f', '#1c212b');
      // placa superior
      plate(ctx, [[26, 8], [74, 6], [88, 16], [30, 20]], '#8a95a4', '#363e4d');
      // cabine com visor vermelho
      plate(ctx, [[70, 20], [100, 22], [104, 34], [74, 38]], '#4a5364', '#12151c');
      ctx.fillStyle = '#a01018';
      ctx.fillRect(78, 27, 22, 5);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(80, 28, 18, 3);
      ctx.fillStyle = '#ffd0c0';
      ctx.fillRect(92, 28, 4, 1);
      // faixas de perigo e número
      hazard(ctx, 18, 44, 50, 5);
      // marcas de unidade (sem letras, para não espelhar ao virar)
      ctx.fillStyle = '#e0e6ee';
      for (let i = 0; i < 3; i++) ctx.fillRect(22 + i * 6, 27, 4, 8);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(40, 27, 3, 8);
      // grelhas de ventilação
      ctx.fillStyle = '#07080c';
      for (let x = 50; x < 66; x += 3) ctx.fillRect(x, 24, 2, 12);
      // amassados e riscos (batalhas anteriores)
      ctx.strokeStyle = '#1c212b';
      ctx.lineWidth = 1;
      const rng = mulberry32(5);
      for (let i = 0; i < 8; i++) {
        const x = rand(rng, 12, 90);
        const y = rand(rng, 10, 52);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand(rng, -6, 6), y + rand(rng, -3, 3));
        ctx.stroke();
      }
      rivets(ctx, [[12, 24], [12, 46], [40, 12], [60, 10], [84, 50], [30, 52]]);
      // quadril
      ctx.fillStyle = '#07080c';
      ctx.fillRect(38, 54, 30, 10);
      ctx.fillStyle = '#363e4d';
      ctx.fillRect(40, 55, 26, 7);
    },
    { palette: STEEL, dither: 6 },
  );

  const limb = (key: string, w: number, h: number) =>
    makeTexture(
      scene,
      key,
      w,
      h,
      (ctx) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#363e4d');
        g.addColorStop(0.35, '#8a95a4');
        g.addColorStop(1, '#1c212b');
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = g;
        ctx.fillRect(1, 1, w - 2, h - 2);
        // pistão hidráulico lateral
        ctx.fillStyle = '#07080c';
        ctx.fillRect(w - 5, 4, 3, h - 8);
        ctx.fillStyle = '#e0e6ee';
        ctx.fillRect(w - 4, 6, 1, h - 12);
        hazard(ctx, 2, h - 8, w - 4, 3);
        rivets(ctx, [[3, 3], [3, h - 12]]);
      },
      { palette: STEEL, dither: 4 },
    );
  limb('sent_thigh', 16, 40);
  limb('sent_shin', 14, 46);

  makeTexture(
    scene,
    'sent_foot',
    34,
    12,
    (ctx) => {
      plate(ctx, [[2, 11], [6, 2], [26, 2], [33, 11]], '#65707f', '#1c212b');
      ctx.fillStyle = '#07080c';
      ctx.fillRect(10, 10, 14, 2);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(28, 7, 2, 2);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'sent_joint',
    14,
    14,
    (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.beginPath();
      ctx.arc(7, 7, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65707f';
      ctx.beginPath();
      ctx.arc(7, 7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8c0cc';
      ctx.fillRect(4, 4, 2, 2);
    },
    { palette: STEEL, dither: 0 },
  );
  // metralhadora rotativa (2 quadros: canos girando)
  makeSheet(
    scene,
    'sent_gun',
    48,
    18,
    2,
    (ctx, i) => {
      plate(ctx, [[0, 3], [18, 1], [20, 17], [0, 15]], '#4a5364', '#12151c');
      for (let k = 0; k < 3; k++) {
        const y = 4 + k * 4 + (i ? 2 : 0);
        ctx.fillStyle = '#07080c';
        ctx.fillRect(18, y - 1, 30, 4);
        ctx.fillStyle = k % 2 ? '#8a95a4' : '#65707f';
        ctx.fillRect(19, y, 28, 2);
      }
      ctx.fillStyle = '#12151c';
      ctx.fillRect(28, 2, 4, 14);
      ctx.fillRect(40, 2, 3, 14);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'sent_pod',
    32,
    24,
    (ctx) => {
      plate(ctx, [[0, 6], [30, 2], [32, 22], [2, 24]], '#65707f', '#282e3a');
      for (let k = 0; k < 4; k++) {
        const x = 5 + (k % 2) * 12;
        const y = 6 + Math.floor(k / 2) * 8;
        ctx.fillStyle = '#07080c';
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff2a3a';
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'missile',
    8,
    18,
    (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(1, 0, 6, 16);
      ctx.fillStyle = '#b8c0cc';
      ctx.fillRect(2, 1, 4, 10);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(2, 11, 4, 4);
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 13, 8, 2);
      ctx.fillStyle = '#ffc860';
      ctx.fillRect(3, 16, 2, 2);
    },
    { palette: FORGE, dither: 0 },
  );
}

// ============================================================== FORJADOR (parede à direita, virado para a esquerda)

function forger(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'forge_body',
    180,
    200,
    (ctx) => {
      const rng = mulberry32(9);
      // estrutura
      plate(ctx, [[20, 0], [180, 0], [180, 200], [0, 200], [10, 120], [4, 60]], '#4a5364', '#12151c');
      // placas de blindagem
      for (let y = 8; y < 196; y += 24) {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(14, y, 166, 1);
        rivets(ctx, [[18, y + 4], [60, y + 4], [120, y + 4], [170, y + 4]]);
      }
      // canos laterais
      for (const x of [140, 152, 164]) {
        const g = ctx.createLinearGradient(x, 0, x + 8, 0);
        g.addColorStop(0, '#363e4d');
        g.addColorStop(0.4, '#b8c0cc');
        g.addColorStop(1, '#1c212b');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 8, 200);
      }
      // "boca" da fornalha (de onde sai o metal derretido)
      ctx.fillStyle = '#07080c';
      ctx.fillRect(24, 58, 70, 34);
      const m = ctx.createLinearGradient(0, 60, 0, 90);
      m.addColorStop(0, '#fff0b0');
      m.addColorStop(0.4, '#ff7a2a');
      m.addColorStop(1, '#5a1a0a');
      ctx.fillStyle = m;
      ctx.fillRect(26, 60, 66, 30);
      ctx.fillStyle = '#07080c';
      for (let x = 30; x < 92; x += 8) ctx.fillRect(x, 60, 3, 30);
      // soquete do núcleo (o núcleo é um sprite separado)
      ctx.fillStyle = '#07080c';
      ctx.beginPath();
      ctx.arc(60, 158, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2c230';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(60, 158, 32, 0, Math.PI * 2);
      ctx.stroke();
      hazard(ctx, 14, 192, 120, 6);
      hazard(ctx, 14, 30, 120, 5);
      // letreiro
      ctx.font = `8px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#f2c230';
      ctx.fillText('FORJA-9', 34, 104);
      // sujeira e fuligem
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(7,8,12,0.4)';
        ctx.fillRect(rand(rng, 14, 170), rand(rng, 0, 200), rand(rng, 2, 6), 1);
      }
    },
    { palette: FORGE, dither: 6 },
  );
  makeTexture(
    scene,
    'forge_core',
    52,
    52,
    (ctx) => {
      const g = ctx.createRadialGradient(26, 26, 2, 26, 26, 24);
      g.addColorStop(0, '#fff0b0');
      g.addColorStop(0.35, '#ffc860');
      g.addColorStop(0.7, '#ff7a2a');
      g.addColorStop(1, '#5a1a0a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(26, 26, 24, 0, Math.PI * 2);
      ctx.fill();
      // pupila da IA dentro do metal derretido
      ctx.fillStyle = '#5a1a0a';
      ctx.beginPath();
      ctx.ellipse(26, 26, 4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(25, 18, 2, 16);
    },
    { palette: FORGE, dither: 8 },
  );
  makeTexture(
    scene,
    'forge_shutter',
    30,
    64,
    (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, 30, 64);
      const g = ctx.createLinearGradient(0, 0, 30, 0);
      g.addColorStop(0, '#65707f');
      g.addColorStop(1, '#282e3a');
      ctx.fillStyle = g;
      ctx.fillRect(1, 1, 28, 62);
      hazard(ctx, 1, 28, 28, 6);
      rivets(ctx, [[4, 4], [24, 4], [4, 56], [24, 56]]);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'forge_shaft',
    16,
    16,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 16, 0);
      g.addColorStop(0, '#363e4d');
      g.addColorStop(0.35, '#e0e6ee');
      g.addColorStop(1, '#1c212b');
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = g;
      ctx.fillRect(1, 0, 14, 16);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'forge_hammer',
    56,
    36,
    (ctx) => {
      plate(ctx, [[4, 0], [52, 0], [56, 24], [0, 24]], '#8a95a4', '#282e3a');
      hazard(ctx, 2, 16, 52, 6);
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 24, 56, 12);
      ctx.fillStyle = '#4a5364';
      for (let x = 2; x < 54; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 25);
        ctx.lineTo(x + 5, 25);
        ctx.lineTo(x + 2.5, 35);
        ctx.fill();
      }
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(24, 4, 8, 4);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'forge_trolley',
    40,
    16,
    (ctx) => {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, 40, 16);
      ctx.fillStyle = '#363e4d';
      ctx.fillRect(1, 1, 38, 12);
      hazard(ctx, 1, 1, 38, 3);
      ctx.fillStyle = '#ff2a3a';
      ctx.fillRect(18, 8, 4, 3);
    },
    { palette: STEEL, dither: 0 },
  );
  makeTexture(
    scene,
    'blob',
    12,
    12,
    (ctx) => {
      const g = ctx.createRadialGradient(5, 5, 1, 6, 6, 6);
      g.addColorStop(0, '#fff0b0');
      g.addColorStop(0.5, '#ff7a2a');
      g.addColorStop(1, '#c8401c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(6, 6, 5.5, 0, Math.PI * 2);
      ctx.fill();
    },
    { palette: FORGE, dither: 0 },
  );
  makeSheet(
    scene,
    'fire_patch',
    36,
    18,
    3,
    (ctx, i) => {
      const r2 = mulberry32(i + 3);
      for (let k = 0; k < 7; k++) {
        const x = 4 + k * 4.5;
        const h = rand(r2, 6, 16);
        const g = ctx.createLinearGradient(0, 18 - h, 0, 18);
        g.addColorStop(0, '#ffc860');
        g.addColorStop(0.5, '#ff7a2a');
        g.addColorStop(1, '#c8401c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 3, 18);
        ctx.quadraticCurveTo(x + rand(r2, -2, 2), 18 - h * 1.2, x + 3, 18);
        ctx.fill();
      }
    },
    { palette: FORGE, dither: 0 },
  );
  scene.anims.create({ key: 'fire_patch', frames: [0, 1, 2].map((frame) => ({ key: 'fire_patch', frame })), frameRate: 10, repeat: -1 });
}

// ============================================================== O OLHO

function eye(scene: Phaser.Scene) {
  makeTexture(
    scene,
    'eyeboss_ball',
    100,
    70,
    (ctx) => {
      ctx.fillStyle = '#02030a';
      ctx.beginPath();
      ctx.ellipse(50, 35, 50, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      // carcaça blindada em segmentos
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2;
        const a1 = ((i + 0.9) / 16) * Math.PI * 2;
        ctx.fillStyle = i % 2 ? '#1c2848' : '#2a3a60';
        ctx.beginPath();
        ctx.moveTo(50 + Math.cos(a0) * 34, 35 + Math.sin(a0) * 23);
        ctx.lineTo(50 + Math.cos(a0) * 48, 35 + Math.sin(a0) * 33);
        ctx.lineTo(50 + Math.cos(a1) * 48, 35 + Math.sin(a1) * 33);
        ctx.lineTo(50 + Math.cos(a1) * 34, 35 + Math.sin(a1) * 23);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#8a9ac0';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.fillRect(50 + Math.cos(a) * 44, 35 + Math.sin(a) * 30, 2, 2);
      }
      // esclera escura
      const g = ctx.createRadialGradient(50, 35, 4, 50, 35, 34);
      g.addColorStop(0, '#2a1030');
      g.addColorStop(1, '#0c1226');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(50, 35, 33, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    { palette: EYE, dither: 6 },
  );
  makeTexture(
    scene,
    'eyeboss_iris',
    40,
    40,
    (ctx) => {
      const g = ctx.createRadialGradient(20, 20, 2, 20, 20, 19);
      g.addColorStop(0, '#ffd0dc');
      g.addColorStop(0.35, '#ff2a5a');
      g.addColorStop(1, '#8a1040');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(20, 20, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd0dc';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8);
        ctx.lineTo(20 + Math.cos(a) * 16, 20 + Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.fillStyle = '#02030a';
      ctx.beginPath();
      ctx.ellipse(20, 20, 4, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(13, 12, 3, 3);
    },
    { palette: EYE, dither: 0 },
  );
  makeTexture(
    scene,
    'eyeboss_lid',
    80,
    26,
    (ctx) => {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 0, 80, 26);
      const g = ctx.createLinearGradient(0, 0, 0, 26);
      g.addColorStop(0, '#4a5a80');
      g.addColorStop(1, '#1c2848');
      ctx.fillStyle = g;
      ctx.fillRect(1, 1, 78, 24);
      ctx.fillStyle = '#02030a';
      for (let x = 8; x < 80; x += 10) ctx.fillRect(x, 1, 1, 24);
      ctx.fillStyle = '#00e0ff';
      ctx.fillRect(1, 24, 78, 1);
    },
    { palette: EYE, dither: 0 },
  );
}

// ============================================================== compartilhado

function shared(scene: Phaser.Scene) {
  makeTexture(scene, 'target_marker', 30, 10, (ctx) => {
    ctx.strokeStyle = '#ff2a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(15, 5, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(15, 5, 7, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(14, 4, 3, 2);
  });
  makeTexture(scene, 'shockwave', 40, 18, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 18);
    g.addColorStop(0, 'rgba(255,208,138,0)');
    g.addColorStop(1, 'rgba(255,208,138,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(20, -6, 40, 18);
    ctx.fill();
    ctx.fillStyle = '#fff0b0';
    ctx.fillRect(4, 16, 32, 2);
  });
  makeTexture(scene, 'boss_beam', 16, 8, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 8);
    g.addColorStop(0, 'rgba(255,42,90,0)');
    g.addColorStop(0.3, 'rgba(255,42,90,0.9)');
    g.addColorStop(0.5, 'rgba(255,230,240,1)');
    g.addColorStop(0.7, 'rgba(255,42,90,0.9)');
    g.addColorStop(1, 'rgba(255,42,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 8);
  });
}
