import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { LabScene } from './scenes/LabScene';

async function waitForFont() {
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"', 'AÃÇ0'),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // segue com a fonte fallback
  }
}

waitForFont().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    // o clique direito é a arma secundária: sem menu do navegador sobre o jogo
    disableContextMenu: true,
    backgroundColor: '#000000',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GRAVITY },
        debug: new URLSearchParams(location.search).has('debug'),
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, LabScene, GameScene],
  });
  // Facilita depuração pelo console do navegador em modo dev.
  if (import.meta.env.DEV) Object.assign(window, { game });
});
