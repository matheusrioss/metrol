import { useCallback, useEffect, useState } from 'react';
import { appendMessage, clearChat, recentMessages } from '@/db/repositories/chat';
import { montarContexto, renderizarContexto, type BlocoContexto } from '@/ai/context';
import { MissingApiKeyError, perguntarAoWatson, DEFAULT_MODEL } from '@/ai/client';
import { WATSON_SYSTEM } from '@/ai/prompts';
import { getBooleanSetting, getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import type { ChatMessage } from '@/lib/types';

export interface EstadoChat {
  mensagens: ChatMessage[];
  carregando: boolean;
  pensando: boolean;
  erro: string | null;
  revisando: boolean;
  perguntaPendente: string;
  blocos: BlocoContexto[];
  preparar: (pergunta: string) => Promise<void>;
  alternarBloco: (id: string) => void;
  confirmar: () => Promise<void>;
  cancelar: () => void;
  limpar: () => Promise<void>;
}

/**
 * Conversa com o Watson.
 *
 * O envio tem duas etapas quando a revisao de contexto esta ligada: primeiro
 * montamos os blocos candidatos, depois o usuario aprova o que sai daqui.
 */
export function useChatWatson(): EstadoChat {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [perguntaPendente, setPerguntaPendente] = useState('');
  const [blocos, setBlocos] = useState<BlocoContexto[]>([]);

  useEffect(() => {
    recentMessages(60)
      .then(setMensagens)
      .finally(() => setCarregando(false));
  }, []);

  const enviar = useCallback(
    async (pergunta: string, blocosEscolhidos: BlocoContexto[]) => {
      setPensando(true);
      setErro(null);

      const contexto = renderizarContexto(blocosEscolhidos);
      const resumoContexto = blocosEscolhidos
        .filter((b) => b.incluido)
        .map((b) => b.titulo)
        .join(' | ');

      const doUsuario = await appendMessage('user', pergunta, resumoContexto || null);
      setMensagens((atual) => [...atual, doUsuario]);

      try {
        const modelo = (await getSetting(SETTINGS_KEYS.modeloIA)) || DEFAULT_MODEL;
        const historico = mensagens.slice(-8).map((m) => ({
          role: m.role === 'watson' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

        const resposta = await perguntarAoWatson({
          system: WATSON_SYSTEM,
          historico,
          pergunta,
          contexto,
          modelo,
          esforco: 'medium',
        });

        const doWatson = await appendMessage(
          'watson',
          resposta.texto || 'Nao consegui formular uma resposta.',
        );
        setMensagens((atual) => [...atual, doWatson]);
      } catch (e) {
        if (e instanceof MissingApiKeyError) {
          setErro(
            'Falta configurar a chave da API nas Ajustes. Sem ela o Watson nao consegue pensar.',
          );
        } else {
          const detalhe = e instanceof Error ? e.message : 'erro desconhecido';
          setErro(`Nao foi possivel falar com o Watson agora. ${detalhe}`);
        }
      } finally {
        setPensando(false);
      }
    },
    [mensagens],
  );

  const preparar = useCallback<EstadoChat['preparar']>(
    async (pergunta) => {
      const texto = pergunta.trim();
      if (!texto || pensando) return;

      setErro(null);
      const revisar = await getBooleanSetting(SETTINGS_KEYS.revisarContexto, true);
      const candidatos = await montarContexto(texto);

      if (!revisar) {
        await enviar(texto, candidatos);
        return;
      }

      setPerguntaPendente(texto);
      setBlocos(candidatos);
      setRevisando(true);
    },
    [pensando, enviar],
  );

  const alternarBloco = useCallback((id: string) => {
    setBlocos((atual) =>
      atual.map((b) => (b.id === id ? { ...b, incluido: !b.incluido } : b)),
    );
  }, []);

  const confirmar = useCallback(async () => {
    setRevisando(false);
    const pergunta = perguntaPendente;
    const escolhidos = blocos;
    setPerguntaPendente('');
    setBlocos([]);
    await enviar(pergunta, escolhidos);
  }, [perguntaPendente, blocos, enviar]);

  const cancelar = useCallback(() => {
    setRevisando(false);
    setPerguntaPendente('');
    setBlocos([]);
  }, []);

  const limpar = useCallback(async () => {
    await clearChat();
    setMensagens([]);
    setErro(null);
  }, []);

  return {
    mensagens,
    carregando,
    pensando,
    erro,
    revisando,
    perguntaPendente,
    blocos,
    preparar,
    alternarBloco,
    confirmar,
    cancelar,
    limpar,
  };
}
