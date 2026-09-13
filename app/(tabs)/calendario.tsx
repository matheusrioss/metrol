import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Cabecalho, Card, Chip, EstadoVazio, Etiqueta } from '@/components/ui';
import { FormularioEvento } from '@/features/calendario/FormularioEvento';
import { FormularioAniversario } from '@/features/calendario/FormularioAniversario';
import {
  getEvent,
  groupByDate,
  occurrencesInRange,
  type EventOccurrence,
} from '@/db/repositories/events';
import { upcomingBirthdays, type UpcomingBirthday } from '@/db/repositories/birthdays';
import { sincronizarLembretes } from '@/features/notifications';
import {
  DIAS_SEMANA_CURTO,
  addMonths,
  descreverDistancia,
  endOfMonth,
  formatarDataLonga,
  formatarHora,
  formatarMesAno,
  isSameDay,
  monthMatrix,
  startOfMonth,
  toISODate,
} from '@/lib/date';
import { companyLabel, type Birthday, type CalendarEvent } from '@/lib/types';
import { colors, radius, spacing, type } from '@/theme';

type Visao = 'mes' | 'aniversarios';

export default function TelaCalendario() {
  const [visao, setVisao] = useState<Visao>('mes');
  const [mesReferencia, setMesReferencia] = useState(startOfMonth(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  const [porData, setPorData] = useState<Map<string, EventOccurrence[]>>(new Map());
  const [aniversarios, setAniversarios] = useState<UpcomingBirthday[]>([]);

  const [formEventoAberto, setFormEventoAberto] = useState(false);
  const [eventoEmEdicao, setEventoEmEdicao] = useState<CalendarEvent | null>(null);
  const [formAnivAberto, setFormAnivAberto] = useState(false);
  const [anivEmEdicao, setAnivEmEdicao] = useState<Birthday | null>(null);

  const carregar = useCallback(async () => {
    const inicio = startOfMonth(mesReferencia);
    const fim = endOfMonth(mesReferencia);
    const [ocorrencias, anivs] = await Promise.all([
      occurrencesInRange(new Date(inicio.getTime() - 7 * 86400000), new Date(fim.getTime() + 7 * 86400000)),
      upcomingBirthdays(),
    ]);
    setPorData(groupByDate(ocorrencias));
    setAniversarios(anivs);
  }, [mesReferencia]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const aposSalvar = async () => {
    await carregar();
    void sincronizarLembretes();
  };

  const abrirNovoEvento = () => {
    setEventoEmEdicao(null);
    setFormEventoAberto(true);
  };

  const abrirEdicao = async (oc: EventOccurrence) => {
    const completo = await getEvent(oc.event.id);
    setEventoEmEdicao(completo);
    setFormEventoAberto(true);
  };

  const semanas = monthMatrix(mesReferencia);
  const doDia = porData.get(toISODate(diaSelecionado)) ?? [];
  const anivDoDia = aniversarios.filter(
    (a) =>
      a.birthday.birth_day === diaSelecionado.getDate() &&
      a.birthday.birth_month === diaSelecionado.getMonth() + 1,
  );

  return (
    <>
      <Screen>
        <Cabecalho
          sobretitulo="Sua agenda"
          titulo={visao === 'mes' ? 'Calendario' : 'Aniversarios'}
          acessorio={
            <Pressable
              onPress={visao === 'mes' ? abrirNovoEvento : () => {
                setAnivEmEdicao(null);
                setFormAnivAberto(true);
              }}
              style={({ pressed }) => [c.botaoAdicionar, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={22} color={colors.textInverse} />
            </Pressable>
          }
        />

        <View style={c.abas}>
          <Chip rotulo="Mes" ativo={visao === 'mes'} onPress={() => setVisao('mes')} icone="grid-outline" />
          <Chip
            rotulo={`Aniversarios${aniversarios.length ? ` (${aniversarios.length})` : ''}`}
            ativo={visao === 'aniversarios'}
            onPress={() => setVisao('aniversarios')}
            icone="gift-outline"
          />
        </View>

        {visao === 'mes' ? (
          <>
            <Card style={c.cartaoGrade}>
              <View style={c.navegacao}>
                <Pressable
                  onPress={() => setMesReferencia(addMonths(mesReferencia, -1))}
                  hitSlop={12}
                  style={c.navBotao}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    const agora = new Date();
                    setMesReferencia(startOfMonth(agora));
                    setDiaSelecionado(agora);
                  }}
                >
                  <Text style={c.mesTitulo}>{formatarMesAno(mesReferencia)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMesReferencia(addMonths(mesReferencia, 1))}
                  hitSlop={12}
                  style={c.navBotao}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={c.semanaCabecalho}>
                {DIAS_SEMANA_CURTO.map((dia) => (
                  <Text key={dia} style={c.semanaDia}>
                    {dia}
                  </Text>
                ))}
              </View>

              {semanas.map((semana, i) => (
                <View key={`semana-${i}`} style={c.semana}>
                  {semana.map((dia) => {
                    const chave = toISODate(dia);
                    const eventos = porData.get(chave) ?? [];
                    const temAniversario = aniversarios.some(
                      (a) =>
                        a.birthday.birth_day === dia.getDate() &&
                        a.birthday.birth_month === dia.getMonth() + 1,
                    );
                    const doMes = dia.getMonth() === mesReferencia.getMonth();
                    const selecionado = isSameDay(dia, diaSelecionado);
                    const ehHoje = isSameDay(dia, new Date());

                    return (
                      <Pressable
                        key={chave}
                        onPress={() => setDiaSelecionado(dia)}
                        style={c.celula}
                      >
                        <View
                          style={[
                            c.celulaInterna,
                            ehHoje && c.celulaHoje,
                            selecionado && c.celulaSelecionada,
                          ]}
                        >
                          <Text
                            style={[
                              c.celulaTexto,
                              !doMes && c.celulaForaDoMes,
                              ehHoje && c.celulaTextoHoje,
                              selecionado && c.celulaTextoSelecionado,
                            ]}
                          >
                            {dia.getDate()}
                          </Text>
                        </View>
                        <View style={c.marcadores}>
                          {eventos.slice(0, 3).map((_, k) => (
                            <View
                              key={k}
                              style={[c.ponto, selecionado && { backgroundColor: colors.brassBright }]}
                            />
                          ))}
                          {temAniversario && <View style={[c.ponto, c.pontoAniversario]} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Card>

            <View style={c.diaCabecalho}>
              <Text style={c.diaTitulo}>{formatarDataLonga(diaSelecionado)}</Text>
              <Pressable onPress={abrirNovoEvento} hitSlop={8}>
                <Text style={c.diaAcao}>Adicionar</Text>
              </Pressable>
            </View>

            {doDia.length === 0 && anivDoDia.length === 0 ? (
              <Card>
                <View style={c.vazioDia}>
                  <Ionicons name="calendar-clear-outline" size={19} color={colors.textMuted} />
                  <Text style={c.vazioDiaTexto}>
                    Nada marcado para este dia. Toque em adicionar para criar um evento.
                  </Text>
                </View>
              </Card>
            ) : (
              <>
                {anivDoDia.map((a) => (
                  <Card key={a.birthday.id} style={c.itemDia}>
                    <View style={c.itemIcone}>
                      <Ionicons name="gift-outline" size={16} color={colors.brass} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={c.itemTitulo}>Aniversario de {a.birthday.person_name}</Text>
                      <Text style={c.itemDetalhe}>
                        {a.turningAge ? `Completa ${a.turningAge} anos` : 'Sem ano informado'}
                        {a.birthday.relationship ? ` · ${a.birthday.relationship}` : ''}
                      </Text>
                    </View>
                  </Card>
                ))}

                {doDia.map((oc, i) => (
                  <Card
                    key={`${oc.event.id}-${i}`}
                    style={c.itemDia}
                    onPress={() => void abrirEdicao(oc)}
                  >
                    <View style={c.itemHora}>
                      <Text style={c.itemHoraTexto}>
                        {oc.event.all_day ? 'dia' : formatarHora(oc.start)}
                      </Text>
                      {!!oc.end && !oc.event.all_day && (
                        <Text style={c.itemHoraFim}>{formatarHora(oc.end)}</Text>
                      )}
                    </View>
                    <View style={c.itemTrilho} />
                    <View style={{ flex: 1 }}>
                      <Text style={c.itemTitulo}>{oc.event.title}</Text>
                      {!!oc.event.description && (
                        <Text style={c.itemDetalhe} numberOfLines={2}>
                          {oc.event.description}
                        </Text>
                      )}
                      <View style={c.itemEtiquetas}>
                        {!!oc.event.company && (
                          <Etiqueta tom="neutro">{companyLabel(oc.event.company)}</Etiqueta>
                        )}
                        {!!oc.event.location && <Etiqueta tom="neutro">{oc.event.location}</Etiqueta>}
                        {oc.isRepeat && <Etiqueta tom="neutro">repete</Etiqueta>}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                  </Card>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {aniversarios.length === 0 ? (
              <EstadoVazio
                icone="gift-outline"
                titulo="Nenhum aniversario cadastrado"
                texto="Cadastre a data, o nome e escolha com quanta antecedencia o Watson deve avisar."
                acao="Adicionar o primeiro"
                onAcao={() => {
                  setAnivEmEdicao(null);
                  setFormAnivAberto(true);
                }}
              />
            ) : (
              aniversarios.map((item) => (
                <Card
                  key={item.birthday.id}
                  style={c.itemDia}
                  onPress={() => {
                    setAnivEmEdicao(item.birthday);
                    setFormAnivAberto(true);
                  }}
                >
                  <View
                    style={[
                      c.itemIcone,
                      item.daysUntil <= 7 && { backgroundColor: colors.brassFaint },
                    ]}
                  >
                    <Text style={c.itemDiaNumero}>{item.birthday.birth_day}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={c.itemTitulo}>{item.birthday.person_name}</Text>
                    <Text style={c.itemDetalhe}>
                      {formatarDataLonga(item.nextDate)} · {descreverDistancia(item.nextDate)}
                      {item.turningAge ? ` · faz ${item.turningAge}` : ''}
                    </Text>
                    {!!item.birthday.relationship && (
                      <View style={c.itemEtiquetas}>
                        <Etiqueta tom="neutro">{item.birthday.relationship}</Etiqueta>
                      </View>
                    )}
                  </View>
                  {item.daysUntil === 0 && <Etiqueta tom="bom">hoje</Etiqueta>}
                </Card>
              ))
            )}
          </>
        )}
      </Screen>

      <FormularioEvento
        visivel={formEventoAberto}
        dataSelecionada={diaSelecionado}
        evento={eventoEmEdicao}
        onFechar={() => setFormEventoAberto(false)}
        onSalvo={aposSalvar}
      />

      <FormularioAniversario
        visivel={formAnivAberto}
        aniversario={anivEmEdicao}
        onFechar={() => setFormAnivAberto(false)}
        onSalvo={aposSalvar}
      />
    </>
  );
}

const c = StyleSheet.create({
  botaoAdicionar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abas: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },

  cartaoGrade: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  navegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  navBotao: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesTitulo: { ...type.heading, color: colors.text },

  semanaCabecalho: { flexDirection: 'row', marginBottom: spacing.sm },
  semanaDia: {
    flex: 1,
    textAlign: 'center',
    ...type.caption,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  semana: { flexDirection: 'row' },
  celula: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  celulaInterna: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celulaHoje: { borderWidth: 1, borderColor: colors.brassLine },
  celulaSelecionada: { backgroundColor: colors.brass },
  celulaTexto: { ...type.small, color: colors.text },
  celulaForaDoMes: { color: colors.textMuted, opacity: 0.45 },
  celulaTextoHoje: { color: colors.brassBright },
  celulaTextoSelecionado: { color: colors.textInverse, fontWeight: '700' },
  marcadores: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
  ponto: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.brassDeep },
  pontoAniversario: { backgroundColor: colors.forest },

  diaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  diaTitulo: { ...type.heading, color: colors.text },
  diaAcao: { ...type.caption, color: colors.brass },

  vazioDia: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vazioDiaTexto: { ...type.small, color: colors.textMuted, flex: 1, lineHeight: 19 },

  itemDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  itemHora: { width: 42 },
  itemHoraTexto: { ...type.bodyStrong, fontSize: 14, color: colors.brass },
  itemHoraFim: { ...type.caption, fontSize: 10, color: colors.textMuted },
  itemTrilho: { width: 2, alignSelf: 'stretch', backgroundColor: colors.border, borderRadius: 1 },
  itemIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDiaNumero: { ...type.bodyStrong, color: colors.brass },
  itemTitulo: { ...type.bodyStrong, color: colors.text },
  itemDetalhe: { ...type.caption, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  itemEtiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
});
