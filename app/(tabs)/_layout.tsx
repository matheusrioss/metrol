import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, type } from '@/theme';

type NomeIcone = keyof typeof Ionicons.glyphMap;

interface BotaoAbaProps extends TabTriggerSlotProps {
  rotulo: string;
  icone: NomeIcone;
  iconeAtivo: NomeIcone;
  central?: boolean;
}

const BotaoAba = forwardRef<View, BotaoAbaProps>(
  ({ rotulo, icone, iconeAtivo, central, isFocused, ...props }, ref) => {
    const ativo = !!isFocused;

    return (
      <Pressable
        ref={ref}
        {...props}
        onPress={(evento) => {
          void Haptics.selectionAsync().catch(() => undefined);
          props.onPress?.(evento);
        }}
        style={b.item}
        hitSlop={6}
      >
        {central ? (
          <View style={[b.centro, ativo && b.centroAtivo]}>
            <Ionicons
              name={ativo ? iconeAtivo : icone}
              size={23}
              color={ativo ? colors.textInverse : colors.brass}
            />
          </View>
        ) : (
          <Ionicons
            name={ativo ? iconeAtivo : icone}
            size={21}
            color={ativo ? colors.brassBright : colors.textMuted}
          />
        )}
        <Text style={[b.rotulo, ativo && b.rotuloAtivo]}>{rotulo}</Text>
      </Pressable>
    );
  },
);
BotaoAba.displayName = 'BotaoAba';

/**
 * Barra fixa na base. A ordem dos gatilhos e a ordem na tela, e o Watson
 * ocupa o centro, elevado e em latao, como o botao que se procura primeiro.
 */
export default function TabsLayout() {
  const { carregando, usuario, autenticado } = useAuth();
  const insets = useSafeAreaInsets();

  if (carregando) return null;
  if (!usuario || !autenticado) return <Redirect href="/(auth)/acesso" />;

  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <View style={[b.barra, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TabTrigger name="calendario" href="/calendario" asChild>
            <BotaoAba rotulo="Agenda" icone="calendar-outline" iconeAtivo="calendar" />
          </TabTrigger>

          <TabTrigger name="saude" href="/saude" asChild>
            <BotaoAba rotulo="Saude" icone="pulse-outline" iconeAtivo="pulse" />
          </TabTrigger>

          <TabTrigger name="index" href="/" asChild>
            <BotaoAba rotulo="Watson" icone="home-outline" iconeAtivo="home" central />
          </TabTrigger>

          <TabTrigger name="corporativo" href="/corporativo" asChild>
            <BotaoAba rotulo="Dossies" icone="library-outline" iconeAtivo="library" />
          </TabTrigger>

          <TabTrigger name="ajustes" href="/ajustes" asChild>
            <BotaoAba rotulo="Ajustes" icone="settings-outline" iconeAtivo="settings" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const b = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.glass,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  item: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 2 },
  centro: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brassFaint,
    borderWidth: 1,
    borderColor: colors.brassLine,
    marginTop: -18,
  },
  centroAtivo: { backgroundColor: colors.brass, borderColor: colors.brassBright },
  rotulo: { ...type.caption, fontSize: 9.5, color: colors.textMuted, letterSpacing: 0.3 },
  rotuloAtivo: { color: colors.brassBright },
});
