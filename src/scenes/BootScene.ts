import Phaser from 'phaser';
import { createAnimations, generateTextures } from '../gfx/textures';
import { createHeroAnimations, generateHeroFx } from '../gfx/art/heroFx';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Personagem principal (gerado por tools/hero/build_hero.py a partir do esboço)
    this.load.spritesheet('hero', 'sprites/hero.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('hero_laptop', 'sprites/hero_laptop.png', { frameWidth: 28, frameHeight: 16 });
  }

  create() {
    generateTextures(this);
    createAnimations(this);
    generateHeroFx(this);
    createHeroAnimations(this);
    this.scene.start('Menu');
  }
}
