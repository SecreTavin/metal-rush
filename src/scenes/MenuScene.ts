import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MISSIONS } from '../level/missions';
import { THEMES } from '../themes';
import type { GameInit } from './GameScene';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Fundo: cenário da primeira missão deslizando lentamente
    const first = MISSIONS[0];
    const theme = THEMES[first.theme];
    theme.generate(this, first);
    theme.menuLayers.forEach((key, i) => {
      const img = this.add.image(0, 0, key).setOrigin(0);
      if (i > 0) this.tweens.add({ targets: img, x: -(200 + i * 260), duration: 70000, yoyo: true, repeat: -1 });
    });
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040c, 0.55).setOrigin(0);

    this.add
      .text(cx, 50, 'METAL RUSH', { fontFamily: FONT, fontSize: '28px', color: '#ffcf3a' })
      .setOrigin(0.5)
      .setStroke('#6b1a10', 6);
    this.add
      .text(cx, 80, 'O ULTIMO DEV CONTRA AS IAS', { fontFamily: FONT, fontSize: '8px', color: '#8ff0ff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    const press = this.add
      .text(cx, 112, 'PRESSIONE ENTER', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);
    this.tweens.add({ targets: press, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });

    const missions = MISSIONS.map((m, i) => `${i + 1} - ${m.subtitle}`).join('\n');
    this.add
      .text(cx, 146, missions, { fontFamily: FONT, fontSize: '8px', color: '#ff8cf5', lineSpacing: 4, align: 'center' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    const controls = [
      'MOVER .......... SETAS / WASD',
      'MIRAR ....... CIMA / BAIXO(AR)',
      'ATIRAR ............... J / Z',
      'PULAR ........ K / X / ESPAÇO',
      'PENDRIVE EMP ......... L / C',
    ];
    this.add
      .text(cx, 218, controls.join('\n'), {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#e8e8e8',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setStroke('#000000', 2);

    const start = (mission = 0) => this.scene.start('Game', { mission } satisfies GameInit);
    this.input.keyboard!.once('keydown-ENTER', () => start());
    this.input.once('pointerdown', () => start());
    // Teclas 1..N escolhem a missão
    MISSIONS.forEach((_, i) => {
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i]}`, () => start(i));
    });
  }
}
