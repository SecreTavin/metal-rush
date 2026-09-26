import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MISSION_COUNT, MISSION_SOURCES } from '../level/missions';
import { THEMES } from '../themes';
import type { GameInit } from './GameScene';
import { RunState } from '../run/RunState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Fundo: cenário da primeira missão deslizando lentamente
    const first = MISSION_SOURCES[0];
    const theme = THEMES[first.theme];
    theme.generate(this, first.layout);
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

    this.add
      .text(cx, 146, 'CADA RUN E UNICA. MORREU, RECOMEÇA.\nSKILLS, FRAGMENTOS E CHEFES.', { fontFamily: FONT, fontSize: '8px', color: '#ff8cf5', lineSpacing: 4, align: 'center' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    const controls = [
      'MOVER .......... SETAS / WASD',
      'MIRAR ....... CIMA / BAIXO(AR)',
      'ATIRAR ............... J / Z',
      'PULAR ........ K / X / ESPAÇO',
      'PENDRIVE EMP ......... L / C',
      'UPGRADE (TERMINAL) ..... CIMA',
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

    const toLab = () => this.scene.start('Lab');
    this.input.keyboard!.once('keydown-ENTER', toLab);
    this.input.once('pointerdown', toLab);
    // Atalho de desenvolvimento: teclas 1..N começam uma run direto na missão
    if (import.meta.env.DEV) {
      Array.from({ length: MISSION_COUNT }).forEach((_, i) => {
        this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i]}`, () => {
          const run = new RunState();
          run.mission = i;
          this.scene.start('Game', { run } satisfies GameInit);
        });
      });
    }
  }
}
