import Phaser from 'phaser';
import { GAME_HEIGHT } from '../../config';
import { makeSheet, makeTexture, mulberry32, rand } from './kit';

/*
 * Efeitos do personagem principal (dev cibernético com MacBook):
 * projéteis de código, bits no lugar de cápsulas, pendrive EMP, aura holográfica.
 */

const CYAN = ['#ffffff', '#d8fbff', '#8ff0ff', '#3fc8f4', '#1f7fd0', '#123a80'];
const MAGENTA = ['#ffffff', '#ffd6ff', '#ff8cf5', '#e04ae6', '#8a2aa8', '#3a1250'];
const EMP = ['#ffffff', '#d8fbff', '#8ff0ff', '#3fc8f4', '#1f7fd0', '#7a5aff', '#3a2490'];

const frames = (key: string, n: number) => Array.from({ length: n }, (_, frame) => ({ key, frame }));

export function generateHeroFx(scene: Phaser.Scene) {
  // ---- Projétil principal: "</>" com rastro de dados
  makeTexture(
    scene,
    'bolt_code',
    20,
    9,
    (ctx) => {
      ctx.fillStyle = '#1f7fd0';
      for (const x of [0, 3, 6]) ctx.fillRect(x, 4, 2, 1);
      ctx.lineCap = 'square';
      const glyph = (w: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(12, 1.5);
        ctx.lineTo(9, 4.5);
        ctx.lineTo(12, 7.5);
        ctx.moveTo(15.5, 0.5);
        ctx.lineTo(13.5, 8.5);
        ctx.moveTo(16, 1.5);
        ctx.lineTo(19, 4.5);
        ctx.lineTo(16, 7.5);
        ctx.stroke();
      };
      glyph(2.2, '#3fc8f4');
      glyph(1, '#ffffff');
    },
    { palette: CYAN, dither: 0 },
  );

  // ---- Projétil overclock: ">>" magenta
  makeTexture(
    scene,
    'bolt_oc',
    14,
    7,
    (ctx) => {
      ctx.fillStyle = '#8a2aa8';
      ctx.fillRect(0, 3, 3, 1);
      const chevron = (x: number, w: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, 0.5);
        ctx.lineTo(x + 3, 3.5);
        ctx.lineTo(x, 6.5);
        ctx.stroke();
      };
      for (const x of [5, 9]) {
        chevron(x, 2, '#e04ae6');
        chevron(x, 1, '#ffd6ff');
      }
    },
    { palette: MAGENTA, dither: 0 },
  );

  // ---- Impacto: o código "quebra" em pixels
  makeSheet(
    scene,
    'bolt_hit',
    18,
    18,
    4,
    (ctx, i) => {
      const rng = mulberry32(11);
      const r = 2 + i * 2.5;
      for (let k = 0; k < 10; k++) {
        const a = rng() * Math.PI * 2;
        const d = r * rand(rng, 0.5, 1.1);
        const s = i < 2 ? 2 : 1;
        ctx.fillStyle = k % 3 === 0 ? '#ffffff' : i < 2 ? '#8ff0ff' : '#1f7fd0';
        ctx.fillRect(Math.round(9 + Math.cos(a) * d), Math.round(9 + Math.sin(a) * d), s, s);
      }
      if (i === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7, 7, 4, 4);
      }
    },
    { palette: CYAN, dither: 0 },
  );

  // ---- Clarão da tela do MacBook ao disparar
  makeSheet(
    scene,
    'muzzle_code',
    16,
    16,
    2,
    (ctx, i) => {
      const r = i === 0 ? 7 : 4;
      ctx.fillStyle = '#3fc8f4';
      ctx.beginPath();
      ctx.moveTo(8, 8 - r);
      ctx.lineTo(8 + r * 0.4, 8);
      ctx.lineTo(8, 8 + r);
      ctx.lineTo(8 - r * 0.4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8 - r, 8);
      ctx.lineTo(8, 8 - r * 0.4);
      ctx.lineTo(8 + r, 8);
      ctx.lineTo(8, 8 + r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 3, 3);
    },
    { palette: CYAN, dither: 0 },
  );

  // ---- Bits "0" e "1" (substituem as cápsulas de munição)
  const glyphs = [
    ['ccc', 'c.c', 'c.c', 'c.c', 'ccc'],
    ['.c.', 'cc.', '.c.', '.c.', 'ccc'],
  ];
  makeSheet(scene, 'bits', 3, 5, 2, (ctx, i) => {
    glyphs[i].forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = '#8ff0ff';
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  });

  // ---- Pendrive EMP (granada)
  makeTexture(scene, 'usb', 10, 5, (ctx) => {
    ctx.fillStyle = '#000105';
    ctx.fillRect(0, 0, 7, 5);
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(1, 1, 5, 3);
    ctx.fillStyle = '#5a4a8a';
    ctx.fillRect(1, 1, 5, 1);
    ctx.fillStyle = '#8ff0ff';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillStyle = '#000105';
    ctx.fillRect(7, 1, 3, 3);
    ctx.fillStyle = '#c9ccd2';
    ctx.fillRect(7, 2, 2, 1);
  });

  // ---- Explosão EMP: anel elétrico que se expande
  const S = 80;
  makeSheet(
    scene,
    'emp',
    S,
    S,
    9,
    (ctx, i) => {
      const t = i / 8;
      const c = S / 2;
      const R = 6 + 32 * (1 - Math.pow(1 - t, 2));
      if (t < 0.45) {
        const g = ctx.createRadialGradient(c, c, 0, c, c, R * 0.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#8ff0ff');
        g.addColorStop(1, 'rgba(63,200,244,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c, c, R * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = t < 0.5 ? '#d8fbff' : '#3fc8f4';
      ctx.lineWidth = Math.max(1, 5 * (1 - t));
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#7a5aff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c, c, R + 2, 0, Math.PI * 2);
      ctx.stroke();
      // raios
      if (t < 0.8) {
        const rng = mulberry32(i * 31 + 5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          let a = rng() * Math.PI * 2;
          let x = c;
          let y = c;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 0; s < 5; s++) {
            a += rand(rng, -0.6, 0.6);
            x += Math.cos(a) * (R / 5);
            y += Math.sin(a) * (R / 5);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    },
    { palette: EMP, dither: 0 },
  );

  // ---- Aura holográfica (suave, aplicada com blend aditivo)
  makeTexture(scene, 'hero_aura', 64, 72, (ctx) => {
    ctx.save();
    ctx.translate(32, 36);
    ctx.scale(1, 1.2);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(140,90,255,0.55)');
    g.addColorStop(0.5, 'rgba(60,190,255,0.28)');
    g.addColorStop(1, 'rgba(60,190,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ---- Anel de "hover" nos pés (tracejado girando)
  makeSheet(scene, 'hero_ring', 30, 8, 4, (ctx, i) => {
    for (let k = 0; k < 16; k++) {
      if ((k + i) % 4 >= 2) continue;
      const a = (k / 16) * Math.PI * 2;
      const x = Math.round(15 + Math.cos(a) * 13);
      const y = Math.round(4 + Math.sin(a) * 3);
      ctx.fillStyle = k % 2 ? '#8ff0ff' : '#b890ff';
      ctx.fillRect(x, y, 2, 1);
    }
  });

  // ---- Linha de varredura holográfica
  makeTexture(scene, 'scanline', 22, 1, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 22, 0);
    g.addColorStop(0, 'rgba(143,240,255,0)');
    g.addColorStop(0.5, 'rgba(143,240,255,1)');
    g.addColorStop(1, 'rgba(143,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 22, 1);
  });

  // ---- Feixe de teletransporte (respawn)
  makeTexture(scene, 'beam', 24, GAME_HEIGHT, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 24, 0);
    g.addColorStop(0, 'rgba(63,200,244,0)');
    g.addColorStop(0.35, 'rgba(143,240,255,0.8)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(0.65, 'rgba(143,240,255,0.8)');
    g.addColorStop(1, 'rgba(63,200,244,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, GAME_HEIGHT);
  });

  scene.anims.create({ key: 'bolt_hit', frames: frames('bolt_hit', 4), frameRate: 24 });
  scene.anims.create({ key: 'muzzle_code', frames: frames('muzzle_code', 2), frameRate: 30 });
  scene.anims.create({ key: 'emp', frames: frames('emp', 9), frameRate: 22 });
  scene.anims.create({ key: 'hero_ring', frames: frames('hero_ring', 4), frameRate: 10, repeat: -1 });
}

/** Animações do corpo do herói (spritesheet gerado por tools/hero/build_hero.py). */
export function createHeroAnimations(scene: Phaser.Scene) {
  const f = (list: number[]) => list.map((frame) => ({ key: 'hero', frame }));
  scene.anims.create({ key: 'hero-idle', frames: f([0, 1, 2, 3]), frameRate: 4, repeat: -1 });
  scene.anims.create({ key: 'hero-run', frames: f([4, 5, 6, 7, 8, 9]), frameRate: 13, repeat: -1 });
  scene.anims.create({ key: 'hero-jump', frames: f([10]) });
  scene.anims.create({ key: 'hero-fall', frames: f([11]) });
  scene.anims.create({ key: 'hero-hurt', frames: f([12]) });
}

/** Deslocamento vertical do tronco em cada quadro do corpo (para o braço acompanhar). */
export const HERO_BOB = [0, 0, 1, 1, 1, 0, -1, 1, 0, -1, -1, 0, 0];
