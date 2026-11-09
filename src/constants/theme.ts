import '@/global.css';

import { Platform } from 'react-native';

// Attaché palette. Status colours always come with words; colour is never the only signal.
export const Colors = {
  light: {
    text: '#121826',
    textSecondary: '#545D6E',
    background: '#F4F5F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3E6EC',
    accent: '#0B2545',
    onAccent: '#FFFFFF',
    border: '#DDE1E8',
  },
  dark: {
    text: '#F2F4F8',
    textSecondary: '#AAB2C0',
    background: '#0B0F17',
    backgroundElement: '#171C26',
    backgroundSelected: '#252B37',
    accent: '#9DB7E0',
    onAccent: '#0B1730',
    border: '#2A3140',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Severity and confirmation tones: [background, foreground], light then dark. */
export const Tones = {
  ok: { light: ['#E2F3EE', '#0B6B58'], dark: ['#123129', '#7FD8C1'] },
  advisory: { light: ['#E6EEFA', '#1E4E9A'], dark: ['#16263F', '#A8C4F0'] },
  warning: { light: ['#FBEFD9', '#7A4306'], dark: ['#3A2A0D', '#F2C46B'] },
  critical: { light: ['#FBE4E1', '#9B1C10'], dark: ['#3D1612', '#F4A398'] },
  unconfirmed: { light: ['#EEEFF2', '#454C5A'], dark: ['#262A33', '#C3C8D2'] },
} as const;

export type Tone = keyof typeof Tones;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', mono: 'var(--font-mono)' },
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

export const Radius = Platform.select({ android: 20, default: 16 });

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
