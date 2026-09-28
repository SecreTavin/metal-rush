import Phaser from 'phaser';
import { generateTextures } from '../gfx/textures';
import { createHeroAnimations, generateHeroFx } from '../gfx/art/heroFx';
import { createEnemyAnimations, generateEnemyFx } from '../gfx/art/enemyFx';
import { generateRunArt } from '../run/art';
import { generateBossArt } from '../bosses/art';
import { audio } from '../audio/Audio';

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
    this.load.spritesheet('bot_infected', 'sprites/bot_infected.png', { frameWidth: 40, frameHeight: 56 });
    this.load.spritesheet('bot_parts', 'sprites/bot_parts.png', { frameWidth: 16, frameHeight: 16 });
    // Armas e itens (tools/weapons/build_weapons.py)
    this.load.spritesheet('gear_icons', 'sprites/gear_icons.png', { frameWidth: 26, frameHeight: 22 });
    this.load.spritesheet('gear_shield', 'sprites/gear_shield.png', { frameWidth: 28, frameHeight: 30 });
    this.load.spritesheet('gear_throw_arm', 'sprites/gear_throw_arm.png', { frameWidth: 18, frameHeight: 11 });
    this.load.spritesheet('gear_dog', 'sprites/gear_dog.png', { frameWidth: 26, frameHeight: 20 });
    for (const key of ['gear_whip_arm', 'gear_vga_plug', 'gear_raspberry', 'gear_helmet', 'gear_chest', 'gear_armband']) {
      this.load.image(key, `sprites/${key}.png`);
    }
  }

  create() {
    generateTextures(this);
    generateHeroFx(this);
    createHeroAnimations(this);
    generateEnemyFx(this);
    createEnemyAnimations(this);
    generateRunArt(this);
    generateBossArt(this);
    audio.init(this.game);
    this.scene.start('Menu');
  }
}
