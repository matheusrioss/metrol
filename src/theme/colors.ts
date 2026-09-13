/**
 * Paleta do Watson.
 *
 * Referencia visual: gabinete vitoriano em Baker Street a noite.
 * Preto de fuligem, cinza de neblina londrina, latao de lamparina a gas,
 * verde garrafa de poltrona de couro e vinho escuro para o alerta.
 */
export const colors = {
  // Fundos, do mais profundo ao mais elevado
  void: '#060607',
  background: '#0A0A0B',
  surface: '#131316',
  surfaceRaised: '#1A1A1F',
  surfaceHover: '#212128',

  // Linhas e divisores
  border: '#26262E',
  borderStrong: '#34343E',

  // Texto
  text: '#EDEDEF',
  textSecondary: '#9C9CA6',
  textMuted: '#62626D',
  textInverse: '#0A0A0B',

  // Latao da lamparina: o acento principal do Watson
  brass: '#C8A45C',
  brassBright: '#E0BE7A',
  brassDeep: '#8C6E32',
  brassFaint: 'rgba(200, 164, 92, 0.12)',
  brassLine: 'rgba(200, 164, 92, 0.28)',

  // Trio de estado. Os tres tons foram validados contra a superficie escura
  // para croma, contraste e separacao sob daltonismo. Ainda assim nunca
  // aparecem sozinhos: todo estado carrega icone e texto junto da cor.
  forest: '#5FAF86',
  forestDeep: '#1E3A30',
  forestFaint: 'rgba(95, 175, 134, 0.14)',

  crimson: '#E2483C',
  crimsonBright: '#E2483C',
  crimsonFaint: 'rgba(226, 72, 60, 0.14)',

  amber: '#E0B24A',
  amberFaint: 'rgba(224, 178, 74, 0.14)',

  // Azul acinzentado: informacao neutra
  slate: '#5C7A94',
  slateFaint: 'rgba(92, 122, 148, 0.14)',

  // Sobreposicoes
  scrim: 'rgba(6, 6, 7, 0.82)',
  glass: 'rgba(19, 19, 22, 0.94)',
} as const;

export type SeverityTone = 'critico' | 'atencao' | 'bom' | 'neutro';

export const toneColors: Record<SeverityTone, { fg: string; bg: string }> = {
  critico: { fg: colors.crimsonBright, bg: colors.crimsonFaint },
  atencao: { fg: colors.amber, bg: colors.amberFaint },
  bom: { fg: colors.forest, bg: colors.forestFaint },
  neutro: { fg: colors.textSecondary, bg: 'rgba(156, 156, 166, 0.10)' },
};
