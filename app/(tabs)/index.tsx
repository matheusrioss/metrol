import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, TituloSecao, Etiqueta, Carregando } from '@/components/ui';
import { Medidor, Sparkline } from '@/components/Charts';
import { JanelaConversa } from '@/features/chat/JanelaConversa';
import { faixaRecuperacao, useResumoDia } from '@/features/useResumoDia';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, toneColors, type } from '@/theme';
import { descreverDistancia, formatarDiaCompleto, formatarHora } from '@/lib/date';
import { companyLabel } from '@/lib/types';
import type { EventOccurrence } from '@/db/repositories/events';

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function LinhaEvento({ oc }: { oc: EventOccurrence }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/calendario')}
      style={({ pressed }) => [e.linha, pressed && { opacity: 0.65 }]}
    >
      <View style={e.horaColuna}>
        <Text style={e.hora}>{oc.event.all_day ? '--:--' : formatarHora(oc.start)}</Text>
        {!!oc.end && !oc.event.all_day && <Text style={e.fim}>{formatarHora(oc.end)}</Text>}
      </View>
      <View style={e.trilho} />
      <View style={{ flex: 1 }}>
        <Text style={e.titulo} numberOfLines={1}>
          {oc.event.title}
        </Text>
        <Text style={e.detalhe} numberOfLines={1}>
          {[
            oc.event.company ? companyLabel(oc.event.company) : null,
            oc.event.location,
            oc.event.description,
          ]
            .filter(Boolean)
            .join(' · ') || 'Sem detalhes'}
        </Text>
      </View>
      {oc.isRepeat && <Ionicons name="repeat" size={13} color={colors.textMuted} />}
    </Pressable>
  );
}

