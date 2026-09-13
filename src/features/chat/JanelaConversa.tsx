import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatWatson } from './useChatWatson';
import { RevisaoContexto } from './RevisaoContexto';
import { EstadoVazio } from '@/components/ui';
import { colors, radius, spacing, type } from '@/theme';
import type { ChatMessage } from '@/lib/types';
import { formatarHora } from '@/lib/date';

const SUGESTOES = [
  'O que eu tenho hoje?',
  'Como esta minha semana de saude?',
  'Quais reunioes mais me desgastam?',
  'O que ficou decidido sobre a industria?',
];

function Balao({ mensagem }: { mensagem: ChatMessage }) {
  const doWatson = mensagem.role === 'watson';
  return (
    <View style={[s.balaoLinha, doWatson ? s.alinhaEsquerda : s.alinhaDireita]}>
      {doWatson && (
        <View style={s.avatar}>
          <Ionicons name="glasses-outline" size={13} color={colors.brass} />
        </View>
      )}
      <View style={[s.balao, doWatson ? s.balaoWatson : s.balaoUsuario]}>
        <Text style={[s.balaoTexto, !doWatson && s.balaoTextoUsuario]}>{mensagem.content}</Text>
        {!!mensagem.context_ref && (
          <Text style={s.contexto} numberOfLines={1}>
            enviado com: {mensagem.context_ref}
          </Text>
        )}
        <Text style={s.hora}>{formatarHora(new Date(mensagem.created_at))}</Text>
      </View>
    </View>
  );
}

/** A janela de conversa em tela cheia. */
export function JanelaConversa({
  visivel,
  onFechar,
}: {
  visivel: boolean;
  onFechar: () => void;
}) {
  const chat = useChatWatson();
  const [texto, setTexto] = useState('');
  const lista = useRef<FlatList<ChatMessage>>(null);

  const enviar = async () => {
    const pergunta = texto.trim();
    if (!pergunta) return;
    setTexto('');
    await chat.preparar(pergunta);
    setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 120);
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar} statusBarTranslucent>
      <SafeAreaView style={s.tela}>
        <View style={s.cabecalho}>
          <View style={s.selo}>
            <Ionicons name="glasses-outline" size={17} color={colors.brass} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Watson</Text>
            <Text style={s.subtitulo}>
              {chat.pensando ? 'Consultando a base...' : 'Pergunte sobre qualquer coisa da sua base'}
            </Text>
          </View>
          <Pressable onPress={chat.limpar} hitSlop={10} style={s.acaoCabecalho}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={onFechar} hitSlop={10} style={s.acaoCabecalho}>
            <Ionicons name="close" size={19} color={colors.textSecondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {chat.carregando ? (
            <View style={s.centro}>
              <ActivityIndicator color={colors.brass} />
            </View>
          ) : chat.mensagens.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EstadoVazio
                icone="chatbubbles-outline"
                titulo="As suas de sempre, senhor?"
                texto="O Watson responde a partir do que existe na sua base: agenda, saude, aniversarios e resumos de reuniao. Quanto mais voce registra, mais ele enxerga."
              />
              <View style={s.sugestoes}>
                {SUGESTOES.map((sugestao) => (
                  <Pressable
                    key={sugestao}
                    onPress={() => setTexto(sugestao)}
                    style={({ pressed }) => [s.sugestao, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={s.sugestaoTexto}>{sugestao}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={lista}
              data={chat.mensagens}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <Balao mensagem={item} />}
              contentContainerStyle={s.listaConteudo}
              onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
            />
          )}

          {chat.pensando && (
            <View style={s.pensando}>
              <ActivityIndicator size="small" color={colors.brass} />
              <Text style={s.pensandoTexto}>O Watson esta pensando</Text>
            </View>
          )}

          {!!chat.erro && (
            <View style={s.erro}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.crimsonBright} />
              <Text style={s.erroTexto}>{chat.erro}</Text>
            </View>
          )}

          <View style={s.barraEntrada}>
            <TextInput
              style={s.entrada}
              placeholder="Pergunte ao Watson"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.brass}
              value={texto}
              onChangeText={setTexto}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={enviar}
              disabled={!texto.trim() || chat.pensando}
              style={({ pressed }) => [
                s.enviar,
                (!texto.trim() || chat.pensando) && s.enviarInativo,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="arrow-up" size={18} color={colors.textInverse} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <RevisaoContexto
          visivel={chat.revisando}
          pergunta={chat.perguntaPendente}
          blocos={chat.blocos}
          ocupado={chat.pensando}
          onAlternar={chat.alternarBloco}
          onCancelar={chat.cancelar}
          onConfirmar={chat.confirmar}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  selo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brassFaint,
    borderWidth: 1,
    borderColor: colors.brassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...type.heading, color: colors.text },
  subtitulo: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  acaoCabecalho: { padding: spacing.xs },

  listaConteudo: { padding: spacing.lg, gap: spacing.md },
  balaoLinha: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  alinhaEsquerda: { justifyContent: 'flex-start' },
  alinhaDireita: { justifyContent: 'flex-end' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brassFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  balao: { maxWidth: '82%', borderRadius: radius.lg, padding: spacing.md + 2 },
  balaoWatson: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  balaoUsuario: { backgroundColor: colors.brassFaint, borderBottomRightRadius: radius.sm },
  balaoTexto: { ...type.body, color: colors.text },
  balaoTextoUsuario: { color: colors.text },
  contexto: { ...type.caption, fontSize: 10, color: colors.textMuted, marginTop: spacing.sm },
  hora: { ...type.caption, fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },

  sugestoes: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  sugestao: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sugestaoTexto: { ...type.small, color: colors.textSecondary, textAlign: 'center' },

  pensando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  pensandoTexto: { ...type.caption, color: colors.textMuted },

  erro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.crimsonFaint,
  },
  erroTexto: { ...type.caption, color: colors.crimsonBright, flex: 1, lineHeight: 16 },

  barraEntrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entrada: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    color: colors.text,
    maxHeight: 120,
    ...type.body,
  },
  enviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarInativo: { opacity: 0.35 },
});
