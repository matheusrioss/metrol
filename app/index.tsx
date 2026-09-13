import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { colors, type } from '@/theme';

/** Porta de entrada: decide entre a tela de acesso e o aplicativo. */
export default function Entrada() {
  const { carregando, usuario, autenticado } = useAuth();

  if (carregando) {
    return (
      <View style={s.centro}>
        <Text style={s.marca}>WATSON</Text>
        <Text style={s.lema}>Tudo que voce sabe, em um lugar so</Text>
        <ActivityIndicator color={colors.brass} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!usuario || !autenticado) return <Redirect href="/(auth)/acesso" />;
  return <Redirect href="/(tabs)" />;
}

const s = StyleSheet.create({
  centro: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  marca: { ...type.display, color: colors.brass, letterSpacing: 6 },
  lema: { ...type.caption, color: colors.textMuted, marginTop: 8, letterSpacing: 1 },
});
