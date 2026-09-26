import Phaser from 'phaser';
import { LEVEL_1 } from '../level/level1';
import { generateFx } from './art/fx';
import { generateProps } from './art/props';
import { generateScenery } from './art/scenery';
import { Palette, pixelSheet, pixelTexture } from './pixel';

/*
 * Todos os gráficos atuais são PLACEHOLDERS gerados por código.
 * Para trocar por sprites definitivos, basta carregar imagens com as mesmas
 * chaves (ex.: 'player', 'enemy_soldier') no BootScene e remover a geração aqui.
 */

// ---------- Personagens (16x18 px, desenhados em escala 2 => 32x36) ----------

const HEADS = {
  bandana: [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '..rrkrrrrrrk....',
  ],
  helmet: [
    '....kkkkkkkk....',
    '...krrrrrrrrk...',
    '..kkkkkkkkkkkk..',
  ],
  beret: [
    '................',
    '....kkkkkkk.....',
    '...krrrrrrrk....',
  ],
};

const BODY = [
  '....kssssssk....',
  '....ksssskskk...',
  '....kssssssk....',
  '.....kssssk.....',
  '....kggggggk....',
  '...kgGggggGgk...',
  '...kgGggggGgk...',
  '...ksggggggsk...',
  '...kskGGGGksk...',
  '....kbbbbbbk....',
];

const LEGS = {
  idle: [
    '....kbbkkbbk....',
    '....kbbkkbbk....',
    '....kbbkkbbk....',
    '....kbbkkbbk....',
    '....kkkkkkkk....',
    '...kkkk..kkkk...',
  ],
  run1: [
    '....kbbkkbbk....',
    '...kbbk..kbbk...',
    '..kbbk....kbbk..',
    '..kbk......kbk..',
    '..kbk......kbk..',
    '.kkkk......kkkk.',
  ],
  run2: [
    '....kbbkkbbk....',
    '.....kbbbbk.....',
    '.....kbkkbk.....',
    '.....kbkkbk.....',
    '.....kbkkbk.....',
    '....kkkkkkkk....',
  ],
  jump: [
    '....kbbkkbbk....',
    '...kbbk..kbbk...',
    '..kbbk...kbbk...',
    '..kkk....kbk....',
    '.........kkk....',
    '................',
  ],
};

/** Frames: 0 parado, 1-2 correndo, 3 pulando. */
function characterFrames(head: keyof typeof HEADS): string[][] {
  const top = [...HEADS[head], ...BODY];
  return [LEGS.idle, LEGS.run1, LEGS.run2, LEGS.jump].map((legs) => [...top, ...legs]);
}

const SKIN = '#f1c08f';
const OUTLINE = '#16161c';

export const CHARACTERS: { key: string; head: keyof typeof HEADS; palette: Palette }[] = [
  {
    key: 'player',
    head: 'bandana',
    palette: { k: OUTLINE, s: SKIN, r: '#d7362b', g: '#4d7b3b', G: '#2f5424', b: '#35598f' },
  },
  {
    key: 'enemy_soldier',
    head: 'helmet',
    palette: { k: OUTLINE, s: SKIN, r: '#6d6b3b', g: '#b89c5c', G: '#846c3c', b: '#6d6b3b' },
  },
  {
    key: 'enemy_rusher',
    head: 'beret',
    palette: { k: OUTLINE, s: SKIN, r: '#8b1e1e', g: '#5a5a66', G: '#3a3a44', b: '#2d2d33' },
  },
];

// ---------- Armas e projéteis ----------

const METAL: Palette = { k: OUTLINE, m: '#9aa0a8', M: '#5b5f66', w: '#dfe6ee' };

const GUN_PISTOL = [
  'kkkkkkkk',
  'kmmmmmmk',
  'kMkkkkk.',
  'kk......',
];

const GUN_HEAVY = [
  '..kkkkkkkkkkk.',
  'kkMMMMMMMMMMMk',
  'kMmmmmmmmmmmmk',
  'kMkkkMkkkkkkk.',
  'kk..kk........',
];

const GUN_RIFLE = [
  'kkkkkkkkkkk.',
  'kMMmmmmmmmmk',
  'kMkkkk.kkkk.',
  'kk..........',
];

const KNIFE = [
  'kkwwwww.',
  'kkwwww..',
];

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

const GRENADE = [
  '..kk.',
  '.kGGk',
  'kGgGk',
  'kGGGk',
  '.kkk.',
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
  for (const c of CHARACTERS) pixelSheet(scene, c.key, characterFrames(c.head), c.palette);

  pixelTexture(scene, 'gun_pistol', GUN_PISTOL, METAL);
  pixelTexture(scene, 'gun_heavy', GUN_HEAVY, METAL);
  pixelTexture(scene, 'gun_rifle', GUN_RIFLE, { ...METAL, m: '#7a5a3a', M: '#4a3522' });
  pixelTexture(scene, 'knife', KNIFE, METAL);

  pixelTexture(scene, 'bullet', ['yyyw', 'yyyw'], { y: '#ffd84a', w: '#fff7d0' });
  pixelTexture(scene, 'bullet_heavy', ['ooyyyw', 'ooyyyw'], { o: '#ff8a2a', y: '#ffd84a', w: '#fff7d0' });
  pixelTexture(scene, 'bullet_enemy', ['.o.', 'owo', '.o.'], { o: '#ff5a2a', w: '#fff0c0' });
  pixelTexture(scene, 'grenade', GRENADE, { k: OUTLINE, g: '#7fae5a', G: '#3f6b2a' });

  const crate = { k: OUTLINE, y: '#ffcf3a', r: '#c22b22' };
  pixelTexture(scene, 'crate_heavy', CRATE_H, crate);
  pixelTexture(scene, 'crate_bomb', CRATE_B, { ...crate, y: '#9fd0ff', r: '#1f3f8f' });
  pixelTexture(scene, 'flag', FLAG, { k: OUTLINE, y: '#f4f4f4', r: '#d7362b' });

  generateFx(scene);
  generateProps(scene);
  generateScenery(scene, LEVEL_1.width);
}

export function createAnimations(scene: Phaser.Scene) {
  for (const { key } of CHARACTERS) {
    scene.anims.create({ key: `${key}-idle`, frames: [{ key, frame: 0 }] });
    scene.anims.create({
      key: `${key}-run`,
      frames: [1, 0, 2, 0].map((frame) => ({ key, frame })),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({ key: `${key}-jump`, frames: [{ key, frame: 3 }] });
  }
}
