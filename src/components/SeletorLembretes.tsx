import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip } from './ui';
import { REMINDER_OPTIONS } from '@/lib/types';
import { colors, spacing, type } from '@/theme';

/** Todas as antecedencias de lembrete pedidas no projeto, em uma grade so. */
export function SeletorLembretes({
  selecionados,
  onAlterar,
}: {
  selecionados: number[];
  onAlterar: (valores: number[]) => void;
}) {
  const alternar = (minutos: number) => {
    onAlterar(
      selecionados.includes(minutos)
        ? selecionados.filter((m) => m !== minutos)
        : [...selecionados, minutos].sort((a, b) => b - a),
    );
  };

  return (
    <View style={s.bloco}>
      <Text style={s.rotulo}>Lembretes</Text>
      <View style={s.grade}>
        {REMINDER_OPTIONS.map((opcao) => (
          <Chip
            key={opcao.minutes}
            rotulo={opcao.label}
            ativo={selecionados.includes(opcao.minutes)}
            onPress={() => alternar(opcao.minutes)}
          />
        ))}
      </View>
      <Text style={s.dica}>
        {selecionados.length
          ? `${selecionados.length} aviso${selecionados.length > 1 ? 's' : ''} sera${selecionados.length > 1 ? 'o' : ''} agendado${selecionados.length > 1 ? 's' : ''} no aparelho.`
          : 'Sem lembrete. Toque para escolher uma ou mais antecedencias.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  bloco: { marginBottom: spacing.lg },
  rotulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dica: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
});
