import Phaser from 'phaser';
import { createAnimations, generateTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    createAnimations(this);
    this.scene.start('Menu');
  }
}
