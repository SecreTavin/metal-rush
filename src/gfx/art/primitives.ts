import { offscreen, rand, randInt, RNG } from './kit';
import type { Shades } from './palettes';

type Ctx = CanvasRenderingContext2D;

export function shadedCircle(ctx: Ctx, x: number, y: number, r: number, light: string, dark: string) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Moita/copa: camadas de "bolhas" sombreadas, escuras atrás e claras na frente/topo. */
export function foliage(
  ctx: Ctx,
  rng: RNG,
  x: number,
  y: number,
  w: number,
  h: number,
  s: Shades,
  rMin = 6,
  rMax = 14,
) {
  const area = w * h;
  const rAvg = (rMin + rMax) / 2;
  const n = Math.max(3, Math.round(area / (rAvg * rAvg * 1.6)));
  for (let i = 0; i < n; i++) {
    const r = rand(rng, rMin, rMax);
    shadedCircle(ctx, x + rng() * w, y + h * 0.3 + rng() * h * 0.7, r, s.dark, s.deep);
  }
  for (let i = 0; i < n * 0.8; i++) {
    const r = rand(rng, rMin, rMax) * 0.85;
    shadedCircle(ctx, x + rng() * w, y + rng() * h * 0.8, r, s.base, s.dark);
  }
  for (let i = 0; i < n * 0.45; i++) {
    const r = rand(rng, rMin, rMax) * 0.5;
    shadedCircle(ctx, x + rng() * w, y + rng() * h * 0.5, r, s.light, s.base);
  }
}

