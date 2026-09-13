import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/Sheet';
import { Botao, Campo } from '@/components/ui';
import { extrairIndicadoresWhoop, MissingApiKeyError, type IndicadoresExtraidos } from '@/ai/client';
import { EXTRACAO_WHOOP_SYSTEM } from '@/ai/prompts';
import { addActivity, upsertHealthDay, type HealthDayInput } from '@/db/repositories/health';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { METRIC_LABELS, type HealthMetric } from '@/db/repositories/health';
import { hojeISO } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';

const CAMPOS: HealthMetric[] = [
  'recovery',
  'hrv',
  'rhr',
  'sleep_hours',
  'sleep_performance',
  'strain',
  'calories',
  'respiratory_rate',
  'spo2',
  'skin_temp',
];

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

type Etapa = 'colar' | 'conferir';

/**
 * Entrada dos indicadores do Whoop.
 *
 * O usuario cola o relatorio, a IA separa os numeros e devolve o resultado
 * para conferencia. Nada entra na base sem o usuario olhar cada campo: a IA
 * le rapido, mas quem assina os dados e ele.
 */
export function ImportadorWhoop({
  visivel,
  dataPadrao,
  onFechar,
  onSalvo,
}: {
  visivel: boolean;
  dataPadrao: string;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>('colar');
  const [texto, setTexto] = useState('');
  const [data, setData] = useState(dataPadrao);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [atividades, setAtividades] = useState<IndicadoresExtraidos['atividades']>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setEtapa('colar');
    setTexto('');
    setData(dataPadrao || hojeISO());
    setValores({});
    setAtividades([]);
    setErro(null);
  }, [visivel, dataPadrao]);

  const extrair = async () => {
    if (texto.trim().length < 15) {
      return setErro('Cole o relatorio do Whoop antes de continuar.');
    }
    setErro(null);
    setOcupado(true);
    try {
      const modelo = (await getSetting(SETTINGS_KEYS.modeloIA)) || undefined;
      const extraido = await extrairIndicadoresWhoop(texto, EXTRACAO_WHOOP_SYSTEM, modelo);

      const novos: Record<string, string> = {};
      for (const campo of CAMPOS) {
        const valor = extraido[campo];
        if (typeof valor === 'number' && !Number.isNaN(valor)) novos[campo] = String(valor);
      }
      setValores(novos);
      setAtividades(extraido.atividades ?? []);
      if (extraido.date && DATA_VALIDA.test(extraido.date)) setData(extraido.date);
      setEtapa('conferir');
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setErro(
          'Falta a chave da API nas Ajustes. Voce ainda pode preencher os campos na mao clicando em conferir.',
        );
        setEtapa('conferir');
      } else {
        setErro('A leitura falhou. Confira ou preencha os campos manualmente.');
        setEtapa('conferir');
      }
    } finally {
      setOcupado(false);
    }
  };

  const salvar = async () => {
    if (!DATA_VALIDA.test(data)) return setErro('Informe a data no formato AAAA-MM-DD.');

    const preenchidos = CAMPOS.filter((c) => valores[c]?.trim());
    if (!preenchidos.length) return setErro('Preencha ao menos um indicador.');

    setOcupado(true);
    try {
      const entrada: HealthDayInput = {
        date: data,
        source: 'whoop',
        raw_text: texto.trim() || null,
      };
      for (const campo of CAMPOS) {
        const bruto = valores[campo]?.replace(',', '.').trim();
        entrada[campo] = bruto ? Number(bruto) : null;
      }
      await upsertHealthDay(entrada);

      for (const atividade of atividades ?? []) {
        await addActivity({
          date: data,
          name: atividade.name,
          strain: atividade.strain ?? null,
          duration_min: atividade.duration_min ?? null,
          avg_hr: atividade.avg_hr ?? null,
          max_hr: atividade.max_hr ?? null,
          calories: atividade.calories ?? null,
        });
      }

      onSalvo();
      onFechar();
    } catch {
      setErro('Nao foi possivel gravar os indicadores.');
    } finally {
      setOcupado(false);
    }
  };

  const encontrados = CAMPOS.filter((c) => valores[c]?.trim()).length;

  return (
    <Sheet
      visivel={visivel}
      titulo={etapa === 'colar' ? 'Novo relatorio do Whoop' : 'Conferir indicadores'}
      subtitulo={
        etapa === 'colar'
          ? 'Cole o texto do aplicativo e deixe o Watson separar os numeros.'
          : `${encontrados} indicador${encontrados === 1 ? '' : 'es'} lido${encontrados === 1 ? '' : 's'}. Corrija o que estiver errado.`
      }
      onFechar={onFechar}
      rodape={
        etapa === 'colar' ? (
          <>
            <Botao
              titulo="Ler com o Watson"
              onPress={extrair}
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
            <Botao titulo="Salvar no meu historico" onPress={salvar} carregando={ocupado} />
            <Botao titulo="Voltar" onPress={() => setEtapa('colar')} variante="fantasma" />
          </>
        )
      }
    >
      {etapa === 'colar' ? (
        <>
          <View style={s.instrucao}>
            <Ionicons name="information-circle-outline" size={16} color={colors.brass} />
            <Text style={s.instrucaoTexto}>
              No aplicativo do Whoop, abra o resumo do dia, copie o texto e cole aqui. Pode colar
              tudo, inclusive os treinos: o Watson separa o que interessa.
            </Text>
          </View>
          <Campo
            placeholder={
              'Exemplo:\nRecovery 62%\nHRV 48 ms\nRHR 54 bpm\nSleep 6h45 / 88% performance\nDay Strain 13.4'
            }
            value={texto}
            onChangeText={setTexto}
            multiline
            style={s.areaTexto}
          />
          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </>
      ) : (
        <>
          <Campo
            rotulo="Data do relatorio"
            placeholder="AAAA-MM-DD"
            value={data}
            onChangeText={setData}
            autoCapitalize="none"
          />

          <View style={s.grade}>
            {CAMPOS.map((campo) => (
              <View key={campo} style={s.gradeItem}>
                <Campo
                  rotulo={`${METRIC_LABELS[campo].label}${METRIC_LABELS[campo].unit ? ` (${METRIC_LABELS[campo].unit})` : ''}`}
                  placeholder="--"
                  value={valores[campo] ?? ''}
                  onChangeText={(v) => setValores((a) => ({ ...a, [campo]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          {!!atividades?.length && (
            <View style={s.atividades}>
              <Text style={s.atividadesTitulo}>Atividades encontradas</Text>
              {atividades.map((a, i) => (
                <View key={`${a.name}-${i}`} style={s.atividade}>
                  <Ionicons name="fitness-outline" size={14} color={colors.brass} />
                  <Text style={s.atividadeTexto}>
                    {a.name}
                    {a.duration_min ? ` · ${Math.round(a.duration_min)} min` : ''}
                    {a.strain ? ` · esforco ${a.strain.toFixed(1)}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

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
  areaTexto: { minHeight: 190 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gradeItem: { width: '47%', flexGrow: 1 },
  atividades: { marginTop: spacing.sm },
  atividadesTitulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  atividade: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  atividadeTexto: { ...type.small, color: colors.text },
  erro: { ...type.small, color: colors.crimsonBright, marginTop: spacing.sm },
});
