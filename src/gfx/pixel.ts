import Phaser from 'phaser';

/** Mapa caractere -> cor. Caracteres fora do mapa (ex.: '.') são transparentes. */
export type Palette = Record<string, string>;

function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Palette,
  ox: number,
  oy: number,
  scale: number,
) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  });
}

const sizeOf = (rows: string[]) => ({
  w: Math.max(...rows.map((r) => r.length)),
  h: rows.length,
});

/** Cria uma textura a partir de pixel-art em texto. */
export function pixelTexture(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, scale = 2) {
  const { w, h } = sizeOf(rows);
  const tex = scene.textures.createCanvas(key, w * scale, h * scale);
  if (!tex) return;
  drawRows(tex.getContext(), rows, palette, 0, 0, scale);
  tex.refresh();
}

/** Cria um spritesheet (frames lado a lado, alinhados pela base) a partir de pixel-art em texto. */
export function pixelSheet(scene: Phaser.Scene, key: string, frames: string[][], palette: Palette, scale = 2) {
  const fw = Math.max(...frames.map((f) => sizeOf(f).w)) * scale;
  const fh = Math.max(...frames.map((f) => sizeOf(f).h)) * scale;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  if (!tex) return;
  const ctx = tex.getContext();
  frames.forEach((rows, i) => {
    drawRows(ctx, rows, palette, i * fw, fh - rows.length * scale, scale);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

/** Cria uma textura desenhando livremente no canvas. */
export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}
