import { FONT } from '../config';
import { pick, rand, randInt, RNG } from '../gfx/art/kit';

type Ctx = CanvasRenderingContext2D;

/** Grade de janelas com uma fração acesa (cores variadas) e o resto escuro. */
export function windows(
  ctx: Ctx,
  rng: RNG,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { cw?: number; ch?: number; ww?: number; wh?: number; lit?: number; colors: string[]; dark: string },
) {
  const cw = opts.cw ?? 4;
  const ch = opts.ch ?? 5;
  const ww = opts.ww ?? 2;
  const wh = opts.wh ?? 3;
  const lit = opts.lit ?? 0.25;
  // andares inteiros apagados deixam o prédio mais crível
  for (let yy = y; yy + wh <= y + h; yy += ch) {
    const floorLit = rng() < 0.8 ? lit : lit * 0.1;
    for (let xx = x; xx + ww <= x + w; xx += cw) {
      ctx.fillStyle = rng() < floorLit ? pick(rng, opts.colors) : opts.dark;
      ctx.fillRect(Math.round(xx), Math.round(yy), ww, wh);
    }
  }
}

/** Texto em fonte de pixel (horizontal ou vertical, uma letra por linha). */
export function pixelText(ctx: Ctx, text: string, x: number, y: number, color: string, vertical = false, size = 8) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  if (!vertical) {
    ctx.fillText(text, x, y);
    return;
  }
  [...text].forEach((c, i) => ctx.fillText(c, x, y + i * (size + 1)));
}

/** Letreiro de neon: tubo com halo (o halo é desenhado maior e translúcido antes). */
export function neonSign(ctx: Ctx, text: string, x: number, y: number, color: string, vertical = false) {
  const len = text.length;
  const w = vertical ? 12 : len * 8 + 6;
  const h = vertical ? len * 9 + 6 : 12;
  ctx.fillStyle = '#0c0a14';
  ctx.fillRect(x - 3, y - 3, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 2.5, y - 2.5, w - 1, h - 1);
  pixelText(ctx, text, x, y, color, vertical);
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, Math.max(w, h));
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y - h / 2, w * 2, h * 2);
}

/** Fios caídos entre dois pontos (catenária simples). */
export function cable(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  ctx.stroke();
}

/** Estrutura metálica com treliça em X (vigas, torres, andaimes). */
export function truss(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, light: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const step = w;
  for (let yy = y; yy < y + h; yy += step) {
    ctx.fillRect(x, yy, w, 1);
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, Math.min(yy + step, y + h));
    ctx.moveTo(x + w, yy);
    ctx.lineTo(x, Math.min(yy + step, y + h));
    ctx.stroke();
  }
  ctx.fillStyle = light;
  ctx.fillRect(x, y, 1, h);
}

/** Grafite em spray (texto com contorno e respingos). */
export function graffiti(ctx: Ctx, rng: RNG, text: string, x: number, y: number, color: string) {
  ctx.font = `8px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x + rand(rng, 0, text.length * 8), y + 8 + randInt(rng, 0, 5), 1, randInt(rng, 1, 3));
  }
}

/** Gradiente vertical preenchendo um retângulo. */
export function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Luz suave (círculo com gradiente) — para halos em camadas. */
export function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
