import Phaser from 'phaser';
import { FONT } from '../config';

export function explosion(scene: Phaser.Scene, x: number, y: number, size = 1) {
  const core = scene.add
    .image(x, y, 'fx_circle')
    .setTint(0xff7a2a)
    .setScale(0.1 * size)
    .setDepth(20);
  scene.tweens.add({ targets: core, scale: 1.1 * size, alpha: 0, duration: 420, onComplete: () => core.destroy() });

  const flash = scene.add
    .image(x, y, 'fx_circle')
    .setTint(0xfff1a8)
    .setScale(0.2 * size)
    .setDepth(21);
  scene.tweens.add({ targets: flash, scale: 1.4 * size, alpha: 0, duration: 260, onComplete: () => flash.destroy() });

  const sparks = scene.add
    .particles(x, y, 'fx_spark', {
      speed: { min: 60, max: 200 * size },
      angle: { min: 200, max: 340 },
      lifespan: { min: 250, max: 550 },
      gravityY: 400,
      scale: { start: 1.2, end: 0 },
      tint: [0xffe066, 0xff8a2a, 0xff4422],
      emitting: false,
    })
    .setDepth(22);
  sparks.explode(Math.round(18 * size));
  scene.time.delayedCall(800, () => sparks.destroy());
}

export function muzzleFlash(scene: Phaser.Scene, x: number, y: number) {
  const f = scene.add.image(x, y, 'fx_circle').setTint(0xffe890).setScale(0.22).setDepth(12);
  scene.time.delayedCall(40, () => f.destroy());
}

export function slash(scene: Phaser.Scene, x: number, y: number, facing: number) {
  const s = scene.add.image(x, y, 'fx_slash').setFlipX(facing < 0).setDepth(12);
  scene.tweens.add({ targets: s, alpha: 0, duration: 160, onComplete: () => s.destroy() });
}

export function floatingText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff') {
  const t = scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: '8px', color })
    .setOrigin(0.5)
    .setStroke('#000000', 2)
    .setDepth(30);
  scene.tweens.add({ targets: t, y: y - 20, alpha: 0, duration: 800, onComplete: () => t.destroy() });
}
