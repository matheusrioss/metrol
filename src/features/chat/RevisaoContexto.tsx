import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/Sheet';
import { Botao } from '@/components/ui';
import type { BlocoContexto, CategoriaContexto } from '@/ai/context';
import { colors, radius, spacing, type } from '@/theme';

const ICONES: Record<CategoriaContexto, keyof typeof Ionicons.glyphMap> = {
  agenda: 'calendar-outline',
  saude: 'pulse-outline',
  reunioes: 'document-text-outline',
  aniversarios: 'gift-outline',
  analise: 'git-compare-outline',
};

/**
 * Nada sai do aparelho sem passar por aqui.
 *
 * O usuario ve exatamente quais blocos da base acompanham a pergunta e
 * desliga o que nao quiser enviar. Uma pergunta sobre saude nao precisa
 * levar junto o dossie de uma negociacao.
 */
export function RevisaoContexto({
  visivel,
  pergunta,
  blocos,
  ocupado,
  onAlternar,
  onCancelar,
  onConfirmar,
}: {
  visivel: boolean;
  pergunta: string;
  blocos: BlocoContexto[];
  ocupado: boolean;
  onAlternar: (id: string) => void;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const ativos = blocos.filter((b) => b.incluido);
  const caracteres = ativos.reduce((acc, b) => acc + b.tamanho, 0);

  return (
    <Sheet
      visivel={visivel}
      titulo="O que vai ser enviado"
      subtitulo="Desligue qualquer bloco que nao deva sair do aparelho."
      onFechar={onCancelar}
      rodape={
        <>
          <Botao
            titulo={ativos.length ? `Enviar com ${ativos.length} bloco${ativos.length > 1 ? 's' : ''}` : 'Enviar so a pergunta'}
            onPress={onConfirmar}
            carregando={ocupado}
            icone="send"
          />
          <Botao titulo="Cancelar" onPress={onCancelar} variante="fantasma" />
        </>
      }
    >
      <View style={s.perguntaCaixa}>
        <Text style={s.perguntaRotulo}>Sua pergunta</Text>
        <Text style={s.perguntaTexto}>{pergunta}</Text>
      </View>

      {blocos.length === 0 ? (
        <Text style={s.vazio}>
          Sua base ainda nao tem registros para acompanhar esta pergunta. O Watson vai responder
          apenas com o que voce escrever agora.
        </Text>
      ) : (
        blocos.map((bloco) => (
          <Pressable
            key={bloco.id}
            onPress={() => onAlternar(bloco.id)}
            style={({ pressed }) => [s.item, bloco.incluido && s.itemAtivo, pressed && { opacity: 0.7 }]}
          >
            <View style={[s.caixa, bloco.incluido && s.caixaAtiva]}>
              {bloco.incluido && <Ionicons name="checkmark" size={13} color={colors.textInverse} />}
            </View>
            <Ionicons
              name={ICONES[bloco.categoria]}
              size={16}
              color={bloco.incluido ? colors.brass : colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.itemTitulo, !bloco.incluido && { color: colors.textMuted }]}>
                {bloco.titulo}
              </Text>
              <Text style={s.itemTamanho}>
                {bloco.tamanho > 1000
                  ? `${(bloco.tamanho / 1000).toFixed(1)} mil caracteres`
                  : `${bloco.tamanho} caracteres`}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Text style={s.total}>
        {caracteres > 0
          ? `Aproximadamente ${(caracteres / 1000).toFixed(1)} mil caracteres seguem junto da pergunta para a Anthropic.`
          : 'Somente a pergunta sera enviada.'}
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  perguntaCaixa: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.brassLine,
  },
  perguntaRotulo: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  perguntaTexto: { ...type.body, color: colors.text },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  itemAtivo: { borderColor: colors.brassLine, backgroundColor: colors.brassFaint },
  caixa: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaAtiva: { backgroundColor: colors.brass, borderColor: colors.brass },
  itemTitulo: { ...type.bodyStrong, color: colors.text },
  itemTamanho: { ...type.caption, color: colors.textMuted, marginTop: 1 },

  vazio: { ...type.small, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  total: { ...type.caption, color: colors.textMuted, marginTop: spacing.md, lineHeight: 16 },
});
