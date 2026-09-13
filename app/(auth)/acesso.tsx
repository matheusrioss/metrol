import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Botao, Campo } from '@/components/ui';
import { colors, spacing, radius, type } from '@/theme';

export default function TelaAcesso() {
  const router = useRouter();
  const {
    usuario,
    autenticado,
    biometria,
    biometriaAtiva,
    cadastrar,
    entrarComSenha,
    entrarComBiometria,
  } = useAuth();

  const primeiroAcesso = !usuario;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (autenticado) router.replace('/(tabs)');
  }, [autenticado, router]);

  const tentarBiometria = useCallback(async () => {
    setErro(null);
    const ok = await entrarComBiometria();
    if (!ok) setErro('Nao foi possivel confirmar sua identidade. Use a senha.');
  }, [entrarComBiometria]);

  useEffect(() => {
    // Com a biometria ligada, o Watson ja apresenta o Face ID ao abrir.
    if (!primeiroAcesso && biometriaAtiva && biometria.disponivel && biometria.cadastrada) {
      void tentarBiometria();
    }
  }, [primeiroAcesso, biometriaAtiva, biometria, tentarBiometria]);

  const aoCadastrar = async () => {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Diga ao Watson como quer ser chamado.');
    if (senha.length < 6) return setErro('A senha precisa de pelo menos 6 caracteres.');
    if (senha !== confirmacao) return setErro('As duas senhas nao coincidem.');

    setOcupado(true);
    try {
      await cadastrar({ name: nome, email: email || undefined, password: senha });
      router.replace('/(tabs)');
    } catch {
      setErro('Nao foi possivel concluir o cadastro.');
    } finally {
      setOcupado(false);
    }
  };

  const aoEntrar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      const ok = await entrarComSenha(senha);
      if (ok) router.replace('/(tabs)');
      else setErro('Senha incorreta.');
    } finally {
      setOcupado(false);
    }
  };

  const rotuloBiometria =
    biometria.tipo === 'facial'
      ? 'Entrar com reconhecimento facial'
      : biometria.tipo === 'digital'
        ? 'Entrar com a digital'
        : 'Entrar com a biometria';

  return (
    <SafeAreaView style={s.tela}>
      <LinearGradient
        colors={['rgba(200,164,92,0.10)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.marcaBloco}>
            <View style={s.selo}>
              <Ionicons name="glasses-outline" size={26} color={colors.brass} />
            </View>
            <Text style={s.marca}>WATSON</Text>
            <View style={s.regua} />
            <Text style={s.lema}>
              {primeiroAcesso
                ? 'Antes de servir, preciso saber quem voce e.'
                : `Bem-vindo de volta${usuario?.name ? `, ${usuario.name.split(' ')[0]}` : ''}.`}
            </Text>
          </View>

          <View style={s.formulario}>
            {primeiroAcesso ? (
              <>
                <Campo
                  rotulo="Como devo chamar voce"
                  placeholder="Seu nome"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <Campo
                  rotulo="E-mail (opcional)"
                  placeholder="voce@empresa.com.br"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <Campo
                  rotulo="Senha"
                  placeholder="Pelo menos 6 caracteres"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                />
                <Campo
                  rotulo="Repita a senha"
                  placeholder="A mesma senha"
                  value={confirmacao}
                  onChangeText={setConfirmacao}
                  secureTextEntry
                  erro={erro}
                />
                <Botao
                  titulo="Criar meu acesso"
                  onPress={aoCadastrar}
                  carregando={ocupado}
                  icone="arrow-forward"
                />
                <Text style={s.aviso}>
                  Sua senha e todos os seus dados ficam apenas neste aparelho. Nao existe servidor,
                  nao existe conta na nuvem e ninguem alem de voce tem como abrir esta base.
                </Text>
              </>
            ) : (
              <>
                <Campo
                  rotulo="Senha"
                  placeholder="Sua senha"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                  onSubmitEditing={aoEntrar}
                  returnKeyType="go"
                  erro={erro}
                />
                <Botao titulo="Entrar" onPress={aoEntrar} carregando={ocupado} />

                {biometria.disponivel && biometria.cadastrada && (
                  <Pressable onPress={tentarBiometria} style={s.biometria}>
                    <Ionicons
                      name={biometria.tipo === 'digital' ? 'finger-print' : 'scan-outline'}
                      size={19}
                      color={colors.brass}
                    />
                    <Text style={s.biometriaTexto}>{rotuloBiometria}</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },

  marcaBloco: { alignItems: 'center', marginBottom: spacing.xxxl },
  selo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.brassLine,
    backgroundColor: colors.brassFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  marca: { ...type.display, fontSize: 36, color: colors.text, letterSpacing: 8 },
  regua: {
    width: 44,
    height: 1,
    backgroundColor: colors.brassLine,
    marginVertical: spacing.md,
  },
  lema: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  formulario: { gap: 0 },
  aviso: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: spacing.xl,
  },

  biometria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  biometriaTexto: { ...type.bodyStrong, color: colors.brass },
});
