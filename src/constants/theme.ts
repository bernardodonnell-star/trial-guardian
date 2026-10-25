/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F7F6F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEBE7',
    textSecondary: '#687076',
    border: '#E4E2DD',
    accent: '#E8552B',
    accentSoft: '#FDE9E2',
    success: '#1F9D55',
    successSoft: '#E1F4E8',
    danger: '#D93025',
  },
  dark: {
    text: '#F2F2F0',
    background: '#0E0F10',
    backgroundElement: '#1A1C1E',
    backgroundSelected: '#26292C',
    textSecondary: '#9BA1A6',
    border: '#2C2F33',
    accent: '#FF7A4D',
    accentSoft: '#3A2119',
    success: '#4CC38A',
    successSoft: '#163323',
    danger: '#FF6B61',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
