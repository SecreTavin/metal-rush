import Phaser from 'phaser';
import { FONT } from '../config';
import { makeSheet, makeTexture, mulberry32, rand } from '../gfx/art/kit';

/*
 * Texturas dos elementos interativos do mundo (compartilhadas entre os temas).
 * Tudo desenhado por código; cores "tech" com metal escuro, listras de perigo e luzes.
 */

const K = '#07080c';
const METAL = { hi: '#b8c0cc', lt: '#7d8796', md: '#525b69', dk: '#343b47', dp: '#1d222b' };
const HAZ_Y = '#f2c230';

export const NEON_WORDS = ['BYTE BAR', 'NEURAL', 'HOTEL 404', 'RESISTA'];
export const BILLBOARD_MESSAGES: [string, string][] = [['OBEDE', 'ÇA!'], ['IA =', 'PAZ'], ['SYNC', 'AGORA'], ['HUMANO', '= DADO']];

function stripes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size = 4) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#16161c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = HAZ_Y;
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

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = METAL) {
  ctx.fillStyle = K;
  ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, base.lt);
  g.addColorStop(0.5, base.md);
  g.addColorStop(1, base.dk);
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = base.hi;
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillStyle = base.dp;
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
}

function rivets(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  for (const [x, y] of pts) {
    ctx.fillStyle = METAL.hi;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = METAL.dp;
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }
}

