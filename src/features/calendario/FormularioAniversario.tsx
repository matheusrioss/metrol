import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { Botao, Campo } from '@/components/ui';
import { SeletorLembretes } from '@/components/SeletorLembretes';
import {
  createBirthday,
  deleteBirthday,
  updateBirthday,
} from '@/db/repositories/birthdays';
import { parseJsonArray, type Birthday } from '@/lib/types';
import { formatarDataLonga, proximoAniversario } from '@/lib/date';
import { colors, spacing, type } from '@/theme';

const DATA_VALIDA = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/;

function mascararDiaMes(valor: string, anterior: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  if (valor.length < anterior.length && anterior.endsWith('/')) return digitos.slice(0, 1);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

export function FormularioAniversario({
  visivel,
  aniversario,
  onFechar,
  onSalvo,
}: {
  visivel: boolean;
  aniversario: Birthday | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!aniversario;

  const [nome, setNome] = useState('');
  const [dataTexto, setDataTexto] = useState('');
  const [ano, setAno] = useState('');
  const [relacao, setRelacao] = useState('');
  const [notas, setNotas] = useState('');
  const [lembretes, setLembretes] = useState<number[]>([10080, 1440]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    if (aniversario) {
      setNome(aniversario.person_name);
      setDataTexto(
        `${String(aniversario.birth_day).padStart(2, '0')}/${String(aniversario.birth_month).padStart(2, '0')}`,
      );
      setAno(aniversario.birth_year ? String(aniversario.birth_year) : '');
      setRelacao(aniversario.relationship ?? '');
      setNotas(aniversario.notes ?? '');
      setLembretes(parseJsonArray<number>(aniversario.reminders));
    } else {
      setNome('');
      setDataTexto('');
      setAno('');
      setRelacao('');
      setNotas('');
      setLembretes([10080, 1440]);
    }
    setErro(null);
  }, [visivel, aniversario]);

  const salvar = async () => {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Escreva o nome da pessoa.');
    if (!DATA_VALIDA.test(dataTexto)) return setErro('Informe o dia e o mes no formato DD/MM.');

    const [dia, mes] = dataTexto.split('/').map(Number);
    const anoNascimento = ano.trim() ? Number(ano) : null;
    if (anoNascimento !== null && (anoNascimento < 1900 || anoNascimento > new Date().getFullYear())) {
      return setErro('Ano de nascimento invalido.');
    }

    const dados = {
      person_name: nome,
      birth_month: mes,
      birth_day: dia,
      birth_year: anoNascimento,
      relationship: relacao,
      notes: notas,
      reminders: lembretes,
    };

    setSalvando(true);
    try {
      if (aniversario) await updateBirthday(aniversario.id, dados);
      else await createBirthday(dados);
      onSalvo();
      onFechar();
    } catch {
      setErro('Nao foi possivel salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = () => {
    if (!aniversario) return;
    Alert.alert('Excluir aniversario', `Remover ${aniversario.person_name} da lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteBirthday(aniversario.id);
          onSalvo();
          onFechar();
        },
      },
    ]);
  };

  const previa = DATA_VALIDA.test(dataTexto)
    ? (() => {
        const [dia, mes] = dataTexto.split('/').map(Number);
        return `Proximo em ${formatarDataLonga(proximoAniversario(mes, dia))}.`;
      })()
    : 'Dia e mes, por exemplo 07/09.';

  return (
    <Sheet
      visivel={visivel}
      titulo={editando ? 'Editar aniversario' : 'Novo aniversario'}
      subtitulo="O Watson avisa com a antecedencia que voce escolher."
      onFechar={onFechar}
      rodape={
        <>
          <Botao
            titulo={editando ? 'Salvar alteracoes' : 'Adicionar aniversario'}
            onPress={salvar}
            carregando={salvando}
          />
          {editando && <Botao titulo="Excluir" onPress={excluir} variante="perigo" />}
        </>
      }
    >
      <Campo
        rotulo="Nome da pessoa"
        placeholder="Nome completo"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
      />

      <View style={s.linha}>
        <View style={{ flex: 1.2 }}>
          <Campo
            rotulo="Dia e mes"
            placeholder="DD/MM"
            value={dataTexto}
            onChangeText={(v) => setDataTexto(mascararDiaMes(v, dataTexto))}
            keyboardType="number-pad"
            maxLength={5}
            dica={previa}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Campo
            rotulo="Ano (opcional)"
            placeholder="1975"
            value={ano}
            onChangeText={(v) => setAno(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            dica="Para calcular a idade."
          />
        </View>
      </View>

      <Campo
        rotulo="Relacao"
        placeholder="Socio, cliente, familia, equipe"
        value={relacao}
        onChangeText={setRelacao}
      />

      <Campo
        rotulo="Observacoes"
        placeholder="O que lembrar na hora de cumprimentar"
        value={notas}
        onChangeText={setNotas}
        multiline
      />

      <SeletorLembretes selecionados={lembretes} onAlterar={setLembretes} />

      {!!erro && <Text style={s.erro}>{erro}</Text>}
    </Sheet>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', gap: spacing.md },
  erro: { ...type.small, color: colors.crimsonBright, marginBottom: spacing.md },
});
