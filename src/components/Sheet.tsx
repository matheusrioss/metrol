import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '@/theme';

/** Painel que sobe pela base da tela, usado para formularios e detalhes. */
export function Sheet({
  visivel,
  titulo,
  subtitulo,
  onFechar,
  children,
  rodape,
}: {
  visivel: boolean;
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={onFechar}
      statusBarTranslucent
    >
      <View style={s.fundo}>
        <Pressable style={s.toque} onPress={onFechar} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[s.painel, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={s.alca} />
            <View style={s.cabecalho}>
              <View style={{ flex: 1 }}>
                <Text style={s.titulo}>{titulo}</Text>
                {!!subtitulo && <Text style={s.subtitulo}>{subtitulo}</Text>}
              </View>
              <Pressable onPress={onFechar} hitSlop={12} style={s.fechar}>
                <Ionicons name="close" size={19} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={s.corpo}
              contentContainerStyle={s.corpoConteudo}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {!!rodape && <View style={s.rodape}>{rodape}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  toque: { flex: 1 },
  painel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brassLine,
    maxHeight: '92%',
  },
  alca: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titulo: { ...type.title, color: colors.text },
  subtitulo: { ...type.small, color: colors.textMuted, marginTop: 2 },
  fechar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corpo: { paddingHorizontal: spacing.xl },
  corpoConteudo: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  rodape: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
});
