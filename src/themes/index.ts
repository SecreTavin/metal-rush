import type { ThemeId } from '../level/types';
import { cityTheme } from './city';
import { coreTheme } from './core';
import { factoryTheme } from './factory';
import type { Theme } from './Theme';

export const THEMES: Record<ThemeId, Theme> = {
  city: cityTheme,
  factory: factoryTheme,
  core: coreTheme,
};
