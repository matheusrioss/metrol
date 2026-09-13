import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Cabecalho, Card, Chip, EstadoVazio, Etiqueta } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { Botao } from '@/components/ui';
import { ImportadorResumo } from '@/features/corporativo/ImportadorResumo';
import {
  countNotesByCompany,
  deleteNote,
  listNotes,
  searchNotes,
} from '@/db/repositories/notes';
import {
  COMPANY_OPTIONS,
  companyLabel,
  parseJsonArray,
  type Company,
  type MeetingNote,
} from '@/lib/types';
import { formatarDataLonga, fromISODate } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';

export default function TelaCorporativo() {
  const [notas, setNotas] = useState<MeetingNote[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [filtro, setFiltro] = useState<Company | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [notaEmEdicao, setNotaEmEdicao] = useState<MeetingNote | null>(null);
  const [detalhe, setDetalhe] = useState<MeetingNote | null>(null);

  const carregar = useCallback(async () => {
    const [lista, contador] = await Promise.all([
      listNotes({ company: filtro }),
      countNotesByCompany(),
    ]);
    setNotas(lista);
    setContagem(contador);
  }, [filtro]);

  useFocusEffect(
    useCallback(() => {
      if (!busca.trim()) void carregar();
    }, [carregar, busca]),
  );

  const pesquisar = async (texto: string) => {
    setBusca(texto);
    if (texto.trim().length < 3) {
      setBuscando(false);
      await carregar();
      return;
    }
    setBuscando(true);
    const resultados = await searchNotes(texto, 30);
    setNotas(resultados.map((r) => r.note));
  };

  const excluir = (nota: MeetingNote) => {
    Alert.alert('Excluir dossie', `"${nota.title}" sai da base de conhecimento do Watson.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(nota.id);
          setDetalhe(null);
          await carregar();
        },
      },
    ]);
  };

  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  return (
    <>
      <Screen>
        <Cabecalho
          sobretitulo="Base de conhecimento"
          titulo="Dossies"
          acessorio={
            <Pressable
              onPress={() => {
                setNotaEmEdicao(null);
                setImportando(true);
              }}
              style={({ pressed }) => [s.botaoAdicionar, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={22} color={colors.textInverse} />
            </Pressable>
          }
        />

        <View style={s.buscaCaixa}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={s.buscaEntrada}
            placeholder="Buscar por assunto, pessoa ou decisao"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.brass}
            value={busca}
            onChangeText={pesquisar}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {!!busca && (
            <Pressable onPress={() => pesquisar('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {!buscando && (
          <View style={s.filtros}>
            <Chip
              rotulo={`Todas${total ? ` (${total})` : ''}`}
              ativo={filtro === 'todas'}
              onPress={() => setFiltro('todas')}
            />
            {COMPANY_OPTIONS.map((opcao) => (
              <Chip
                key={opcao.value}
                rotulo={`${opcao.short}${contagem[opcao.value] ? ` (${contagem[opcao.value]})` : ''}`}
                ativo={filtro === opcao.value}
                onPress={() => setFiltro(opcao.value)}
              />
            ))}
          </View>
        )}

        {notas.length === 0 ? (
          <EstadoVazio
            icone={buscando ? 'search-outline' : 'library-outline'}
            titulo={buscando ? 'Nada encontrado' : 'A base esta vazia'}
            texto={
              buscando
                ? 'Nenhum dossie casa com esses termos. Tente outras palavras ou limpe a busca.'
                : 'Cole aqui os resumos do Plaud. Cada reuniao vira um dossie classificado, e o Watson passa a responder perguntas sobre tudo o que foi tratado.'
            }
            acao={buscando ? undefined : 'Adicionar o primeiro'}
            onAcao={() => {
              setNotaEmEdicao(null);
              setImportando(true);
            }}
          />
        ) : (
          notas.map((nota) => {
            const temas = parseJsonArray(nota.topics);
            const pessoas = parseJsonArray(nota.participants);
            return (
              <Card key={nota.id} style={s.dossie} onPress={() => setDetalhe(nota)}>
                <View style={s.dossieTopo}>
                  <Etiqueta tom="neutro">{companyLabel(nota.company)}</Etiqueta>
                  <Text style={s.dossieData}>{nota.meeting_date}</Text>
                </View>
                <Text style={s.dossieTitulo}>{nota.title}</Text>
                <Text style={s.dossieResumo} numberOfLines={3}>
                  {nota.summary}
                </Text>
                <View style={s.dossieRodape}>
                  {pessoas.length > 0 && (
                    <View style={s.rodapeItem}>
                      <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                      <Text style={s.rodapeTexto} numberOfLines={1}>
                        {pessoas.slice(0, 3).join(', ')}
                        {pessoas.length > 3 ? ` +${pessoas.length - 3}` : ''}
                      </Text>
                    </View>
                  )}
                  {temas.length > 0 && (
                    <View style={s.temas}>
                      {temas.slice(0, 4).map((tema) => (
                        <View key={tema} style={s.tema}>
                          <Text style={s.temaTexto}>{tema}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </Screen>

      <ImportadorResumo
        visivel={importando}
        nota={notaEmEdicao}
        onFechar={() => {
          setImportando(false);
          setNotaEmEdicao(null);
        }}
        onSalvo={carregar}
      />

      <Sheet
        visivel={!!detalhe}
        titulo={detalhe?.title ?? ''}
        subtitulo={
          detalhe
            ? `${companyLabel(detalhe.company)} · ${formatarDataLonga(fromISODate(detalhe.meeting_date))}`
            : undefined
        }
        onFechar={() => setDetalhe(null)}
        rodape={
          <>
            <Botao
              titulo="Editar dossie"
              onPress={() => {
                const alvo = detalhe;
                setDetalhe(null);
                setNotaEmEdicao(alvo);
                setImportando(true);
              }}
              variante="contorno"
            />
            <Botao
              titulo="Excluir da base"
              onPress={() => detalhe && excluir(detalhe)}
              variante="perigo"
            />
          </>
        }
      >
        {detalhe && (
          <>
            {parseJsonArray(detalhe.participants).length > 0 && (
              <View style={s.secaoDetalhe}>
                <Text style={s.secaoTitulo}>Participantes</Text>
                <Text style={s.secaoTexto}>
                  {parseJsonArray(detalhe.participants).join(', ')}
                </Text>
              </View>
            )}

            <View style={s.secaoDetalhe}>
              <Text style={s.secaoTitulo}>Resumo</Text>
              <Text style={s.secaoTexto}>{detalhe.summary}</Text>
            </View>

            {!!detalhe.decisions && (
              <View style={s.secaoDetalhe}>
                <Text style={s.secaoTitulo}>Decisoes</Text>
                <Text style={s.secaoTexto}>{detalhe.decisions}</Text>
              </View>
            )}

            {!!detalhe.action_items && (
              <View style={s.secaoDetalhe}>
                <Text style={s.secaoTitulo}>Acoes combinadas</Text>
                <Text style={s.secaoTexto}>{detalhe.action_items}</Text>
              </View>
            )}

            {parseJsonArray(detalhe.topics).length > 0 && (
              <View style={s.secaoDetalhe}>
                <Text style={s.secaoTitulo}>Temas</Text>
                <View style={s.temas}>
                  {parseJsonArray(detalhe.topics).map((tema) => (
                    <View key={tema} style={s.tema}>
                      <Text style={s.temaTexto}>{tema}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!detalhe.raw_text && (
              <View style={s.secaoDetalhe}>
                <Text style={s.secaoTitulo}>Texto original</Text>
                <Text style={s.secaoTextoBruto}>{detalhe.raw_text}</Text>
              </View>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}

const s = StyleSheet.create({
  botaoAdicionar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buscaCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  buscaEntrada: { flex: 1, color: colors.text, ...type.body, padding: 0 },

  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },

  dossie: { marginBottom: spacing.md, gap: spacing.sm },
  dossieTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dossieData: { ...type.caption, color: colors.textMuted },
  dossieTitulo: { ...type.heading, color: colors.text },
  dossieResumo: { ...type.small, color: colors.textSecondary, lineHeight: 19 },
  dossieRodape: { gap: spacing.sm, marginTop: spacing.xs },
  rodapeItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rodapeTexto: { ...type.caption, color: colors.textMuted, flex: 1 },
  temas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tema: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  temaTexto: { ...type.caption, fontSize: 10, color: colors.textSecondary },

  secaoDetalhe: { marginBottom: spacing.xl },
  secaoTitulo: { ...type.eyebrow, color: colors.brass, marginBottom: spacing.sm },
  secaoTexto: { ...type.body, color: colors.text, lineHeight: 22 },
  secaoTextoBruto: { ...type.small, color: colors.textMuted, lineHeight: 19 },
});