/** Cipó pendurado com folhinhas. */
export function vine(ctx: Ctx, rng: RNG, x: number, y: number, len: number, s: Shades) {
  const sway = rand(rng, -14, 14);
  const cx = x + sway * 1.6;
  const cy = y + len * 0.5;
  const ex = x + sway;
  const ey = y + len;
  ctx.strokeStyle = s.deep;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  const steps = Math.floor(len / 5);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
    const side = i % 2 ? 1 : -1;
    ctx.fillStyle = i % 3 === 0 ? s.light : s.base;
    ctx.beginPath();
    ctx.ellipse(px + side * 2.5, py, 2.8, 1.6, side * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Blocos de pedra (retângulo), com luz no topo-esquerda, sombra, lascas e rachaduras. */
export function stoneBlock(ctx: Ctx, rng: RNG, x: number, y: number, w: number, h: number, s: Shades) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, s.light);
  g.addColorStop(0.35, s.base);
  g.addColorStop(1, s.dark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = s.light;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = s.deep;
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x + w - 1, y, 1, h);
  // lascas
  for (let i = 0; i < (w * h) / 90; i++) {
    const px = x + 2 + rng() * (w - 4);
    const py = y + 2 + rng() * (h - 4);
    ctx.fillStyle = s.dark;
    ctx.fillRect(px, py, randInt(rng, 1, 2), 1);
    ctx.fillStyle = s.light;
    ctx.fillRect(px, py + 1, 1, 1);
  }
  // rachadura
  if (rng() < 0.25 && w > 10) {
    ctx.strokeStyle = s.deep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    let cx = x + rand(rng, 3, w - 3);
    let cy = y + 1;
    ctx.moveTo(cx, cy);
    while (cy < y + h - 2) {
      cx += rand(rng, -2, 2);
      cy += rand(rng, 2, 4);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

/** Musgo escorrendo a partir de uma linha superior. */
export function mossTop(ctx: Ctx, rng: RNG, x: number, y: number, w: number, s: Shades, thickness = 4) {
  for (let px = x; px < x + w; px += 2) {
    const drip = rng() < 0.12 ? randInt(rng, 4, 12) : randInt(rng, 1, thickness);
    ctx.fillStyle = s.dark;
    ctx.fillRect(px, y, 2, drip + 1);
    ctx.fillStyle = s.base;
    ctx.fillRect(px, y, 2, Math.max(1, drip - 1));
    if (rng() < 0.5) {
      ctx.fillStyle = s.light;
      ctx.fillRect(px, y, 2, 1);
    }
  }
  // tufos por cima
  for (let px = x; px < x + w; px += randInt(rng, 3, 7)) {
    shadedCircle(ctx, px, y, rand(rng, 1.5, 3.5), s.light, s.base);
  }
}

/** Remove "mordidas" do topo para parecer ruína quebrada. */
export function ruinTop(ctx: Ctx, rng: RNG, w: number, maxDepth: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  let x = 0;
  while (x < w) {
    const cw = randInt(rng, 8, 30);
    if (rng() < 0.55) ctx.fillRect(x, 0, cw, randInt(rng, 4, maxDepth));
    x += cw;
  }
  ctx.restore();
}

/** Muro de tijolos de pedra em ruínas. Retorna um canvas próprio. */
export function brickWall(
  rng: RNG,
  w: number,
  h: number,
  s: Shades,
  moss?: Shades,
  opts: { brickW?: number; brickH?: number; arch?: boolean } = {},
) {
  const bw = opts.brickW ?? 26;
  const bh = opts.brickH ?? 12;
  return offscreen(w, h, (ctx) => {
    for (let y = 0; y < h; y += bh) {
      let x = -rng() * bw;
      while (x < w) {
        const cw = Math.round(rand(rng, bw * 0.7, bw * 1.3));
        stoneBlock(ctx, rng, Math.round(x), y, cw, bh, s);
        x += cw;
      }
    }
    if (opts.arch) {
      const aw = w * 0.42;
      const ax = (w - aw) / 2;
      const top = h * 0.35;
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.moveTo(ax, h);
      ctx.lineTo(ax, top + aw / 2);
      ctx.arc(ax + aw / 2, top + aw / 2, aw / 2, Math.PI, 0);
      ctx.lineTo(ax + aw, h);
      ctx.fill();
      // pedras do arco
      ctx.strokeStyle = s.light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax + aw / 2, top + aw / 2, aw / 2 + 2, Math.PI, 0);
      ctx.stroke();
    }
    ruinTop(ctx, rng, w, Math.min(26, h * 0.3));
    if (moss) {
      for (let i = 0; i < w / 30; i++) {
        const mx = rng() * w;
        mossTop(ctx, rng, mx, randInt(rng, 2, 16), randInt(rng, 8, 24), moss, 3);
      }
    }
  });
}

/** Coluna/pilar de pedra, opcionalmente quebrada. */
export function column(rng: RNG, w: number, h: number, s: Shades, moss?: Shades, broken = true) {
  return offscreen(w + 6, h, (ctx) => {
    const x = 3;
    const capH = broken ? 0 : 8;
    // base
    stoneBlock(ctx, rng, 0, h - 8, w + 6, 8, s);
    // fuste
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, s.base);
    g.addColorStop(0.25, s.light);
    g.addColorStop(0.6, s.base);
    g.addColorStop(1, s.deep);
    ctx.fillStyle = g;
    ctx.fillRect(x, capH, w, h - 8 - capH);
    // caneluras
    ctx.fillStyle = s.dark;
    for (let fx = x + 3; fx < x + w - 2; fx += 4) ctx.fillRect(fx, capH, 1, h - 8 - capH);
    // juntas dos tambores
    for (let jy = capH + randInt(rng, 14, 22); jy < h - 12; jy += randInt(rng, 16, 26)) {
      ctx.fillStyle = s.deep;
      ctx.fillRect(x, jy, w, 1);
      ctx.fillStyle = s.light;
      ctx.fillRect(x, jy + 1, w, 1);
    }
    if (!broken) stoneBlock(ctx, rng, 0, 0, w + 6, capH, s);
    else ruinTop(ctx, rng, w + 6, 14);
    if (moss) mossTop(ctx, rng, 0, broken ? 10 : 0, w + 6, moss, 3);
  });
}

/** Tronco de árvore com raízes. */
export function trunk(rng: RNG, w: number, h: number, s: Shades) {
  const rootW = w * 2.4;
  return offscreen(rootW, h, (ctx) => {
    const cx = rootW / 2;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, s.dark);
    g.addColorStop(0.3, s.light);
    g.addColorStop(0.55, s.base);
    g.addColorStop(1, s.deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, 0);
    ctx.lineTo(cx + w / 2, 0);
    ctx.lineTo(cx + w / 2, h - w);
    ctx.quadraticCurveTo(cx + w * 0.6, h - 4, rootW, h);
    ctx.lineTo(0, h);
    ctx.quadraticCurveTo(cx - w * 0.6, h - 4, cx - w / 2, h - w);
    ctx.closePath();
    ctx.fill();
    // casca
    ctx.strokeStyle = s.deep;
    ctx.lineWidth = 1;
    for (let i = 0; i < w / 3; i++) {
      let bx = cx - w / 2 + rand(rng, 2, w - 2);
      let by = rand(rng, 0, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      const len = rand(rng, 20, 80);
      for (let t = 0; t < len; t += 6) {
        bx += rand(rng, -1, 1);
        by += 6;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    // nós
    for (let i = 0; i < 2; i++) {
      const kx = cx + rand(rng, -w / 4, w / 4);
      const ky = rand(rng, 20, h - 40);
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = s.light;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 4, 6, 0, Math.PI * 0.9, Math.PI * 1.6);
      ctx.stroke();
    }
  });
}

/** Grande cabeça de pedra esculpida (ídolo da selva) — desenho original. */
export function stoneHead(rng: RNG, w: number, h: number, s: Shades, moss?: Shades, vines?: Shades) {
  return offscreen(w, h, (ctx) => {
    // Bloco base com leve afunilamento
    ctx.fillStyle = s.base;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h);
    ctx.lineTo(w * 0.04, h * 0.2);
    ctx.lineTo(w * 0.14, h * 0.04);
    ctx.lineTo(w * 0.86, h * 0.04);
    ctx.lineTo(w * 0.96, h * 0.2);
    ctx.lineTo(w * 0.92, h);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    // Blocos de alvenaria
    const rows = 7;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rng() * 30;
      while (x < w) {
        const cw = rand(rng, 26, 44);
        stoneBlock(ctx, rng, Math.round(x), Math.round(r * rh), Math.round(cw), Math.ceil(rh), s);
        x += cw;
      }
    }
    // Sombra lateral direita (volume)
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(255,240,200,0.18)');
    side.addColorStop(0.5, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(20,10,0,0.45)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const cx = w / 2;
    // Cocar/faixa superior
    ctx.fillStyle = s.dark;
    ctx.fillRect(w * 0.1, h * 0.17, w * 0.8, h * 0.05);
    ctx.fillStyle = s.light;
    ctx.fillRect(w * 0.1, h * 0.15, w * 0.8, h * 0.025);
    for (let i = 0; i < 6; i++) {
      const bx = w * 0.14 + i * w * 0.13;
      ctx.fillStyle = s.deep;
      ctx.fillRect(bx, h * 0.07, w * 0.07, h * 0.06);
      ctx.fillStyle = s.light;
      ctx.fillRect(bx, h * 0.07, w * 0.07, 2);
    }
    // Sobrancelha (arco saliente)
    for (const dir of [-1, 1]) {
      const ex = cx + dir * w * 0.2;
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.ellipse(ex, h * 0.4, w * 0.15, h * 0.05, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = s.light;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ex, h * 0.37, w * 0.16, h * 0.05, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // Olho: cavidade escura + globo de pedra
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.ellipse(ex, h * 0.45, w * 0.11, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.base;
      ctx.beginPath();
      ctx.ellipse(ex, h * 0.455, w * 0.075, h * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.light;
      ctx.fillRect(ex - w * 0.05, h * 0.44, w * 0.04, 2);
      // Orelheira
      const ox = cx + dir * w * 0.42;
      ctx.fillStyle = s.dark;
      ctx.fillRect(ox - w * 0.05, h * 0.42, w * 0.1, h * 0.2);
      ctx.fillStyle = s.light;
      ctx.beginPath();
      ctx.arc(ox, h * 0.52, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.arc(ox, h * 0.52, w * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nariz
    ctx.fillStyle = s.light;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.03, h * 0.42);
    ctx.lineTo(cx - w * 0.1, h * 0.64);
    ctx.lineTo(cx, h * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = s.dark;
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.03, h * 0.42);
    ctx.lineTo(cx + w * 0.1, h * 0.64);
    ctx.lineTo(cx, h * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = s.deep;
    ctx.fillRect(cx - w * 0.08, h * 0.64, w * 0.05, 3);
    ctx.fillRect(cx + w * 0.03, h * 0.64, w * 0.05, 3);
    // Boca
    ctx.fillStyle = s.light;
    ctx.fillRect(cx - w * 0.2, h * 0.73, w * 0.4, h * 0.025);
    ctx.fillStyle = s.deep;
    ctx.fillRect(cx - w * 0.22, h * 0.755, w * 0.44, h * 0.03);
    ctx.fillStyle = s.dark;
    ctx.fillRect(cx - w * 0.18, h * 0.785, w * 0.36, h * 0.025);
    ctx.fillStyle = s.light;
    ctx.fillRect(cx - w * 0.16, h * 0.81, w * 0.32, 2);
    // Queixo
    ctx.fillStyle = s.deep;
    ctx.fillRect(cx - w * 0.25, h * 0.9, w * 0.5, 2);

    ruinTop(ctx, rng, w, 10);
    if (moss) {
      mossTop(ctx, rng, w * 0.1, h * 0.04, w * 0.8, moss, 5);
      mossTop(ctx, rng, w * 0.15, h * 0.15, w * 0.3, moss, 3);
    }
    if (vines) {
      for (let i = 0; i < 4; i++) vine(ctx, rng, w * rand(rng, 0.15, 0.85), h * 0.05, rand(rng, 30, h * 0.5), vines);
    }
  });
}

/** Pirâmide escalonada (silhueta distante). */
export function steppedPyramid(ctx: Ctx, rng: RNG, x: number, baseY: number, w: number, h: number, fill: string, edge: string) {
  const steps = randInt(rng, 4, 6);
  const sh = h / (steps + 1);
  for (let i = 0; i < steps; i++) {
    const sw = w * (1 - i / (steps + 1));
    const sx = x + (w - sw) / 2;
    const sy = baseY - (i + 1) * sh;
    ctx.fillStyle = fill;
    ctx.fillRect(sx, sy, sw, sh + 1);
    ctx.fillStyle = edge;
    ctx.fillRect(sx, sy, sw, 2);
  }
  const tw = w * 0.18;
  ctx.fillStyle = fill;
  ctx.fillRect(x + (w - tw) / 2, baseY - h, tw, sh + 1);
  ctx.fillStyle = edge;
  ctx.fillRect(x + (w - tw) / 2, baseY - h, tw, 2);
}
