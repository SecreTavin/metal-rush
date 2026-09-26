import Phaser from 'phaser';
import { generateWorldArt } from '../world/art';
import { generateFx } from './art/fx';
import { Palette, pixelTexture } from './pixel';

/*
 * Texturas geradas por código. Os personagens (herói e robôs) são spritesheets em
 * public/sprites/, produzidos pelos scripts em tools/ a partir dos esboços.
 * O cenário de cada missão é gerado pelo tema (src/themes/) ao iniciar a fase.
 */

const OUTLINE = '#16161c';

const CRATE_H = [
  'kkkkkkkkkk',
  'kyyyyyyyyk',
  'kyrryyrryk',
  'kyrryyrryk',
  'kyrrrrrryk',
  'kyrrrrrryk',
  'kyrryyrryk',
  'kyrryyrryk',
  'kyyyyyyyyk',
  'kkkkkkkkkk',
];

const CRATE_B = [
  'kkkkkkkkkk',
  'kyyyyyyyyk',
  'kyrrrrryyk',
  'kyrryyrryk',
  'kyrrrrryyk',
  'kyrrrrryyk',
  'kyrryyrryk',
  'kyrrrrryyk',
  'kyyyyyyyyk',
  'kkkkkkkkkk',
];

const FLAG = [
  'kyyyyyyyy',
  'kyrrrrryy',
  'kyrryyyyy',
  'kyrrrryyy',
  'kyrryyyyy',
  'kyyyyyyyy',
  'k........',
];

export function generateTextures(scene: Phaser.Scene) {
  const crate: Palette = { k: OUTLINE, y: '#ffcf3a', r: '#c22b22' };
  pixelTexture(scene, 'crate_heavy', CRATE_H, crate);
  pixelTexture(scene, 'crate_bomb', CRATE_B, { ...crate, y: '#9fd0ff', r: '#1f3f8f' });
  pixelTexture(scene, 'flag', FLAG, { k: OUTLINE, y: '#f4f4f4', r: '#d7362b' });

  generateFx(scene);
  generateWorldArt(scene);
}
