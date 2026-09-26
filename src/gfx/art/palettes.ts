/*
 * Paletas por camada. Camadas distantes são mais claras e frias (névoa);
 * a camada jogável é quente e contrastada para destacar os personagens.
 */

export interface Shades {
  light: string;
  base: string;
  dark: string;
  deep: string;
}

export const SKY = ['#e9ecd2', '#d7e2c6', '#c3d5bb', '#aec6ae', '#9ab5a0', '#fbf6dc'];

export const FAR = ['#c7d6c0', '#b5c7ae', '#a2b89d', '#8fa88c', '#7e997c', '#6e8a6d'];

export const MID = [
  '#a9bd9a', '#8fa682', '#77906c', '#627b59', '#4e6648', '#3d5239', '#2e4030',
  '#c2bca0', '#a6a086', '#8b866e', '#716d59', '#57543f',
];

export const NEAR = [
  // pedra
  '#d6c69c', '#b9a77c', '#9b8a60', '#7c6d49', '#5e5236', '#413826', '#2a2418',
  // musgo
  '#9fae55', '#7c8d3e', '#5b6b2c',
  // folhagem
  '#58764a', '#415c37', '#2e4428', '#1f2f1c',
];

export const PLAY = [
  // pedra quente
  '#f6e6b6', '#e0c68c', '#c4a468', '#a0804c', '#7b5d36', '#553f24', '#352711', '#1c140a',
  // musgo / grama
  '#d0db6c', '#a6bc4a', '#7c9636', '#556b26', '#3a4a1c',
  // terra
  '#a37c4d', '#7f5e38',
  // folhagem
  '#6f9450', '#4f723a', '#355028', '#22351b',
];

export const SAND = ['#f3e5b8', '#dcc690', '#bda06a', '#94784a', '#65502f', '#3b2d19'];

export const WOOD = ['#d4a060', '#b07c40', '#8a5a2a', '#62401c', '#3e2812', '#c9ccd2', '#8a8e96'];

export const FIRE = ['#ffffff', '#fff4b0', '#ffd84a', '#ffa02a', '#f0641e', '#b8321a', '#6e2414', '#7a6a60', '#51453f', '#352d29'];

export const FOREGROUND = ['#2f4a26', '#223a1c', '#172a14', '#0f1d0d', '#3c5a2e'];

// Tons usados no desenho (antes da quantização)
export const STONE_PLAY: Shades = { light: '#f3e1ae', base: '#cdb07a', dark: '#96764a', deep: '#4f3a20' };
export const STONE_NEAR: Shades = { light: '#d2c296', base: '#a9976c', dark: '#7a6b4a', deep: '#3f3624' };
export const STONE_MID: Shades = { light: '#c2bca0', base: '#a6a086', dark: '#827d67', deep: '#5d5a46' };
export const MOSS_PLAY: Shades = { light: '#d6e070', base: '#a6bc4a', dark: '#6f8a32', deep: '#3e5020' };
export const MOSS_NEAR: Shades = { light: '#a8b85c', base: '#84963f', dark: '#5f702e', deep: '#3f4d22' };
export const LEAF_PLAY: Shades = { light: '#86ab5c', base: '#5a8040', dark: '#3a5a2c', deep: '#20341a' };
export const LEAF_NEAR: Shades = { light: '#6a8a52', base: '#4b683e', dark: '#33492b', deep: '#1e2c1a' };
export const LEAF_MID: Shades = { light: '#93ab86', base: '#6f8a66', dark: '#526c4d', deep: '#3a5039' };
export const LEAF_FAR: Shades = { light: '#bfcfb8', base: '#a9bca4', dark: '#94aa91', deep: '#80987f' };
export const BARK_NEAR: Shades = { light: '#8a8466', base: '#655f48', dark: '#454232', deep: '#2a281e' };
export const BARK_MID: Shades = { light: '#8fa086', base: '#72846b', dark: '#586a53', deep: '#435240' };
