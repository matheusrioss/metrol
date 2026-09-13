import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from '@/hooks/useAuth';
import { getDatabase } from '@/db';
import { colors, type } from '@/theme';

export default function RootLayout() {
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then(() => setPronto(true))
      .catch((e: Error) => setErro(e.message));
  }, []);

  if (erro) {
    return (
      <View style={s.centro}>
        <Text style={s.erroTitulo}>Nao foi possivel abrir a base local</Text>
        <Text style={s.erroTexto}>{erro}</Text>
      </View>
    );
  }

  if (!pronto) {
    return (
      <View style={s.centro}>
        <Text style={s.marca}>WATSON</Text>
        <ActivityIndicator color={colors.brass} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  centro: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  marca: { ...type.display, color: colors.brass, letterSpacing: 6 },
  erroTitulo: { ...type.heading, color: colors.text, textAlign: 'center' },
  erroTexto: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