export function generateWorldArt(scene: Phaser.Scene) {
  if (scene.textures.exists('barrel')) return;
  const rng = mulberry32(777);

  // ---------- Barril explosivo
  makeTexture(scene, 'barrel', 18, 24, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(1, 0, 16, 24);
    const g = ctx.createLinearGradient(1, 0, 17, 0);
    g.addColorStop(0, '#6a1010');
    g.addColorStop(0.3, '#e0402a');
    g.addColorStop(0.55, '#b02418');
    g.addColorStop(1, '#4a0a0a');
    ctx.fillStyle = g;
    ctx.fillRect(2, 1, 14, 22);
    ctx.fillStyle = '#2a0606';
    for (const y of [5, 17]) ctx.fillRect(2, y, 14, 2);
    ctx.fillStyle = '#ff8a6a';
    for (const y of [4, 16]) ctx.fillRect(3, y, 5, 1);
    // losango de perigo
    ctx.fillStyle = HAZ_Y;
    ctx.beginPath();
    ctx.moveTo(9, 7);
    ctx.lineTo(13, 11);
    ctx.lineTo(9, 15);
    ctx.lineTo(5, 11);
    ctx.fill();
    ctx.fillStyle = K;
    ctx.fillRect(8, 9, 2, 3);
    ctx.fillRect(8, 13, 2, 1);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(4, 0, 10, 1);
  });

  // ---------- Carro flutuante destruído (e a carcaça queimada)
  const drawCar = (ctx: CanvasRenderingContext2D, burnt: boolean) => {
    const body = burnt ? ['#2a2624', '#3a3430', '#1a1716'] : ['#2f5a6a', '#4f8fa0', '#1a3440'];
    ctx.fillStyle = K;
    ctx.beginPath();
    ctx.moveTo(2, 22);
    ctx.lineTo(4, 14);
    ctx.lineTo(18, 12);
    ctx.lineTo(26, 4);
    ctx.lineTo(46, 3);
    ctx.lineTo(56, 11);
    ctx.lineTo(66, 13);
    ctx.lineTo(68, 22);
    ctx.lineTo(62, 26);
    ctx.lineTo(8, 26);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, 4, 0, 26);
    g.addColorStop(0, body[1]);
    g.addColorStop(0.5, body[0]);
    g.addColorStop(1, body[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(4, 21);
    ctx.lineTo(6, 15);
    ctx.lineTo(19, 13);
    ctx.lineTo(27, 5);
    ctx.lineTo(45, 4);
    ctx.lineTo(55, 12);
    ctx.lineTo(65, 14);
    ctx.lineTo(66, 21);
    ctx.lineTo(61, 24);
    ctx.lineTo(9, 24);
    ctx.closePath();
    ctx.fill();
    // vidros
    ctx.fillStyle = burnt ? '#0c0a0a' : '#0c1a24';
    ctx.beginPath();
    ctx.moveTo(22, 12);
    ctx.lineTo(29, 6);
    ctx.lineTo(43, 6);
    ctx.lineTo(51, 12);
    ctx.closePath();
    ctx.fill();
    if (!burnt) {
      ctx.strokeStyle = '#8ff0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 7);
      ctx.lineTo(34, 11);
      ctx.moveTo(38, 7);
      ctx.lineTo(36, 10);
      ctx.lineTo(40, 11);
      ctx.stroke();
      ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(4, 16, 3, 2);
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(63, 15, 3, 2);
      // faixa lateral
      ctx.fillStyle = '#8ff0ff';
      ctx.fillRect(10, 18, 50, 1);
    } else {
      ctx.fillStyle = '#ff7a2a';
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(rand(rng, 8, 60)), Math.floor(rand(rng, 12, 22)), 1, 1);
    }
    // amassados + propulsores
    ctx.fillStyle = K;
    ctx.fillRect(14, 24, 10, 3);
    ctx.fillRect(46, 24, 10, 3);
    ctx.fillStyle = burnt ? '#3a2a20' : '#3fc8f4';
    ctx.fillRect(15, 26, 8, 1);
    ctx.fillRect(47, 26, 8, 1);
    ctx.fillStyle = body[2];
    ctx.fillRect(30, 16, 6, 1);
    ctx.fillRect(42, 19, 4, 1);
  };
  makeTexture(scene, 'car', 70, 28, (ctx) => drawCar(ctx, false));
  makeTexture(scene, 'car_burnt', 70, 28, (ctx) => drawCar(ctx, true));

  // ---------- Gerador industrial
  makeTexture(scene, 'generator', 24, 34, (ctx) => {
    panel(ctx, 0, 4, 24, 30);
    stripes(ctx, 1, 29, 22, 4, 3);
    ctx.fillStyle = K;
    ctx.fillRect(6, 0, 12, 6);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(7, 1, 10, 4);
    // bobina com núcleo
    ctx.fillStyle = K;
    ctx.fillRect(5, 9, 14, 16);
    ctx.fillStyle = '#0f3a4a';
    ctx.fillRect(6, 10, 12, 14);
    ctx.fillStyle = '#3fc8f4';
    for (let y = 11; y < 24; y += 3) ctx.fillRect(7, y, 10, 1);
    ctx.fillStyle = '#d8fbff';
    ctx.fillRect(10, 15, 4, 4);
    rivets(ctx, [[2, 6], [21, 6], [2, 26], [21, 26]]);
  });

  // ---------- Nó de dados (núcleo)
  makeTexture(scene, 'datanode', 20, 32, (ctx) => {
    ctx.fillStyle = K;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(19, 6);
    ctx.lineTo(19, 31);
    ctx.lineTo(1, 31);
    ctx.lineTo(1, 6);
    ctx.fill();
    const g = ctx.createLinearGradient(1, 0, 19, 0);
    g.addColorStop(0, '#2a2f3c');
    g.addColorStop(0.4, '#4a5264');
    g.addColorStop(1, '#161a22');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(10, 1);
    ctx.lineTo(18, 6);
    ctx.lineTo(18, 30);
    ctx.lineTo(2, 30);
    ctx.lineTo(2, 6);
    ctx.fill();
    for (let y = 9; y < 28; y += 3) {
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(4, y, 12, 2);
      ctx.fillStyle = rng() < 0.5 ? '#ff2a2a' : '#3fc8f4';
      ctx.fillRect(5 + Math.floor(rng() * 9), y, 2, 1);
    }
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(9, 4, 2, 2);
  });

  // ---------- Câmera de segurança
  makeTexture(scene, 'camera', 16, 9, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 1, 13, 7);
    ctx.fillRect(13, 2, 3, 5);
    ctx.fillStyle = '#c9ced6';
    ctx.fillRect(1, 2, 11, 3);
    ctx.fillStyle = '#7d8796';
    ctx.fillRect(1, 5, 11, 2);
    ctx.fillStyle = '#1d222b';
    ctx.fillRect(13, 3, 2, 3);
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(14, 4, 1, 1);
  });
  makeTexture(scene, 'camera_mount', 8, 12, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, 8, 4);
    ctx.fillRect(3, 0, 2, 12);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(1, 1, 6, 2);
    ctx.fillRect(3, 3, 1, 9);
  });

  // ---------- Painel holográfico (4 mensagens de propaganda da IA)
  makeSheet(scene, 'billboard', 80, 40, 4, (ctx, i) => {
    const g = ctx.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,40,70,0.55)');
    g.addColorStop(1, 'rgba(120,20,60,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 80, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 0; y < 40; y += 2) ctx.fillRect(0, y, 80, 1);
    // olho da IA
    ctx.strokeStyle = '#ffd0d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(14, 20, 9, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(14, 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `8px ${FONT}`;
    ctx.textBaseline = 'middle';
    const [l1, l2] = BILLBOARD_MESSAGES[i];
    ctx.fillText(l1, 27, 15);
    ctx.fillStyle = '#ffb0c0';
    ctx.fillText(l2, 27, 27);
  });
  makeTexture(scene, 'billboard_frame', 86, 46, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, 86, 3);
    ctx.fillRect(0, 43, 86, 3);
    ctx.fillRect(0, 0, 3, 46);
    ctx.fillRect(83, 0, 3, 46);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(1, 1, 84, 1);
    ctx.fillRect(1, 44, 84, 1);
    ctx.fillStyle = '#ff2a4a';
    for (let x = 6; x < 82; x += 8) ctx.fillRect(x, 1, 2, 1);
  });

  // ---------- Poste futurista + cone de luz
  makeTexture(scene, 'lamp', 26, 84, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(3, 6, 4, 78);
    ctx.fillRect(0, 80, 10, 4);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(4, 6, 2, 76);
    ctx.fillStyle = METAL.lt;
    ctx.fillRect(4, 6, 1, 76);
    // braço curvo
    ctx.strokeStyle = K;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.quadraticCurveTo(8, 1, 22, 3);
    ctx.stroke();
    ctx.fillStyle = K;
    ctx.fillRect(14, 2, 12, 5);
    ctx.fillStyle = '#fff4c0';
    ctx.fillRect(15, 5, 10, 1);
    ctx.fillStyle = '#3fc8f4';
    ctx.fillRect(4, 40, 2, 3);
  });
  makeTexture(scene, 'lamp_cone', 70, 90, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 90);
    g.addColorStop(0, 'rgba(255,240,190,0.7)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(29, 0);
    ctx.lineTo(41, 0);
    ctx.lineTo(70, 90);
    ctx.lineTo(0, 90);
    ctx.fill();
  });

  // ---------- Letreiros de neon
  NEON_WORDS.forEach((word, i) => {
    const w = word.length * 8 + 12;
    makeTexture(scene, `neon_${i}`, w, 18, (ctx) => {
      ctx.fillStyle = K;
      ctx.fillRect(0, 0, w, 18);
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(1, 1, w - 2, 16);
      ctx.font = `8px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ['#ff4ad8', '#3fe8ff', '#ffd84a', '#7aff6a'][i];
      ctx.fillText(word, 6, 10);
    });
    makeTexture(scene, `neon_glow_${i}`, w + 20, 38, (ctx) => {
      const c = ['255,74,216', '63,232,255', '255,216,74', '122,255,106'][i];
      const g = ctx.createRadialGradient((w + 20) / 2, 19, 2, (w + 20) / 2, 19, (w + 20) / 2);
      g.addColorStop(0, `rgba(${c},0.5)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w + 20, 38);
    });
  });

  // ---------- Sirene de alarme + feixe giratório
  makeTexture(scene, 'beacon', 10, 9, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 6, 10, 3);
    ctx.fillRect(1, 1, 8, 6);
    ctx.fillStyle = '#ff3a2a';
    ctx.fillRect(2, 2, 6, 4);
    ctx.fillStyle = '#ffb0a0';
    ctx.fillRect(3, 2, 2, 1);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(1, 7, 8, 1);
  });
  makeTexture(scene, 'beacon_cone', 90, 30, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 90, 0);
    g.addColorStop(0, 'rgba(255,60,40,0.8)');
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(90, 0);
    ctx.lineTo(90, 30);
    ctx.lineTo(0, 17);
    ctx.fill();
  });

  // ---------- Prensa hidráulica
  makeTexture(scene, 'crusher_head', 46, 30, (ctx) => {
    panel(ctx, 0, 0, 46, 22);
    stripes(ctx, 1, 16, 44, 5, 4);
    ctx.fillStyle = K;
    ctx.fillRect(0, 22, 46, 8);
    ctx.fillStyle = '#2a2f38';
    for (let x = 1; x < 45; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, 23);
      ctx.lineTo(x + 4, 23);
      ctx.lineTo(x + 2, 29);
      ctx.fill();
    }
    ctx.fillStyle = '#ff3a2a';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(39, 4, 3, 3);
    rivets(ctx, [[10, 3], [35, 3], [10, 12], [35, 12]]);
  });
  makeTexture(scene, 'crusher_shaft', 14, 16, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, 14, 16);
    const g = ctx.createLinearGradient(1, 0, 13, 0);
    g.addColorStop(0, '#5a6270');
    g.addColorStop(0.35, '#e0e6ee');
    g.addColorStop(1, '#2a2f38');
    ctx.fillStyle = g;
    ctx.fillRect(1, 0, 12, 16);
  });
  makeTexture(scene, 'crusher_housing', 60, 22, (ctx) => {
    panel(ctx, 0, 0, 60, 22);
    stripes(ctx, 1, 1, 58, 4, 3);
    ctx.fillStyle = '#1d222b';
    ctx.fillRect(22, 8, 16, 14);
    rivets(ctx, [[4, 8], [55, 8], [4, 17], [55, 17]]);
  });

  // ---------- Laser
  makeTexture(scene, 'laser_emitter', 14, 10, (ctx) => {
    panel(ctx, 0, 0, 14, 10);
    ctx.fillStyle = K;
    ctx.fillRect(4, 6, 6, 4);
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(5, 7, 4, 2);
  });
  makeTexture(scene, 'laser_beam', 8, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 8, 0);
    g.addColorStop(0, 'rgba(255,30,30,0)');
    g.addColorStop(0.3, 'rgba(255,40,40,0.9)');
    g.addColorStop(0.5, 'rgba(255,230,230,1)');
    g.addColorStop(0.7, 'rgba(255,40,40,0.9)');
    g.addColorStop(1, 'rgba(255,30,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 16);
  });

  // ---------- Respiro de vapor (plataforma de salto)
  makeTexture(scene, 'vent', 28, 8, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, 28, 8);
    ctx.fillStyle = METAL.md;
    ctx.fillRect(1, 1, 26, 6);
    ctx.fillStyle = METAL.dp;
    for (let x = 3; x < 26; x += 3) ctx.fillRect(x, 2, 1, 4);
    ctx.fillStyle = HAZ_Y;
    ctx.fillRect(1, 1, 26, 1);
    ctx.fillStyle = '#3fc8f4';
    ctx.fillRect(12, 6, 4, 1);
  });
  makeSheet(scene, 'steam', 30, 48, 6, (ctx, i) => {
    const t = i / 5;
    const r2 = mulberry32(3);
    for (let k = 0; k < 9; k++) {
      const y = 46 - (k / 9) * 44 * (0.4 + t * 0.8);
      const r = 3 + k * 0.7 + t * 4;
      const x = 15 + rand(r2, -3, 3) * (1 + t);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = (1 - t * 0.7) * (1 - k / 12);
      g.addColorStop(0, `rgba(235,245,250,${a})`);
      g.addColorStop(1, 'rgba(235,245,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // ---------- Cabo energizado + faíscas + poça
  makeSheet(scene, 'zap', 24, 24, 4, (ctx, i) => {
    const r2 = mulberry32(i * 13 + 1);
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = k % 2 ? '#8ff0ff' : '#ffffff';
      let x = 12;
      let y = 12;
      let a = r2() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        a += rand(r2, -0.8, 0.8);
        x += Math.cos(a) * 3;
        y += Math.sin(a) * 3;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 11, 2, 2);
  });
  makeTexture(scene, 'puddle', 64, 6, (ctx) => {
    ctx.fillStyle = 'rgba(40,70,110,0.85)';
    ctx.beginPath();
    ctx.ellipse(32, 3, 31, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,0.6)';
    ctx.fillRect(12, 2, 10, 1);
    ctx.fillRect(38, 3, 14, 1);
  });

  // ---------- Esteira (repete na horizontal; a textura rola)
  makeTexture(scene, 'conveyor', 32, 14, (ctx) => {
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, 32, 14);
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(0, 1, 32, 5);
    ctx.fillStyle = '#3d444f';
    for (let x = 0; x < 32; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.lineTo(x + 3, 1);
      ctx.lineTo(x + 6, 3.5);
      ctx.lineTo(x + 3, 6);
      ctx.lineTo(x, 6);
      ctx.lineTo(x + 3, 3.5);
      ctx.fill();
    }
    ctx.fillStyle = HAZ_Y;
    ctx.fillRect(0, 0, 32, 1);
    for (let x = 4; x < 32; x += 8) {
      ctx.fillStyle = METAL.md;
      ctx.beginPath();
      ctx.arc(x, 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = METAL.hi;
      ctx.fillRect(x - 1, 8, 1, 1);
    }
  });

  // ---------- Seta "GO"
  makeTexture(scene, 'go_arrow', 44, 18, (ctx) => {
    ctx.fillStyle = K;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(44, 9);
    ctx.lineTo(26, 18);
    ctx.lineTo(26, 13);
    ctx.lineTo(0, 13);
    ctx.lineTo(0, 5);
    ctx.lineTo(26, 5);
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.moveTo(28, 3);
    ctx.lineTo(41, 9);
    ctx.lineTo(28, 15);
    ctx.lineTo(28, 11);
    ctx.lineTo(2, 11);
    ctx.lineTo(2, 7);
    ctx.lineTo(28, 7);
    ctx.fill();
  });

  // ---------- Zona de Contágio: poça de vírus e cabo-verme que sai do chão
  makeTexture(scene, 'ooze', 64, 8, (ctx) => {
    ctx.fillStyle = 'rgba(30,120,40,0.9)';
    ctx.beginPath();
    ctx.ellipse(32, 4, 31, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,255,90,0.95)';
    ctx.beginPath();
    ctx.ellipse(32, 3.6, 26, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210,255,190,0.9)';
    ctx.fillRect(14, 3, 8, 1);
    ctx.fillRect(40, 4, 10, 1);
  });
  makeTexture(scene, 'ooze_bubble', 4, 4, (ctx) => {
    ctx.fillStyle = 'rgba(160,255,140,0.9)';
    ctx.fillRect(1, 0, 2, 1);
    ctx.fillRect(0, 1, 1, 2);
    ctx.fillRect(3, 1, 1, 2);
    ctx.fillRect(1, 3, 2, 1);
  });
  makeTexture(scene, 'burrow_seg', 14, 14, (ctx) => {
    ctx.fillStyle = K;
    ctx.beginPath();
    ctx.arc(7, 7, 7, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 14, 0);
    g.addColorStop(0, '#1a2e20');
    g.addColorStop(0.45, '#4a6a52');
    g.addColorStop(1, '#10200e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(7, 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7aff5a';
    ctx.fillRect(2, 6, 10, 2);
    ctx.fillStyle = '#d0ffc0';
    ctx.fillRect(5, 6, 3, 1);
  });
  makeTexture(scene, 'burrow_head', 18, 20, (ctx) => {
    ctx.fillStyle = K;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(17, 12);
    ctx.lineTo(14, 20);
    ctx.lineTo(4, 20);
    ctx.lineTo(1, 12);
    ctx.fill();
    ctx.fillStyle = '#3a5a42';
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.lineTo(15, 12);
    ctx.lineTo(13, 19);
    ctx.lineTo(5, 19);
    ctx.lineTo(3, 12);
    ctx.fill();
    // mandíbulas e sensor
    ctx.fillStyle = '#c8d4c0';
    ctx.fillRect(3, 2, 2, 5);
    ctx.fillRect(13, 2, 2, 5);
    ctx.fillStyle = '#7aff5a';
    ctx.fillRect(7, 8, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 8, 1, 1);
  });
  makeTexture(scene, 'burrow_crack', 36, 6, (ctx) => {
    ctx.strokeStyle = '#7aff5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    for (let x = 4; x <= 36; x += 4) ctx.lineTo(x, 3 + ((x / 4) % 2 ? -2 : 2));
    ctx.stroke();
    ctx.moveTo(18, 3);
    ctx.lineTo(16, 6);
    ctx.moveTo(10, 3);
    ctx.lineTo(12, 0);
    ctx.stroke();
  });

  scene.anims.create({ key: 'steam', frames: [0, 1, 2, 3, 4, 5].map((frame) => ({ key: 'steam', frame })), frameRate: 16 });
  scene.anims.create({ key: 'zap', frames: [0, 1, 2, 3].map((frame) => ({ key: 'zap', frame })), frameRate: 20, repeat: -1 });
}