export default function TelaHome() {
  const { usuario } = useAuth();
  const router = useRouter();
  const resumo = useResumoDia();
  const [conversaAberta, setConversaAberta] = useState(false);

  const primeiroNome = usuario?.name?.split(' ')[0] ?? '';
  const saude = resumo.saudeHoje ?? resumo.saudeUltima;
  const faixa = faixaRecuperacao(saude?.recovery);

  if (resumo.carregando) {
    return (
      <Screen>
        <Carregando texto="Reunindo o seu dia" />
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        <View style={s.topo}>
          <Text style={s.data}>{formatarDiaCompleto(new Date())}</Text>
          <Text style={s.saudacao}>
            {saudacao()}
            {primeiroNome ? `, ${primeiroNome}` : ''}.
          </Text>
        </View>

        <Card destaque style={s.cartaoConversa}>
          <View style={s.conversaTopo}>
            <View style={s.selo}>
              <Ionicons name="glasses-outline" size={16} color={colors.brass} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.conversaTitulo}>Falar com o Watson</Text>
              <Text style={s.conversaTexto}>
                {resumo.totalDossies > 0
                  ? `${resumo.totalDossies} registro${resumo.totalDossies > 1 ? 's' : ''} na base corporativa, ${resumo.serie.length} dias de saude e sua agenda.`
                  : 'A base ainda esta vazia. Comece adicionando um resumo de reuniao.'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setConversaAberta(true)}
            style={({ pressed }) => [s.campoFalso, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.campoFalsoTexto}>Pergunte qualquer coisa...</Text>
            <View style={s.campoFalsoBotao}>
              <Ionicons name="arrow-up" size={16} color={colors.textInverse} />
            </View>
          </Pressable>
        </Card>

        {resumo.alertas.length > 0 && (
          <>
            <TituloSecao>Sinais do seu corpo</TituloSecao>
            {resumo.alertas.slice(0, 3).map((alerta, i) => {
              const cor = toneColors[alerta.severity];
              return (
                <Card key={`${alerta.kind}-${i}`} style={s.alerta}>
                  <View style={[s.alertaBarra, { backgroundColor: cor.fg }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.alertaTopo}>
                      <Ionicons
                        name={
                          alerta.severity === 'critico'
                            ? 'warning-outline'
                            : alerta.severity === 'atencao'
                              ? 'alert-circle-outline'
                              : 'checkmark-circle-outline'
                        }
                        size={15}
                        color={cor.fg}
                      />
                      <Text style={s.alertaTitulo}>{alerta.title}</Text>
                    </View>
                    <Text style={s.alertaTexto}>{alerta.body}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <TituloSecao acao="Ver tudo" onAcao={() => router.push('/saude')}>
          Sua saude hoje
        </TituloSecao>
        <Card onPress={() => router.push('/saude')}>
          {saude ? (
            <>
              <View style={s.saudeLinha}>
                <Medidor
                  valor={saude.recovery}
                  cor={toneColors[faixa.tom].fg}
                  rotulo="recuperacao"
                />
                <View style={s.saudeNumeros}>
                  <Etiqueta tom={faixa.tom}>Recuperacao {faixa.rotulo}</Etiqueta>
                  <View style={s.metricaLinha}>
                    <Text style={s.metricaRotulo}>Sono</Text>
                    <Text style={s.metricaValor}>
                      {saude.sleep_hours !== null ? `${saude.sleep_hours.toFixed(1)} h` : '--'}
                    </Text>
                  </View>
                  <View style={s.metricaLinha}>
                    <Text style={s.metricaRotulo}>Esforco</Text>
                    <Text style={s.metricaValor}>
                      {saude.strain !== null ? saude.strain.toFixed(1) : '--'}
                    </Text>
                  </View>
                  <View style={s.metricaLinha}>
                    <Text style={s.metricaRotulo}>VFC</Text>
                    <Text style={s.metricaValor}>
                      {saude.hrv !== null ? `${Math.round(saude.hrv)} ms` : '--'}
                    </Text>
                  </View>
                </View>
              </View>
              {resumo.serie.length > 2 && (
                <View style={s.sparkBloco}>
                  <Text style={s.sparkRotulo}>Recuperacao nos ultimos {resumo.serie.length} dias</Text>
                  <Sparkline
                    dados={resumo.serie.map((d) => ({ rotulo: d.date, valor: d.recovery }))}
                    cor={toneColors[faixa.tom].fg}
                    altura={52}
                  />
                </View>
              )}
              {!resumo.saudeHoje && (
                <Text style={s.saudeAviso}>
                  Ultimo registro de {saude.date}. Lance o relatorio de hoje na aba Saude.
                </Text>
              )}
            </>
          ) : (
            <View style={s.semDados}>
              <Ionicons name="pulse-outline" size={20} color={colors.textMuted} />
              <Text style={s.semDadosTexto}>
                Nenhum indicador ainda. Cole seu relatorio do Whoop na aba Saude para o Watson
                comecar a acompanhar.
              </Text>
            </View>
          )}
        </Card>

        <TituloSecao acao="Agenda" onAcao={() => router.push('/calendario')}>
          Hoje {resumo.hoje.length > 0 ? `· ${resumo.hoje.length} compromissos` : ''}
        </TituloSecao>
        <Card>
          {resumo.hoje.length === 0 ? (
            <View style={s.semDados}>
              <Ionicons name="cafe-outline" size={20} color={colors.textMuted} />
              <Text style={s.semDadosTexto}>Nenhum compromisso hoje. Aproveite o silencio.</Text>
            </View>
          ) : (
            <>
              {resumo.hoje.map((oc, i) => (
                <View key={`${oc.event.id}-${i}`}>
                  {i > 0 && <View style={s.separador} />}
                  <LinhaEvento oc={oc} />
                </View>
              ))}
              {resumo.horasEmReuniaoHoje > 0 && (
                <Text style={s.rodapeCartao}>
                  {resumo.horasEmReuniaoHoje.toFixed(1)} horas em reuniao hoje
                  {resumo.cargaComparada?.pesado != null &&
                  resumo.cargaComparada.leve != null &&
                  resumo.horasEmReuniaoHoje > resumo.cargaComparada.limiar
                    ? `. Em dias assim, sua recuperacao no dia seguinte fica em torno de ${Math.round(resumo.cargaComparada.pesado)}%, contra ${Math.round(resumo.cargaComparada.leve)}% nos dias leves.`
                    : '.'}
                </Text>
              )}
            </>
          )}
        </Card>

        {resumo.amanha.length > 0 && (
          <>
            <TituloSecao>Amanha</TituloSecao>
            <Card>
              {resumo.amanha.slice(0, 4).map((oc, i) => (
                <View key={`${oc.event.id}-a-${i}`}>
                  {i > 0 && <View style={s.separador} />}
                  <LinhaEvento oc={oc} />
                </View>
              ))}
            </Card>
          </>
        )}

        {resumo.aniversarios.length > 0 && (
          <>
            <TituloSecao acao="Gerenciar" onAcao={() => router.push('/calendario')}>
              Aniversarios
            </TituloSecao>
            <Card>
              {resumo.aniversarios.map((item, i) => (
                <View key={item.birthday.id}>
                  {i > 0 && <View style={s.separador} />}
                  <View style={s.aniversario}>
                    <View
                      style={[
                        s.aniversarioIcone,
                        item.daysUntil === 0 && { backgroundColor: colors.brassFaint },
                      ]}
                    >
                      <Ionicons
                        name="gift-outline"
                        size={15}
                        color={item.daysUntil === 0 ? colors.brass : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.aniversarioNome}>{item.birthday.person_name}</Text>
                      <Text style={s.aniversarioDetalhe}>
                        {descreverDistancia(item.nextDate)}
                        {item.turningAge ? ` · faz ${item.turningAge} anos` : ''}
                        {item.birthday.relationship ? ` · ${item.birthday.relationship}` : ''}
                      </Text>
                    </View>
                    {item.daysUntil === 0 && <Etiqueta tom="bom">hoje</Etiqueta>}
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </Screen>

      <JanelaConversa visivel={conversaAberta} onFechar={() => setConversaAberta(false)} />
    </>
  );
}

const s = StyleSheet.create({
  topo: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  data: { ...type.eyebrow, color: colors.brass, marginBottom: spacing.sm },
  saudacao: { ...type.display, color: colors.text },

  cartaoConversa: { gap: spacing.lg },
  conversaTopo: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  selo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brassFaint,
    borderWidth: 1,
    borderColor: colors.brassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversaTitulo: { ...type.heading, color: colors.text },
  conversaTexto: { ...type.caption, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  campoFalso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  campoFalsoTexto: { ...type.body, color: colors.textMuted },
  campoFalsoBotao: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alerta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, paddingLeft: spacing.md },
  alertaBarra: { width: 2, borderRadius: 1 },
  alertaTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertaTitulo: { ...type.bodyStrong, color: colors.text, flex: 1 },
  alertaTexto: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 19 },

  saudeLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  saudeNumeros: { flex: 1, gap: spacing.sm },
  metricaLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricaRotulo: { ...type.small, color: colors.textSecondary },
  metricaValor: { ...type.bodyStrong, color: colors.text },
  sparkBloco: { marginTop: spacing.lg },
  sparkRotulo: { ...type.caption, color: colors.textMuted, marginBottom: spacing.sm },
  saudeAviso: { ...type.caption, color: colors.amber, marginTop: spacing.md },

  semDados: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  semDadosTexto: { ...type.small, color: colors.textMuted, flex: 1, lineHeight: 19 },

  separador: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  rodapeCartao: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },

  aniversario: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  aniversarioIcone: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aniversarioNome: { ...type.bodyStrong, color: colors.text },
  aniversarioDetalhe: { ...type.caption, color: colors.textMuted, marginTop: 1 },
});

const e = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  horaColuna: { width: 44 },
  hora: { ...type.bodyStrong, color: colors.brass, fontSize: 14 },
  fim: { ...type.caption, fontSize: 10, color: colors.textMuted },
  trilho: { width: 2, alignSelf: 'stretch', backgroundColor: colors.border, borderRadius: 1 },
  titulo: { ...type.bodyStrong, color: colors.text },
  detalhe: { ...type.caption, color: colors.textMuted, marginTop: 1 },
});
