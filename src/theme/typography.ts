import { Platform, TextStyle } from 'react-native';

/**
 * Watson escreve como um lorde ingles: titulos em serifa, dados em sans.
 * Usamos fontes do proprio sistema para nao depender de download nem de
 * build nativo, o que mantem o app rodando no Expo Go.
 */
export const fonts = {
  serif: Platform.select({
    ios: 'Baskerville',
    android: 'serif',
    default: 'Georgia, serif',
  }) as string,
  serifBold: Platform.select({
    ios: 'Baskerville-Bold',
    android: 'serif',
    default: 'Georgia, serif',
  }) as string,
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, sans-serif',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, monospace',
  }) as string,
};

export const type = {
  display: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0.2,
    fontWeight: Platform.OS === 'android' ? ('700' as const) : ('400' as const),
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.2,
    fontWeight: Platform.OS === 'android' ? ('700' as const) : ('400' as const),
  } satisfies TextStyle,
  heading: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: 0.1,
    fontWeight: Platform.OS === 'android' ? ('700' as const) : ('400' as const),
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  } satisfies TextStyle,
  small: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500' as const,
  } satisfies TextStyle,
  numeral: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: Platform.OS === 'android' ? ('700' as const) : ('400' as const),
  } satisfies TextStyle,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};
