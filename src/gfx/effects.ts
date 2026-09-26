import Phaser from 'phaser';
import { FONT } from '../config';

/** Toca uma animação de efeito uma vez e remove o sprite no fim. */
function playOnce(scene: Phaser.Scene, x: number, y: number, anim: string, depth: number) {
  const s = scene.add.sprite(x, y, anim, 0).setDepth(depth);
  s.play(anim);
  s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  return s;
}

export function explosion(scene: Phaser.Scene, x: number, y: number, size = 1) {
  playOnce(scene, x, y - 12 * size, 'boom', 20).setScale(size);
  const debris = scene.add
    .particles(x, y, 'fx_spark', {
      speed: { min: 80, max: 220 * size },
      angle: { min: 210, max: 330 },
      lifespan: { min: 300, max: 650 },
      gravityY: 500,
      scale: { start: 0.9, end: 0.2 },
      tint: [0xffe066, 0xff8a2a, 0x7b5d36],
      emitting: false,
    })
    .setDepth(21);
  debris.explode(Math.round(14 * size));
  scene.time.delayedCall(900, () => debris.destroy());
}

export function muzzleFlash(scene: Phaser.Scene, x: number, y: number, angle: number, anim = 'muzzle', tint?: number) {
  const s = playOnce(scene, x, y, anim, 12).setRotation(angle);
  if (anim === 'muzzle') s.setOrigin(0, 0.5);
  if (Math.abs(angle) > Math.PI / 2) s.setFlipY(true);
  if (tint !== undefined) s.setTint(tint);
}

export function impactSpark(scene: Phaser.Scene, x: number, y: number, anim = 'spark') {
  playOnce(scene, x, y, anim, 12);
}

/** Pulso eletromagnético do pendrive (granada do herói). */
export function empBlast(scene: Phaser.Scene, x: number, y: number) {
  playOnce(scene, x, y - 10, 'emp', 20).setBlendMode(Phaser.BlendModes.ADD);
  const bits = scene.add
    .particles(x, y - 10, 'bits', {
      frame: [0, 1],
      speed: { min: 60, max: 180 },
      lifespan: { min: 300, max: 700 },
      alpha: { start: 1, end: 0 },
      tint: [0x8ff0ff, 0xb890ff, 0xffffff],
      emitting: false,
    })
    .setDepth(21);
  bits.explode(22);
  scene.time.delayedCall(900, () => bits.destroy());
}

export function dustPuff(scene: Phaser.Scene, x: number, y: number, scale = 1) {
  playOnce(scene, x, y - 5 * scale, 'puff', 9).setScale(scale).setAlpha(0.85);
}

export function slash(scene: Phaser.Scene, x: number, y: number, facing: number, tint = 0xffffff) {
  const s = scene.add.image(x, y, 'fx_slash').setFlipX(facing < 0).setDepth(12).setTint(tint);
  scene.tweens.add({ targets: s, alpha: 0, duration: 160, onComplete: () => s.destroy() });
}

export function floatingText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff') {
  const t = scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: '8px', color })
    .setOrigin(0.5)
    .setStroke('#000000', 3)
    .setDepth(30);
  scene.tweens.add({ targets: t, y: y - 20, alpha: 0, duration: 800, onComplete: () => t.destroy() });
}
