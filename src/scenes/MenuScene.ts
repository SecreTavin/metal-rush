import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.image(0, 0, 'bg_sky').setOrigin(0);
    this.add.tileSprite(0, 110, GAME_WIDTH, 120, 'bg_mountains').setOrigin(0);
    this.add.tileSprite(0, 160, GAME_WIDTH, 110, 'bg_ruins').setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35).setOrigin(0);

    this.add
      .text(cx, 60, 'METAL RUSH', { fontFamily: FONT, fontSize: '28px', color: '#ffcf3a' })
      .setOrigin(0.5)
      .setStroke('#6b1a10', 6);
    this.add
      .text(cx, 92, 'VERSÃO 0.1', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' })
      .setOrigin(0.5);

    const press = this.add
      .text(cx, 130, 'PRESSIONE ENTER', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);
    this.tweens.add({ targets: press, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });

    const controls = [
      'MOVER .......... SETAS / WASD',
      'MIRAR ....... CIMA / BAIXO(AR)',
      'ATIRAR ............... J / Z',
      'PULAR ........ K / X / ESPAÇO',
      'GRANADA .............. L / C',
    ];
    this.add
      .text(cx, 205, controls.join('\n'), {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#e8e8e8',
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setStroke('#000000', 2);

    const start = () => this.scene.start('Game');
    this.input.keyboard!.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}
