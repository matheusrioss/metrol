import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, toneColors, type } from '@/theme';
import type { SeverityTone } from '@/theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const base: ViewStyle = {
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingBottom: insets.bottom + 96,
  };

  if (!scroll) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={[{ flex: 1 }, base, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[base, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Cabecalho({
  sobretitulo,
  titulo,
  acessorio,
}: {
  sobretitulo?: string;
  titulo: string;
  acessorio?: React.ReactNode;
}) {
  return (
    <View style={s.cabecalho}>
      <View style={{ flex: 1 }}>
        {!!sobretitulo && <Text style={s.sobretitulo}>{sobretitulo}</Text>}
        <Text style={s.tituloPagina}>{titulo}</Text>
      </View>
      {acessorio}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  destaque = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  destaque?: boolean;
}) {
  const conteudo = (
    <View style={[s.card, destaque && s.cardDestaque, style]}>{children}</View>
  );
  if (!onPress) return conteudo;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? s.pressed : undefined)}>
      {conteudo}
    </Pressable>
  );
}

export function TituloSecao({
  children,
  acao,
  onAcao,
}: {
  children: React.ReactNode;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <View style={s.tituloSecao}>
      <Text style={s.tituloSecaoTexto}>{children}</Text>
      {!!acao && (
        <Pressable onPress={onAcao} hitSlop={8}>
          <Text style={s.tituloSecaoAcao}>{acao}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Botao({
  titulo,
  onPress,
  variante = 'principal',
  icone,
  carregando = false,
  desabilitado = false,
  style,
}: {
  titulo: string;
  onPress: () => void;
  variante?: 'principal' | 'contorno' | 'fantasma' | 'perigo';
  icone?: keyof typeof Ionicons.glyphMap;
  carregando?: boolean;
  desabilitado?: boolean;
  style?: ViewStyle;
}) {
  const inativo = desabilitado || carregando;
  const corTexto =
    variante === 'principal'
      ? colors.textInverse
      : variante === 'perigo'
        ? colors.crimsonBright
        : colors.brass;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        s.botao,
        variante === 'principal' && s.botaoPrincipal,
        variante === 'contorno' && s.botaoContorno,
        variante === 'fantasma' && s.botaoFantasma,
        variante === 'perigo' && s.botaoPerigo,
        inativo && s.botaoInativo,
        pressed && s.pressed,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator size="small" color={corTexto} />
      ) : (
        <>
          {!!icone && <Ionicons name={icone} size={17} color={corTexto} />}
          <Text style={[s.botaoTexto, { color: corTexto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

interface CampoProps extends TextInputProps {
  rotulo?: string;
  dica?: string;
  erro?: string | null;
}

export function Campo({ rotulo, dica, erro, style, ...props }: CampoProps) {
  return (
    <View style={s.campoBloco}>
      {!!rotulo && <Text style={s.campoRotulo}>{rotulo}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.brass}
        {...props}
        style={[s.campo, props.multiline && s.campoMultilinha, !!erro && s.campoErro, style]}
      />
      {!!erro && <Text style={s.campoErroTexto}>{erro}</Text>}
      {!erro && !!dica && <Text style={s.campoDica}>{dica}</Text>}
    </View>
  );
}

export function Chip({
  rotulo,
  ativo = false,
  onPress,
  icone,
  tom,
}: {
  rotulo: string;
  ativo?: boolean;
  onPress?: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  tom?: SeverityTone;
}) {
  const cores = tom ? toneColors[tom] : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.chip,
        ativo && s.chipAtivo,
        cores && { backgroundColor: cores.bg, borderColor: 'transparent' },
        pressed && s.pressed,
      ]}
    >
      {!!icone && (
        <Ionicons
          name={icone}
          size={13}
          color={ativo ? colors.brassBright : cores ? cores.fg : colors.textSecondary}
        />
      )}
      <Text
        style={[
          s.chipTexto,
          ativo && s.chipTextoAtivo,
          cores && { color: cores.fg },
        ]}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

export function Etiqueta({ tom, children }: { tom: SeverityTone; children: React.ReactNode }) {
  const cores = toneColors[tom];
  return (
    <View style={[s.etiqueta, { backgroundColor: cores.bg }]}>
      <Text style={[s.etiquetaTexto, { color: cores.fg }]}>{children}</Text>
    </View>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  texto,
  acao,
  onAcao,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto: string;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <View style={s.vazio}>
      <View style={s.vazioIcone}>
        <Ionicons name={icone} size={26} color={colors.brassDeep} />
      </View>
      <Text style={s.vazioTitulo}>{titulo}</Text>
      <Text style={s.vazioTexto}>{texto}</Text>
      {!!acao && onAcao && (
        <Botao titulo={acao} onPress={onAcao} variante="contorno" style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

export function Divisor({ style }: { style?: ViewStyle }) {
  return <View style={[s.divisor, style]} />;
}

export function LinhaInfo({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: SeverityTone;
}) {
  return (
    <View style={s.linhaInfo}>
      <Text style={s.linhaInfoRotulo}>{rotulo}</Text>
      <Text style={[s.linhaInfoValor, tom && { color: toneColors[tom].fg }]}>{valor}</Text>
    </View>
  );
}

export function Carregando({ texto }: { texto?: string }) {
  return (
    <View style={s.carregando}>
      <ActivityIndicator color={colors.brass} />
      {!!texto && <Text style={s.carregandoTexto}>{texto}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.65 },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sobretitulo: { ...type.eyebrow, color: colors.brass, marginBottom: spacing.xs },
  tituloPagina: { ...type.display, color: colors.text },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardDestaque: {
    borderColor: colors.brassLine,
    backgroundColor: colors.surfaceRaised,
  },

  tituloSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  tituloSecaoTexto: { ...type.eyebrow, color: colors.textSecondary },
  tituloSecaoAcao: { ...type.caption, color: colors.brass },

  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  botaoPrincipal: { backgroundColor: colors.brass },
  botaoContorno: { borderWidth: 1, borderColor: colors.brassLine, backgroundColor: 'transparent' },
  botaoFantasma: { backgroundColor: 'transparent', paddingVertical: spacing.md },
  botaoPerigo: { borderWidth: 1, borderColor: colors.crimsonFaint, backgroundColor: colors.crimsonFaint },
  botaoInativo: { opacity: 0.45 },
  botaoTexto: { ...type.bodyStrong, letterSpacing: 0.2 },

  campoBloco: { marginBottom: spacing.lg },
  campoRotulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  campo: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    color: colors.text,
    ...type.body,
  },
  campoMultilinha: { minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.md },
  campoErro: { borderColor: colors.crimson },
  campoErroTexto: { ...type.caption, color: colors.crimsonBright, marginTop: spacing.xs },
  campoDica: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipAtivo: { backgroundColor: colors.brassFaint, borderColor: colors.brassLine },
  chipTexto: { ...type.caption, color: colors.textSecondary },
  chipTextoAtivo: { color: colors.brassBright },

  etiqueta: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  etiquetaTexto: { ...type.caption, fontSize: 10.5, letterSpacing: 0.4 },

  vazio: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  vazioIcone: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brassFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  vazioTitulo: { ...type.heading, color: colors.text, textAlign: 'center' },
  vazioTexto: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg },

  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  linhaInfoRotulo: { ...type.small, color: colors.textSecondary, flex: 1 },
  linhaInfoValor: { ...type.bodyStrong, color: colors.text },

  carregando: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md },
  carregandoTexto: { ...type.small, color: colors.textMuted },
});
