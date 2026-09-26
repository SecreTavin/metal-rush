import Phaser from 'phaser';

/*
 * Kit de pixel-art procedural.
 * Desenhamos com o canvas normal (gradientes, curvas) e depois "quantizamos"
 * para uma paleta limitada com dithering ordenado — isso dá o visual de sprite
 * de arcade (Neo Geo) sem precisar de arquivos de imagem.
 */

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rng: RNG, min: number, max: number) => min + rng() * (max - min);
export const randInt = (rng: RNG, min: number, max: number) => Math.floor(rand(rng, min, max + 1));
export const pick = <T>(rng: RNG, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Reduz o canvas à paleta (com dithering Bayer 4x4) e remove semitransparência. */
export function quantize(ctx: CanvasRenderingContext2D, w: number, h: number, palette: readonly string[], dither = 16) {
  const pal = palette.map(hexToRgb);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 110) {
        d[i + 3] = 0;
        continue;
      }
      d[i + 3] = 255;
      const t = (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * dither;
      const r = d[i] + t;
      const g = d[i + 1] + t;
      const b = d[i + 2] + t;
      let best = 0;
      let bestDist = Infinity;
      for (let p = 0; p < pal.length; p++) {
        const c = pal[p];
        const dr = r - c[0];
        const dg = g - c[1];
        const db = b - c[2];
        const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      d[i] = pal[best][0];
      d[i + 1] = pal[best][1];
      d[i + 2] = pal[best][2];
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Canvas avulso para compor um objeto antes de colá-lo numa camada. */
export function offscreen(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  draw(ctx);
  return c;
}

export interface TextureOptions {
  palette?: readonly string[];
  dither?: number;
}

/** Cria (ou recria) uma textura do Phaser desenhada no canvas. */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  opts: TextureOptions = {},
) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  draw(ctx);
  if (opts.palette) quantize(ctx, w, h, opts.palette, opts.dither);
  tex.refresh();
  return tex;
}

/** Cria um spritesheet com `frames` quadros de fw x fh, lado a lado. */
export function makeSheet(
  scene: Phaser.Scene,
  key: string,
  fw: number,
  fh: number,
  frames: number,
  drawFrame: (ctx: CanvasRenderingContext2D, frame: number) => void,
  opts: TextureOptions = {},
) {
  const tex = makeTexture(
    scene,
    key,
    fw * frames,
    fh,
    (ctx) => {
      for (let i = 0; i < frames; i++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(i * fw, 0, fw, fh);
        ctx.clip();
        ctx.translate(i * fw, 0);
        drawFrame(ctx, i);
        ctx.restore();
      }
    },
    opts,
  );
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  return tex;
}

/** Desenha algo repetido em x-w, x e x+w para texturas que repetem na horizontal. */
export function wrapX(w: number, draw: (offset: number) => void) {
  for (const o of [-w, 0, w]) draw(o);
}
