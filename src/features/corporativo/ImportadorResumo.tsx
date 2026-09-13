import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/Sheet';
import { Botao, Campo, Chip } from '@/components/ui';
import { estruturarResumo, MissingApiKeyError } from '@/ai/client';
import { createNote, updateNote } from '@/db/repositories/notes';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { COMPANY_OPTIONS, parseJsonArray, type Company, type MeetingNote } from '@/lib/types';
import { hojeISO } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

type Etapa = 'colar' | 'conferir';

/**
 * Entrada de um resumo do Plaud na base corporativa.
 *
 * A IA classifica empresa, participantes e temas, porque e isso que depois
 * permite ao Watson achar a resposta certa entre centenas de reunioes. O
 * usuario confere antes de gravar.
 */
export function ImportadorResumo({
  visivel,
  nota,
  onFechar,
  onSalvo,
}: {
  visivel: boolean;
  nota: MeetingNote | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!nota;

  const [etapa, setEtapa] = useState<Etapa>('colar');
  const [bruto, setBruto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [empresa, setEmpresa] = useState<Company>('grupo');
  const [data, setData] = useState(hojeISO());
  const [participantes, setParticipantes] = useState('');
  const [temas, setTemas] = useState('');
  const [resumo, setResumo] = useState('');
  const [decisoes, setDecisoes] = useState('');
  const [acoes, setAcoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    if (nota) {
      setEtapa('conferir');
      setBruto(nota.raw_text ?? '');
      setTitulo(nota.title);
      setEmpresa(nota.company);
      setData(nota.meeting_date);
      setParticipantes(parseJsonArray(nota.participants).join(', '));
      setTemas(parseJsonArray(nota.topics).join(', '));
      setResumo(nota.summary);
      setDecisoes(nota.decisions ?? '');
      setAcoes(nota.action_items ?? '');
    } else {
      setEtapa('colar');
      setBruto('');
      setTitulo('');
      setEmpresa('grupo');
      setData(hojeISO());
      setParticipantes('');
      setTemas('');
      setResumo('');
      setDecisoes('');
      setAcoes('');
    }
    setErro(null);
  }, [visivel, nota]);

  const organizar = async () => {
    if (bruto.trim().length < 30) {
      return setErro('Cole o resumo da reuniao antes de continuar.');
    }
    setErro(null);
    setOcupado(true);
    try {
      const modelo = (await getSetting(SETTINGS_KEYS.modeloIA)) || undefined;
      const estruturado = await estruturarResumo(bruto, modelo);
      if (estruturado) {
        setTitulo(estruturado.title);
        setEmpresa(estruturado.company as Company);
        if (estruturado.meeting_date && DATA_VALIDA.test(estruturado.meeting_date)) {
          setData(estruturado.meeting_date);
        }
        setParticipantes((estruturado.participants ?? []).join(', '));
        setTemas((estruturado.topics ?? []).join(', '));
        setResumo(estruturado.summary);
        setDecisoes(estruturado.decisions ?? '');
        setAcoes(estruturado.action_items ?? '');
      }
      setEtapa('conferir');
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setErro('Falta a chave da API nas Ajustes. Preencha os campos manualmente por enquanto.');
      } else {
        setErro('A organizacao automatica falhou. Preencha os campos manualmente.');
      }
      setResumo((atual) => atual || bruto.trim());
      setEtapa('conferir');
    } finally {
      setOcupado(false);
    }
  };

  const salvar = async () => {
    setErro(null);
    if (titulo.trim().length < 3) return setErro('Escreva um titulo para o dossie.');
    if (resumo.trim().length < 10) return setErro('O resumo esta muito curto.');
    if (!DATA_VALIDA.test(data)) return setErro('Informe a data no formato AAAA-MM-DD.');

    const dados = {
      title: titulo,
      company: empresa,
      meeting_date: data,
      participants: participantes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      topics: temas
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      summary: resumo,
      decisions: decisoes,
      action_items: acoes,
      raw_text: bruto || null,
      source: 'plaud',
    };

    setOcupado(true);
    try {
      if (nota) await updateNote(nota.id, dados);
      else await createNote(dados);
      onSalvo();
      onFechar();
    } catch {
      setErro('Nao foi possivel gravar o dossie.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Sheet
      visivel={visivel}
      titulo={editando ? 'Editar dossie' : etapa === 'colar' ? 'Novo resumo do Plaud' : 'Conferir dossie'}
      subtitulo={
        etapa === 'colar'
          ? 'Cole o resumo e o Watson classifica empresa, participantes e temas.'
          : 'Confira a classificacao. E ela que o Watson usa para achar a resposta depois.'
      }
      onFechar={onFechar}
      rodape={
        etapa === 'colar' ? (
          <>
            <Botao
              titulo="Organizar com o Watson"
              onPress={organizar}
              carregando={ocupado}
              icone="sparkles-outline"
            />
            <Botao
              titulo="Preencher manualmente"
              onPress={() => setEtapa('conferir')}
              variante="fantasma"
            />
          </>
        ) : (
          <>
            <Botao
              titulo={editando ? 'Salvar alteracoes' : 'Guardar na base'}
              onPress={salvar}
              carregando={ocupado}
            />
            {!editando && (
              <Botao titulo="Voltar ao texto" onPress={() => setEtapa('colar')} variante="fantasma" />
            )}
          </>
        )
      }
    >
      {etapa === 'colar' ? (
        <>
          <View style={s.instrucao}>
            <Ionicons name="information-circle-outline" size={16} color={colors.brass} />
            <Text style={s.instrucaoTexto}>
              Copie o resumo gerado pelo Plaud e cole aqui. Pode ser a transcricao inteira: o Watson
              extrai titulo, participantes, decisoes e acoes, e guarda o texto original junto.
            </Text>
          </View>
          <Campo
            placeholder="Cole aqui o resumo ou a transcricao da reuniao"
            value={bruto}
            onChangeText={setBruto}
            multiline
            style={s.areaTexto}
          />
          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </>
      ) : (
        <>
          <Campo
            rotulo="Titulo do dossie"
            placeholder="Reuniao de diretoria sobre o contrato"
            value={titulo}
            onChangeText={setTitulo}
          />

          <Text style={s.rotulo}>Empresa do grupo</Text>
          <View style={s.grade}>
            {COMPANY_OPTIONS.map((opcao) => (
              <Chip
                key={opcao.value}
                rotulo={opcao.short}
                ativo={empresa === opcao.value}
                onPress={() => setEmpresa(opcao.value)}
              />
            ))}
          </View>

          <Campo
            rotulo="Data da reuniao"
            placeholder="AAAA-MM-DD"
            value={data}
            onChangeText={setData}
            autoCapitalize="none"
          />

          <Campo
            rotulo="Participantes"
            placeholder="Separados por virgula"
            value={participantes}
            onChangeText={setParticipantes}
          />

          <Campo
            rotulo="Temas"
            placeholder="contrato, sinalizacao, prazo"
            value={temas}
            onChangeText={setTemas}
            autoCapitalize="none"
            dica="Separados por virgula. Sao eles que orientam a busca do Watson."
          />

          <Campo
            rotulo="Resumo"
            placeholder="O que foi tratado"
            value={resumo}
            onChangeText={setResumo}
            multiline
            style={{ minHeight: 140 }}
          />

          <Campo
            rotulo="Decisoes"
            placeholder="Uma decisao por linha"
            value={decisoes}
            onChangeText={setDecisoes}
            multiline
          />

          <Campo
            rotulo="Acoes combinadas"
            placeholder="Responsavel, o que fazer e prazo"
            value={acoes}
            onChangeText={setAcoes}
            multiline
          />

          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  instrucao: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brassFaint,
    marginBottom: spacing.lg,
  },
  instrucaoTexto: { ...type.caption, color: colors.textSecondary, flex: 1, lineHeight: 17 },
  areaTexto: { minHeight: 220 },
  rotulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  erro: { ...type.small, color: colors.crimsonBright, marginTop: spacing.sm },
});
