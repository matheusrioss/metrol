import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Cabecalho, Card, Chip, EstadoVazio, Etiqueta, TituloSecao } from '@/components/ui';
import { BarrasDiarias, Medidor, Sparkline } from '@/components/Charts';
import { ImportadorWhoop } from '@/features/saude/ImportadorWhoop';
import {
  listActivities,
  listHealthDays,
  summarizeMetric,
  METRIC_LABELS,
  PRIMARY_METRICS,
  type HealthMetric,
} from '@/db/repositories/health';
import { occurrencesInRange } from '@/db/repositories/events';
import { avaliarSaude, impactoDasReunioes, type HealthAlert, type ImpactoReuniao } from '@/features/analysis';
import { faixaRecuperacao } from '@/features/useResumoDia';
import { addDays, formatarDataCurta, fromISODate, hojeISO, toISODate, DIAS_SEMANA_CURTO } from '@/lib/date';
import type { HealthActivity, HealthDay } from '@/lib/types';
import { colors, radius, spacing, toneColors, type } from '@/theme';

type Periodo = 'dia' | 'semana' | 'mes';

const DIAS_POR_PERIODO: Record<Periodo, number> = { dia: 1, semana: 7, mes: 30 };

export default function TelaSaude() {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [dias, setDias] = useState<HealthDay[]>([]);
  const [anteriores, setAnteriores] = useState<HealthDay[]>([]);
  const [atividades, setAtividades] = useState<HealthActivity[]>([]);
  const [alertas, setAlertas] = useState<HealthAlert[]>([]);
  const [impactos, setImpactos] = useState<ImpactoReuniao[]>([]);
  const [importando, setImportando] = useState(false);
  const [carregado, setCarregado] = useState(false);

  const carregar = useCallback(async () => {
    const tamanho = DIAS_POR_PERIODO[periodo];
    const hoje = new Date();
    const inicio = addDays(hoje, -(tamanho - 1));
    const inicioAnterior = addDays(inicio, -tamanho);

    const [doPeriodo, doAnterior, atividadesPeriodo, serieLonga, ocorrencias] = await Promise.all([
      listHealthDays(toISODate(inicio), toISODate(hoje)),
      listHealthDays(toISODate(inicioAnterior), toISODate(addDays(inicio, -1))),
      listActivities(toISODate(inicio), toISODate(hoje)),
      listHealthDays(toISODate(addDays(hoje, -89)), toISODate(hoje)),
      occurrencesInRange(addDays(hoje, -90), hoje),
    ]);

    setDias(doPeriodo);
    setAnteriores(doAnterior);
    setAtividades(atividadesPeriodo);
    setAlertas(avaliarSaude(serieLonga));
    setImpactos(impactoDasReunioes(ocorrencias, serieLonga).slice(0, 5));
    setCarregado(true);
  }, [periodo]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const ultimo = dias.length ? dias[dias.length - 1] : null;
  const faixa = faixaRecuperacao(ultimo?.recovery);
  const tamanho = DIAS_POR_PERIODO[periodo];

  // Serie continua, com buracos onde nao ha registro, para que a forma do
  // grafico nao minta sobre dias sem dado.
  const serieContinua: { rotulo: string; valor: number | null; data: string }[] = [];
  for (let i = tamanho - 1; i >= 0; i -= 1) {
    const dataDia = addDays(new Date(), -i);
    const chave = toISODate(dataDia);
    const registro = dias.find((d) => d.date === chave);
    serieContinua.push({
      rotulo:
        tamanho <= 7
          ? DIAS_SEMANA_CURTO[dataDia.getDay()]
          : tamanho <= 31 && i % 5 === 0
            ? String(dataDia.getDate())
            : '',
      valor: registro?.recovery ?? null,
      data: chave,
    });
  }

  const serieMetrica = (metrica: HealthMetric) =>
    dias.map((d) => ({ rotulo: formatarDataCurta(fromISODate(d.date)), valor: d[metrica] }));

  return (
    <>
      <Screen>
        <Cabecalho
          sobretitulo="Indicadores do Whoop"
          titulo="Saude"
          acessorio={
            <Pressable
              onPress={() => setImportando(true)}
              style={({ pressed }) => [s.botaoAdicionar, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={22} color={colors.textInverse} />
            </Pressable>
          }
        />

        <View style={s.abas}>
          {(['dia', 'semana', 'mes'] as Periodo[]).map((p) => (
            <Chip
              key={p}
              rotulo={p === 'dia' ? 'Hoje' : p === 'semana' ? '7 dias' : '30 dias'}
              ativo={periodo === p}
              onPress={() => setPeriodo(p)}
            />
          ))}
        </View>

        {!carregado ? null : dias.length === 0 ? (
          <EstadoVazio
            icone="pulse-outline"
            titulo="Nenhum indicador neste periodo"
            texto="Cole o relatorio do Whoop e o Watson organiza tudo: recuperacao, sono, esforco e variabilidade cardiaca, dia a dia."
            acao="Lancar relatorio"
            onAcao={() => setImportando(true)}
          />
        ) : (
          <>
            <Card destaque>
              <View style={s.resumoTopo}>
                <Medidor
                  valor={ultimo?.recovery ?? null}
                  cor={toneColors[faixa.tom].fg}
                  rotulo="recuperacao"
                  tamanho={104}
                />
                <View style={s.resumoNumeros}>
                  <Etiqueta tom={faixa.tom}>Recuperacao {faixa.rotulo}</Etiqueta>
                  <Text style={s.resumoData}>
                    {ultimo ? `Ultimo registro em ${ultimo.date}` : 'Sem registro'}
                  </Text>
                  <View style={s.resumoGrid}>
                    <View style={s.resumoCelula}>
                      <Text style={s.resumoValor}>
                        {ultimo?.sleep_hours != null ? ultimo.sleep_hours.toFixed(1) : '--'}
                      </Text>
                      <Text style={s.resumoRotulo}>horas de sono</Text>
                    </View>
                    <View style={s.resumoCelula}>
                      <Text style={s.resumoValor}>
                        {ultimo?.strain != null ? ultimo.strain.toFixed(1) : '--'}
                      </Text>
                      <Text style={s.resumoRotulo}>esforco</Text>
                    </View>
                  </View>
                </View>
              </View>

              {periodo !== 'dia' && (
                <View style={s.barrasBloco}>
                  <Text style={s.blocoRotulo}>
                    Recuperacao diaria · {periodo === 'semana' ? 'ultimos 7 dias' : 'ultimos 30 dias'}
                  </Text>
                  <BarrasDiarias
                    dados={serieContinua}
                    cor={colors.brass}
                    maximo={100}
                    altura={96}
                    sufixo="Colunas vazias sao dias sem registro."
                  />
                </View>
              )}
            </Card>

            {alertas.length > 0 && (
              <>
                <TituloSecao>Vigilancia do Watson</TituloSecao>
                {alertas.map((alerta, i) => {
                  const cor = toneColors[alerta.severity];
                  return (
                    <Card key={`${alerta.kind}-${i}`} style={s.alerta}>
                      <Ionicons
                        name={
                          alerta.severity === 'critico'
                            ? 'warning-outline'
                            : alerta.severity === 'atencao'
                              ? 'alert-circle-outline'
                              : 'checkmark-circle-outline'
                        }
                        size={17}
                        color={cor.fg}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertaTitulo}>{alerta.title}</Text>
                        <Text style={s.alertaTexto}>{alerta.body}</Text>
                      </View>
                    </Card>
                  );
                })}
                <Text style={s.avisoMedico}>
                  O Watson le numeros, nao diagnostica. Sinais persistentes merecem um medico.
                </Text>
              </>
            )}

            <TituloSecao>Indicadores no periodo</TituloSecao>
            {PRIMARY_METRICS.map((metrica) => {
              const resumo = summarizeMetric(metrica, dias, anteriores);
              if (!resumo.amostras) return null;
              const rotulo = METRIC_LABELS[metrica];
              const subindo = (resumo.variacao ?? 0) > 0;

              return (
                <Card key={metrica} style={s.metricaCard}>
                  <View style={s.metricaTopo}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.metricaNome}>{rotulo.label}</Text>
                      <View style={s.metricaValorLinha}>
                        <Text style={s.metricaNumero}>
                          {resumo.media !== null
                            ? metrica === 'strain' || metrica === 'sleep_hours'
                              ? resumo.media.toFixed(1)
                              : Math.round(resumo.media)
                            : '--'}
                        </Text>
                        <Text style={s.metricaUnidade}>{rotulo.unit}</Text>
                        {resumo.variacao !== null && Math.abs(resumo.variacao) >= 1 && (
                          <View style={s.variacao}>
                            <Ionicons
                              name={subindo ? 'trending-up' : 'trending-down'}
                              size={12}
                              color={colors.textSecondary}
                            />
                            <Text style={s.variacaoTexto}>
                              {Math.abs(Math.round(resumo.variacao))}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.metricaDetalhe}>
                        media de {resumo.amostras} dia{resumo.amostras > 1 ? 's' : ''} · minimo{' '}
                        {resumo.minimo?.toFixed(metrica === 'strain' ? 1 : 0)} · maximo{' '}
                        {resumo.maximo?.toFixed(metrica === 'strain' ? 1 : 0)}
                      </Text>
                    </View>
                  </View>
                  {dias.length > 2 && (
                    <Sparkline dados={serieMetrica(metrica)} cor={colors.brass} altura={48} />
                  )}
                </Card>
              );
            })}

            {impactos.length > 0 && (
              <>
                <TituloSecao>Agenda cruzada com recuperacao</TituloSecao>
                <Card>
                  <Text style={s.cruzamentoIntro}>
                    Comparacao entre a recuperacao no dia seguinte a cada reuniao recorrente e a sua
                    media geral do periodo. E um indicio, nao uma prova de causa.
                  </Text>
                  {impactos.map((item, i) => {
                    const negativo = (item.delta ?? 0) < -3;
                    const positivo = (item.delta ?? 0) > 3;
                    return (
                      <View key={item.eventId} style={[s.impacto, i > 0 && s.impactoSeparado]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.impactoTitulo} numberOfLines={1}>
                            {item.titulo}
                          </Text>
                          <Text style={s.impactoDetalhe}>
                            {item.ocorrencias} ocorrencias · recuperacao seguinte{' '}
                            {item.recuperacaoSeguinte !== null
                              ? `${Math.round(item.recuperacaoSeguinte)}%`
                              : '--'}
                          </Text>
                        </View>
                        <Etiqueta tom={negativo ? 'critico' : positivo ? 'bom' : 'neutro'}>
                          {item.delta === null
                            ? '--'
                            : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} pts`}
                        </Etiqueta>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {atividades.length > 0 && (
              <>
                <TituloSecao>Atividades registradas</TituloSecao>
                <Card>
                  {atividades.map((atividade, i) => (
                    <View key={atividade.id} style={[s.atividade, i > 0 && s.impactoSeparado]}>
                      <View style={s.atividadeIcone}>
                        <Ionicons name="fitness-outline" size={15} color={colors.brass} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.atividadeNome}>{atividade.name}</Text>
                        <Text style={s.atividadeDetalhe}>
                          {[
                            atividade.date,
                            atividade.duration_min ? `${Math.round(atividade.duration_min)} min` : null,
                            atividade.strain ? `esforco ${atividade.strain.toFixed(1)}` : null,
                            atividade.avg_hr ? `${Math.round(atividade.avg_hr)} bpm medio` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </Screen>

      <ImportadorWhoop
        visivel={importando}
        dataPadrao={hojeISO()}
        onFechar={() => setImportando(false)}
        onSalvo={carregar}
      />
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
  abas: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },

  resumoTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  resumoNumeros: { flex: 1, gap: spacing.sm },
  resumoData: { ...type.caption, color: colors.textMuted },
  resumoGrid: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  resumoCelula: {},
  resumoValor: { ...type.numeral, fontSize: 21, lineHeight: 25, color: colors.text },
  resumoRotulo: { ...type.caption, fontSize: 10, color: colors.textMuted },

  barrasBloco: { marginTop: spacing.xl },
  blocoRotulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.md },

  alerta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  alertaTitulo: { ...type.bodyStrong, color: colors.text },
  alertaTexto: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 19 },
  avisoMedico: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },

  metricaCard: { marginBottom: spacing.sm, gap: spacing.md },
  metricaTopo: { flexDirection: 'row', alignItems: 'flex-start' },
  metricaNome: { ...type.caption, color: colors.textSecondary, letterSpacing: 0.4 },
  metricaValorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: 2 },
  metricaNumero: { ...type.numeral, fontSize: 27, lineHeight: 31, color: colors.text },
  metricaUnidade: { ...type.small, color: colors.textMuted },
  variacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
  },
  variacaoTexto: { ...type.caption, fontSize: 10, color: colors.textSecondary },
  metricaDetalhe: { ...type.caption, color: colors.textMuted, marginTop: 3 },

  cruzamentoIntro: { ...type.caption, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.lg },
  impacto: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  impactoSeparado: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  impactoTitulo: { ...type.bodyStrong, color: colors.text },
  impactoDetalhe: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  atividade: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  atividadeIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atividadeNome: { ...type.bodyStrong, color: colors.text },
  atividadeDetalhe: { ...type.caption, color: colors.textMuted, marginTop: 2 },
});
