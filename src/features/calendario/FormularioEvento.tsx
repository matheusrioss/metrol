import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { Botao, Campo, Chip } from '@/components/ui';
import { SeletorLembretes } from '@/components/SeletorLembretes';
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type EventInput,
} from '@/db/repositories/events';
import {
  CATEGORY_OPTIONS,
  COMPANY_OPTIONS,
  RECURRENCE_OPTIONS,
  parseJsonArray,
  type CalendarEvent,
  type Company,
  type EventCategory,
  type Recurrence,
} from '@/lib/types';
import { combinarDataHora, formatarDataLonga, fromISODate, toISODate } from '@/lib/date';
import { colors, spacing, type } from '@/theme';

const HORA_VALIDA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function mascararHora(valor: string, anterior: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  if (valor.length < anterior.length && anterior.endsWith(':')) {
    return digitos.slice(0, 1);
  }
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

export function FormularioEvento({
  visivel,
  dataSelecionada,
  evento,
  onFechar,
  onSalvo,
}: {
  visivel: boolean;
  dataSelecionada: Date;
  evento: CalendarEvent | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!evento;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<EventCategory>('reuniao');
  const [empresa, setEmpresa] = useState<Company | null>(null);
  const [local, setLocal] = useState('');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [inicio, setInicio] = useState('09:00');
  const [fim, setFim] = useState('10:00');
  const [recorrencia, setRecorrencia] = useState<Recurrence>('unico');
  const [ate, setAte] = useState('');
  const [lembretes, setLembretes] = useState<number[]>([60]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    if (evento) {
      const dataInicio = new Date(evento.starts_at);
      const dataFim = evento.ends_at ? new Date(evento.ends_at) : null;
      setTitulo(evento.title);
      setDescricao(evento.description ?? '');
      setCategoria(evento.category);
      setEmpresa((evento.company as Company) ?? null);
      setLocal(evento.location ?? '');
      setDiaInteiro(evento.all_day === 1);
      setInicio(
        `${String(dataInicio.getHours()).padStart(2, '0')}:${String(dataInicio.getMinutes()).padStart(2, '0')}`,
      );
      setFim(
        dataFim
          ? `${String(dataFim.getHours()).padStart(2, '0')}:${String(dataFim.getMinutes()).padStart(2, '0')}`
          : '',
      );
      setRecorrencia(evento.recurrence);
      setAte(evento.recurrence_until ?? '');
      setLembretes(parseJsonArray<number>(evento.reminders));
    } else {
      setTitulo('');
      setDescricao('');
      setCategoria('reuniao');
      setEmpresa(null);
      setLocal('');
      setDiaInteiro(false);
      setInicio('09:00');
      setFim('10:00');
      setRecorrencia('unico');
      setAte('');
      setLembretes([60]);
    }
    setErro(null);
  }, [visivel, evento]);

  const salvar = async () => {
    setErro(null);
    if (titulo.trim().length < 2) return setErro('Escreva um titulo para o evento.');
    if (!diaInteiro && !HORA_VALIDA.test(inicio)) return setErro('Hora de inicio invalida. Use HH:MM.');
    if (!diaInteiro && fim && !HORA_VALIDA.test(fim)) return setErro('Hora de termino invalida.');

    const chaveData = toISODate(
      evento ? new Date(evento.starts_at) : dataSelecionada,
    );
    const inicioData = diaInteiro
      ? combinarDataHora(chaveData, '00:00')
      : combinarDataHora(chaveData, inicio);
    const fimData = diaInteiro || !fim ? null : combinarDataHora(chaveData, fim);

    if (fimData && fimData <= inicioData) {
      return setErro('O termino precisa ser depois do inicio.');
    }

    const dados: EventInput = {
      title: titulo,
      description: descricao,
      category: categoria,
      company: empresa,
      location: local,
      starts_at: inicioData.toISOString(),
      ends_at: fimData ? fimData.toISOString() : null,
      all_day: diaInteiro,
      recurrence: recorrencia,
      recurrence_until: recorrencia !== 'unico' && ate ? ate : null,
      reminders: lembretes,
    };

    setSalvando(true);
    try {
      if (evento) await updateEvent(evento.id, dados);
      else await createEvent(dados);
      onSalvo();
      onFechar();
    } catch {
      setErro('Nao foi possivel salvar o evento.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = () => {
    if (!evento) return;
    Alert.alert(
      'Excluir evento',
      `"${evento.title}" sera removido da agenda, junto de todas as repeticoes e lembretes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(evento.id);
            onSalvo();
            onFechar();
          },
        },
      ],
    );
  };

  const dataMostrada = evento ? new Date(evento.starts_at) : dataSelecionada;

  return (
    <Sheet
      visivel={visivel}
      titulo={editando ? 'Editar evento' : 'Novo evento'}
      subtitulo={formatarDataLonga(dataMostrada)}
      onFechar={onFechar}
      rodape={
        <>
          <Botao
            titulo={editando ? 'Salvar alteracoes' : 'Adicionar a agenda'}
            onPress={salvar}
            carregando={salvando}
          />
          {editando && <Botao titulo="Excluir evento" onPress={excluir} variante="perigo" />}
        </>
      }
    >
      <Campo
        rotulo="Titulo do evento"
        placeholder="Reuniao de diretoria"
        value={titulo}
        onChangeText={setTitulo}
      />

      <Campo
        rotulo="Descricao"
        placeholder="Pauta, participantes, o que precisa ser decidido"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <Text style={s.rotulo}>Tipo</Text>
      <View style={s.grade}>
        {CATEGORY_OPTIONS.map((opcao) => (
          <Chip
            key={opcao.value}
            rotulo={opcao.label}
            icone={opcao.icon as never}
            ativo={categoria === opcao.value}
            onPress={() => setCategoria(opcao.value)}
          />
        ))}
      </View>

      <Text style={s.rotulo}>Empresa do grupo</Text>
      <View style={s.grade}>
        <Chip rotulo="Nenhuma" ativo={empresa === null} onPress={() => setEmpresa(null)} />
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
        rotulo="Local"
        placeholder="Sala, endereco ou link"
        value={local}
        onChangeText={setLocal}
      />

      <Text style={s.rotulo}>Horario</Text>
      <View style={s.grade}>
        <Chip
          rotulo="Dia inteiro"
          icone="time-outline"
          ativo={diaInteiro}
          onPress={() => setDiaInteiro(!diaInteiro)}
        />
      </View>
      {!diaInteiro && (
        <View style={s.horas}>
          <View style={{ flex: 1 }}>
            <Campo
              rotulo="Comeca"
              placeholder="09:00"
              value={inicio}
              onChangeText={(v) => setInicio(mascararHora(v, inicio))}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Campo
              rotulo="Termina"
              placeholder="10:00"
              value={fim}
              onChangeText={(v) => setFim(mascararHora(v, fim))}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
      )}

      <Text style={s.rotulo}>Repeticao</Text>
      <View style={s.grade}>
        {RECURRENCE_OPTIONS.map((opcao) => (
          <Chip
            key={opcao.value}
            rotulo={opcao.label}
            ativo={recorrencia === opcao.value}
            onPress={() => setRecorrencia(opcao.value)}
          />
        ))}
      </View>

      {recorrencia !== 'unico' && (
        <Campo
          rotulo="Repetir ate (opcional)"
          placeholder="AAAA-MM-DD"
          value={ate}
          onChangeText={setAte}
          dica={
            ate && !Number.isNaN(fromISODate(ate).getTime())
              ? `Ultima repeticao em ${formatarDataLonga(fromISODate(ate))}.`
              : 'Deixe vazio para repetir sem data final.'
          }
        />
      )}

      <SeletorLembretes selecionados={lembretes} onAlterar={setLembretes} />

      {!!erro && <Text style={s.erro}>{erro}</Text>}
    </Sheet>
  );
}

const s = StyleSheet.create({
  rotulo: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  horas: { flexDirection: 'row', gap: spacing.md },
  erro: { ...type.small, color: colors.crimsonBright, marginBottom: spacing.md },
});
