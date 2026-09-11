import { Platform } from 'react-native';

export const colors = {
  canvas: '#F5F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2EF',
  surfaceStrong: '#E3EAE6',
  text: '#17221D',
  textMuted: '#64716A',
  textSubtle: '#87918C',
  border: '#DCE3DF',
  borderStrong: '#C7D1CB',
  primary: '#176B55',
  primaryPressed: '#115442',
  primarySoft: '#DDEFE8',
  coral: '#C45D4C',
  coralSoft: '#F5E4E0',
  amber: '#A97112',
  amberSoft: '#F7EDD6',
  blue: '#2C6992',
  blueSoft: '#DFECF4',
  danger: '#B33D35',
  dangerSoft: '#F8E6E4',
  scrim: 'rgba(16, 27, 22, 0.48)',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  xs: 3,
  sm: 4,
  md: 6,
  lg: 8,
  round: 999,
} as const;

export const typeScale = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  title: 20,
  display: 30,
} as const;

export const layout = {
  pagePadding: spacing.lg,
  contentGap: spacing.lg,
  tapTarget: 48,
  inputHeight: 48,
  maxContentWidth: 680,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#10251C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  android: { elevation: 2 },
  default: {},
});

export const theme = {
  colors,
  spacing,
  radii,
  typeScale,
  layout,
  shadow,
} as const;

export type Theme = typeof theme;
