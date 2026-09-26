import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { canvasTexture, Palette, pixelSheet, pixelTexture } from './pixel';

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

  generateTiles(scene);
  generateBackgrounds(scene);
  generateFx(scene);
}

function generateTiles(scene: Phaser.Scene) {
  canvasTexture(scene, 'tile_ground', 16, 16, (ctx) => {
    ctx.fillStyle = '#9a7646';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#7d5e36';
    for (const [x, y] of [[2, 6], [9, 9], [5, 13], [13, 4], [11, 14]]) ctx.fillRect(x, y, 2, 1);
    ctx.fillStyle = '#c9a36a';
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillStyle = '#e0bd84';
    ctx.fillRect(0, 0, 16, 1);
  });

  canvasTexture(scene, 'tile_platform', 16, 8, (ctx) => {
    ctx.fillStyle = '#4b5059';
    ctx.fillRect(0, 0, 16, 8);
    ctx.fillStyle = '#8a909a';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = '#2d3036';
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(15, 0, 1, 8);
    ctx.fillStyle = '#b4bac4';
    ctx.fillRect(3, 4, 1, 1);
    ctx.fillRect(11, 4, 1, 1);
  });

  // Sacos de areia (cobertura sólida)
  canvasTexture(scene, 'tile_block', 16, 8, (ctx) => {
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(0, 0, 16, 8);
    ctx.fillStyle = '#b0915e';
    ctx.fillRect(1, 1, 14, 6);
    ctx.fillStyle = '#c9aa73';
    ctx.fillRect(2, 1, 12, 2);
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(8, 1, 1, 6);
  });
}

function generateBackgrounds(scene: Phaser.Scene) {
  canvasTexture(scene, 'bg_sky', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#5fb4e8');
    grad.addColorStop(0.6, '#bfe0ee');
    grad.addColorStop(1, '#f6e2b3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  });

  // Montanhas (repetem horizontalmente)
  canvasTexture(scene, 'bg_mountains', 480, 120, (ctx) => {
    const peaks = (color: string, base: number, pts: [number, number][]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.lineTo(0, base);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(480, base);
      ctx.lineTo(480, 120);
      ctx.closePath();
      ctx.fill();
    };
    peaks('#d9bb91', 70, [[60, 30], [120, 60], [190, 20], [260, 65], [330, 35], [400, 55], [450, 40]]);
    peaks('#c49a6c', 90, [[40, 70], [110, 50], [170, 85], [240, 55], [310, 80], [380, 50], [440, 75]]);
  });

  // Ruínas de prédios
  canvasTexture(scene, 'bg_ruins', 480, 110, (ctx) => {
    const buildings: [number, number, number][] = [
      [10, 40, 50], [70, 20, 36], [120, 55, 44], [190, 30, 60], [270, 45, 40], [330, 15, 52], [400, 50, 64],
    ];
    for (const [x, top, w] of buildings) {
      ctx.fillStyle = '#8a6a4c';
      ctx.fillRect(x, top, w, 110 - top);
      // topo quebrado
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(x + w - 12, top, 12, 8);
      ctx.clearRect(x + w - 6, top + 8, 6, 6);
      // janelas
      ctx.fillStyle = '#4e3a29';
      for (let wy = top + 8; wy < 100; wy += 14) {
        for (let wx = x + 5; wx < x + w - 8; wx += 11) ctx.fillRect(wx, wy, 5, 7);
      }
    }
    ctx.fillStyle = '#6f5238';
    ctx.fillRect(0, 100, 480, 10);
  });
}

function generateFx(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 16);
  g.generateTexture('fx_circle', 32, 32);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 3, 3);
  g.generateTexture('fx_spark', 3, 3);
  g.clear();
  g.lineStyle(3, 0xffffff, 1);
  g.beginPath();
  g.arc(4, 14, 12, -1.2, 1.2);
  g.strokePath();
  g.generateTexture('fx_slash', 20, 28);
  g.destroy();
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
