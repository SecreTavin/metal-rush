import Phaser from 'phaser';
import { generateTextures } from '../gfx/textures';
import { createHeroAnimations, generateHeroFx } from '../gfx/art/heroFx';
import { createEnemyAnimations, generateEnemyFx } from '../gfx/art/enemyFx';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Personagem principal (tools/hero/build_hero.py)
    this.load.spritesheet('hero', 'sprites/hero.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('hero_laptop', 'sprites/hero_laptop.png', { frameWidth: 28, frameHeight: 16 });
    // Robôs-esqueleto inimigos (tools/enemy/build_enemy.py)
    this.load.spritesheet('bot_soldier', 'sprites/bot_soldier.png', { frameWidth: 40, frameHeight: 56 });
    this.load.spritesheet('bot_hunter', 'sprites/bot_hunter.png', { frameWidth: 40, frameHeight: 56 });
    this.load.spritesheet('bot_parts', 'sprites/bot_parts.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    generateTextures(this);
    generateHeroFx(this);
    createHeroAnimations(this);
    generateEnemyFx(this);
    createEnemyAnimations(this);
    this.scene.start('Menu');
  }
}
