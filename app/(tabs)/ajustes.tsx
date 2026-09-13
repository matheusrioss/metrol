import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Cabecalho, Card, Botao, Campo, Chip, TituloSecao } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { useAuth } from '@/hooks/useAuth';
import { clearApiKey, getApiKey, saveApiKey } from '@/lib/secrets';
import {
  getBooleanSetting,
  getSetting,
  setBooleanSetting,
  setSetting,
  SETTINGS_KEYS,
} from '@/db/repositories/settings';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/ai/client';
import { contarLembretesAgendados, sincronizarLembretes } from '@/features/notifications';
import { compartilharBackup, exportarBackup, importarBackup } from '@/features/backup';
import { colors, radius, spacing, type } from '@/theme';

export default function TelaAjustes() {
  const router = useRouter();
  const { usuario, biometria, biometriaAtiva, ativarBiometria, sair, atualizarPerfil } = useAuth();

  const [temChave, setTemChave] = useState(false);
  const [chaveParcial, setChaveParcial] = useState('');
  const [modelo, setModelo] = useState(DEFAULT_MODEL);
  const [revisarContexto, setRevisarContexto] = useState(true);
  const [lembretesAgendados, setLembretesAgendados] = useState(0);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);

  const [chaveAberta, setChaveAberta] = useState(false);
  const [chaveNova, setChaveNova] = useState('');
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [emailEdicao, setEmailEdicao] = useState('');
  const [backupAberto, setBackupAberto] = useState(false);
  const [senhaBackup, setSenhaBackup] = useState('');
  const [modoBackup, setModoBackup] = useState<'exportar' | 'importar'>('exportar');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const [chave, modeloSalvo, revisar, agendados, backup] = await Promise.all([
      getApiKey(),
      getSetting(SETTINGS_KEYS.modeloIA),
      getBooleanSetting(SETTINGS_KEYS.revisarContexto, true),
      contarLembretesAgendados(),
      getSetting(SETTINGS_KEYS.ultimoBackup),
    ]);
    setTemChave(!!chave);
    setChaveParcial(chave ? `${chave.slice(0, 7)}...${chave.slice(-4)}` : '');
    setModelo(modeloSalvo || DEFAULT_MODEL);
    setRevisarContexto(revisar);
    setLembretesAgendados(agendados);
    setUltimoBackup(backup);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const salvarChave = async () => {
    if (chaveNova.trim().length < 20) {
      return setMensagem('A chave parece incompleta. Copie a chave inteira do console da Anthropic.');
    }
    await saveApiKey(chaveNova);
    setChaveNova('');
    setChaveAberta(false);
    setMensagem('Chave guardada no cofre do aparelho.');
    await carregar();
  };

  const removerChave = () => {
    Alert.alert('Remover chave', 'O chat do Watson deixa de funcionar ate voce colocar outra.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey();
          await carregar();
        },
      },
    ]);
  };

  const trocarModelo = async (valor: string) => {
    setModelo(valor);
    await setSetting(SETTINGS_KEYS.modeloIA, valor);
  };

  const alternarRevisao = async (valor: boolean) => {
    setRevisarContexto(valor);
    await setBooleanSetting(SETTINGS_KEYS.revisarContexto, valor);
  };

  const alternarBiometria = async (valor: boolean) => {
    const ok = await ativarBiometria(valor);
    if (!ok) {
      setMensagem(
        biometria.disponivel
          ? 'Nao foi possivel confirmar a biometria.'
          : 'Este aparelho nao tem biometria configurada.',
      );
    }
  };

  const resincronizar = async () => {
    setOcupado(true);
    const resultado = await sincronizarLembretes();
    setOcupado(false);
    setLembretesAgendados(resultado.agendados);
    setMensagem(
      resultado.permissao
        ? `${resultado.agendados} lembrete${resultado.agendados === 1 ? '' : 's'} na fila do aparelho.`
        : 'Permissao de notificacao negada. Libere nas configuracoes do sistema.',
    );
  };

  const executarBackup = async () => {
    setMensagem(null);
    setOcupado(true);
    try {
      if (modoBackup === 'exportar') {
        const resultado = await exportarBackup(senhaBackup);
        setBackupAberto(false);
        setSenhaBackup('');
        await compartilharBackup(resultado.caminho);
        setMensagem(
          `Backup gerado com ${resultado.registros} registros. Guarde o arquivo em lugar seguro.`,
        );
      } else {
        const resultado = await importarBackup(senhaBackup);
        setBackupAberto(false);
        setSenhaBackup('');
        if (resultado) {
          setMensagem(`Base restaurada: ${resultado.registros} registros de ${resultado.criadoEm.slice(0, 10)}.`);
          await sincronizarLembretes();
        }
      }
      await carregar();
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Nao foi possivel concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const salvarPerfil = async () => {
    if (nomeEdicao.trim().length < 2) return setMensagem('Escreva um nome valido.');
    await atualizarPerfil(nomeEdicao, emailEdicao || null);
    setPerfilAberto(false);
    setMensagem('Perfil atualizado.');
  };

  const confirmarSaida = () => {
    Alert.alert('Bloquear o Watson', 'Voce precisara da senha ou da biometria para voltar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        onPress: async () => {
          await sair();
          router.replace('/(auth)/acesso');
        },
      },
    ]);
  };

  const rotuloBiometria =
    biometria.tipo === 'facial'
      ? 'Reconhecimento facial'
      : biometria.tipo === 'digital'
        ? 'Impressao digital'
        : 'Biometria';

  return (
    <>
      <Screen>
        <Cabecalho sobretitulo="Configuracoes" titulo="Ajustes" />

        {!!mensagem && (
          <Card style={a.mensagem}>
            <Ionicons name="information-circle-outline" size={16} color={colors.brass} />
            <Text style={a.mensagemTexto}>{mensagem}</Text>
            <Pressable onPress={() => setMensagem(null)} hitSlop={8}>
              <Ionicons name="close" size={15} color={colors.textMuted} />
            </Pressable>
          </Card>
        )}

        <Card
          onPress={() => {
            setNomeEdicao(usuario?.name ?? '');
            setEmailEdicao(usuario?.email ?? '');
            setPerfilAberto(true);
          }}
          style={a.perfil}
        >
          <View style={a.avatar}>
            <Text style={a.avatarTexto}>
              {(usuario?.name ?? 'W').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a.perfilNome}>{usuario?.name ?? 'Sem nome'}</Text>
            <Text style={a.perfilEmail}>{usuario?.email || 'Sem e-mail cadastrado'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Card>

        <TituloSecao>Inteligencia do Watson</TituloSecao>
        <Card style={a.bloco}>
          <View style={a.linha}>
            <View style={{ flex: 1 }}>
              <Text style={a.linhaTitulo}>Chave da API Anthropic</Text>
              <Text style={a.linhaTexto}>
                {temChave ? chaveParcial : 'Nenhuma chave configurada. O chat fica inativo sem ela.'}
              </Text>
            </View>
            <Pressable onPress={() => setChaveAberta(true)} hitSlop={8}>
              <Text style={a.acao}>{temChave ? 'Trocar' : 'Adicionar'}</Text>
            </Pressable>
          </View>

          {temChave && (
            <Pressable onPress={removerChave} hitSlop={8} style={a.removerChave}>
              <Text style={a.removerTexto}>Remover chave do aparelho</Text>
            </Pressable>
          )}

          <View style={a.divisor} />

          <Text style={a.linhaTitulo}>Modelo</Text>
          <View style={a.chips}>
            {MODEL_OPTIONS.map((opcao) => (
              <Chip
                key={opcao.value}
                rotulo={opcao.label}
                ativo={modelo === opcao.value}
                onPress={() => trocarModelo(opcao.value)}
              />
            ))}
          </View>
          <Text style={a.linhaTexto}>
            {MODEL_OPTIONS.find((o) => o.value === modelo)?.hint}
          </Text>

          <View style={a.divisor} />

          <View style={a.linha}>
            <View style={{ flex: 1 }}>
              <Text style={a.linhaTitulo}>Revisar antes de enviar</Text>
              <Text style={a.linhaTexto}>
                Mostra quais blocos da sua base acompanham cada pergunta e deixa voce desligar o que
                nao deve sair do aparelho.
              </Text>
            </View>
            <Switch
              value={revisarContexto}
              onValueChange={alternarRevisao}
              trackColor={{ false: colors.border, true: colors.brassDeep }}
              thumbColor={revisarContexto ? colors.brass : colors.textMuted}
            />
          </View>
        </Card>

        <TituloSecao>Acesso</TituloSecao>
        <Card style={a.bloco}>
          <View style={a.linha}>
            <View style={{ flex: 1 }}>
              <Text style={a.linhaTitulo}>{rotuloBiometria}</Text>
              <Text style={a.linhaTexto}>
                {biometria.disponivel && biometria.cadastrada
                  ? 'Exige a sua biometria toda vez que o Watson abrir.'
                  : 'Nao disponivel neste aparelho. Configure a biometria no sistema primeiro.'}
              </Text>
            </View>
            <Switch
              value={biometriaAtiva}
              onValueChange={alternarBiometria}
              disabled={!biometria.disponivel || !biometria.cadastrada}
              trackColor={{ false: colors.border, true: colors.brassDeep }}
              thumbColor={biometriaAtiva ? colors.brass : colors.textMuted}
            />
          </View>
        </Card>

        <TituloSecao>Lembretes</TituloSecao>
        <Card style={a.bloco}>
          <View style={a.linha}>
            <View style={{ flex: 1 }}>
              <Text style={a.linhaTitulo}>Avisos agendados</Text>
              <Text style={a.linhaTexto}>
                {lembretesAgendados > 0
                  ? `${lembretesAgendados} notificacoes na fila do aparelho, cobrindo os proximos meses.`
                  : 'Nenhum aviso na fila. Toque em recalcular apos cadastrar eventos.'}
              </Text>
            </View>
          </View>
          <Botao
            titulo="Recalcular lembretes"
            onPress={resincronizar}
            variante="contorno"
            carregando={ocupado}
            icone="notifications-outline"
          />
        </Card>

        <TituloSecao>Backup</TituloSecao>
        <Card style={a.bloco}>
          <Text style={a.linhaTexto}>
            Seus dados vivem so neste aparelho. Um backup e a unica forma de sobreviver a uma perda,
            um roubo ou uma troca de celular. O arquivo sai cifrado: sem a senha que voce escolher,
            nem voce consegue abrir.
          </Text>
          <Text style={a.backupData}>
            {ultimoBackup
              ? `Ultimo backup em ${new Date(ultimoBackup).toLocaleDateString('pt-BR')}.`
              : 'Voce ainda nao gerou nenhum backup.'}
          </Text>
          <Botao
            titulo="Gerar backup cifrado"
            onPress={() => {
              setModoBackup('exportar');
              setSenhaBackup('');
              setBackupAberto(true);
            }}
            icone="lock-closed-outline"
          />
          <Botao
            titulo="Restaurar de um arquivo"
            onPress={() => {
              setModoBackup('importar');
              setSenhaBackup('');
              setBackupAberto(true);
            }}
            variante="contorno"
            icone="cloud-upload-outline"
          />
        </Card>

        <TituloSecao>Privacidade</TituloSecao>
        <Card style={a.bloco}>
          <View style={a.privacidadeItem}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.brass} />
            <Text style={a.privacidadeTexto}>
              Agenda, saude, dossies e conversas ficam em um banco local. Nao existe servidor do
              Watson e nada e sincronizado para a nuvem.
            </Text>
          </View>
          <View style={a.privacidadeItem}>
            <Ionicons name="cloud-outline" size={16} color={colors.brass} />
            <Text style={a.privacidadeTexto}>
              A unica saida de dados e a pergunta que voce faz ao Watson. Os trechos aprovados por
              voce vao para a API da Anthropic no momento da pergunta.
            </Text>
          </View>
          <View style={a.privacidadeItem}>
            <Ionicons name="key-outline" size={16} color={colors.brass} />
            <Text style={a.privacidadeTexto}>
              A chave da API fica no cofre do sistema operacional, protegida pelo mesmo mecanismo que
              guarda as senhas do seu aparelho.
            </Text>
          </View>
        </Card>

        <Botao
          titulo="Bloquear o Watson"
          onPress={confirmarSaida}
          variante="fantasma"
          icone="lock-closed-outline"
          style={{ marginTop: spacing.lg }}
        />
        <Text style={a.versao}>Watson 1.0</Text>
      </Screen>

      <Sheet
        visivel={chaveAberta}
        titulo="Chave da API"
        subtitulo="Gere em console.anthropic.com e cole aqui. Ela nunca sai deste aparelho."
        onFechar={() => setChaveAberta(false)}
        rodape={<Botao titulo="Guardar chave" onPress={salvarChave} />}
      >
        <Campo
          placeholder="sk-ant-..."
          value={chaveNova}
          onChangeText={setChaveNova}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          multiline={false}
        />
        <Text style={a.ajudaChave}>
          O custo e por uso e cobrado direto na sua conta da Anthropic. Uma rotina normal de
          perguntas diarias costuma ficar na casa de poucos dolares por mes.
        </Text>
      </Sheet>

      <Sheet
        visivel={perfilAberto}
        titulo="Seu perfil"
        onFechar={() => setPerfilAberto(false)}
        rodape={<Botao titulo="Salvar" onPress={salvarPerfil} />}
      >
        <Campo
          rotulo="Nome"
          value={nomeEdicao}
          onChangeText={setNomeEdicao}
          autoCapitalize="words"
        />
        <Campo
          rotulo="E-mail"
          value={emailEdicao}
          onChangeText={setEmailEdicao}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </Sheet>

      <Sheet
        visivel={backupAberto}
        titulo={modoBackup === 'exportar' ? 'Gerar backup' : 'Restaurar backup'}
        subtitulo={
          modoBackup === 'exportar'
            ? 'Escolha uma senha. Sem ela o arquivo nao abre, nem por voce.'
            : 'Informe a senha usada quando o backup foi gerado.'
        }
        onFechar={() => setBackupAberto(false)}
        rodape={
          <Botao
            titulo={modoBackup === 'exportar' ? 'Gerar e compartilhar' : 'Escolher arquivo e restaurar'}
            onPress={executarBackup}
            carregando={ocupado}
          />
        }
      >
        <Campo
          rotulo="Senha do backup"
          placeholder="Pelo menos 6 caracteres"
          value={senhaBackup}
          onChangeText={setSenhaBackup}
          secureTextEntry
        />
        {modoBackup === 'importar' && (
          <View style={a.aviso}>
            <Ionicons name="warning-outline" size={16} color={colors.amber} />
            <Text style={a.avisoTexto}>
              A restauracao substitui tudo que existe hoje no aparelho pelo conteudo do arquivo.
            </Text>
          </View>
        )}
      </Sheet>
    </>
  );
}

const a = StyleSheet.create({
  mensagem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  mensagemTexto: { ...type.small, color: colors.textSecondary, flex: 1, lineHeight: 18 },

  perfil: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brassFaint,
    borderWidth: 1,
    borderColor: colors.brassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { ...type.title, color: colors.brass },
  perfilNome: { ...type.heading, color: colors.text },
  perfilEmail: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  bloco: { gap: spacing.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  linhaTitulo: { ...type.bodyStrong, color: colors.text },
  linhaTexto: { ...type.caption, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  acao: { ...type.caption, color: colors.brass },
  removerChave: { paddingVertical: spacing.xs },
  removerTexto: { ...type.caption, color: colors.crimsonBright },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  backupData: { ...type.caption, color: colors.textSecondary },

  privacidadeItem: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  privacidadeTexto: { ...type.caption, color: colors.textSecondary, flex: 1, lineHeight: 17 },

  ajudaChave: { ...type.caption, color: colors.textMuted, lineHeight: 17 },
  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.amberFaint,
  },
  avisoTexto: { ...type.caption, color: colors.textSecondary, flex: 1, lineHeight: 17 },

  versao: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
