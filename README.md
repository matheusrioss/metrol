# Watson

Assistente pessoal e corporativo em aplicativo nativo. Reúne agenda, indicadores
de saúde do Whoop, resumos de reunião do Plaud e aniversários em uma base única,
e responde perguntas sobre ela.

Tudo vive no aparelho. Não existe servidor, não existe conta na nuvem e não há
sincronização. A única saída de dados é a pergunta que você faz ao Watson, com os
trechos que você aprova na tela de revisão.

## Como rodar

```bash
npm install
npx expo start
```

Leia o QR code com o aplicativo Expo Go no iPhone. A base SQLite é criada no
primeiro acesso, junto com o seu cadastro.

Para o chat funcionar, gere uma chave em `console.anthropic.com` e cole em
Ajustes. A chave fica no Keychain do iOS, nunca no banco.

```bash
npm test        # suíte completa
npm run typecheck
```

## As cinco telas

| Tela | O que faz |
|---|---|
| Acesso | Cadastro no primeiro uso, depois Face ID ou senha. Sessão fica salva. |
| Watson (home) | Resumo do dia, alertas de saúde, agenda, aniversários e o chat. |
| Agenda | Calendário mensal, eventos com recorrência e lembretes, aniversários. |
| Saúde | Indicadores do Whoop por dia, semana e mês, e o cruzamento com a agenda. |
| Dossiês | Base de conhecimento corporativo, classificada pelas empresas do grupo. |

A barra inferior é fixa, com o Watson ao centro em destaque.

## Decisões de arquitetura

**Banco local, sem servidor.** Toda a base é um arquivo SQLite no sandbox do
aplicativo. Isso elimina a superfície de ataque de um servidor e o risco de
vazamento por terceiros, ao custo de não sincronizar entre aparelhos. O backup
manual em Ajustes é a rede de segurança: gera um arquivo cifrado em AES cuja
senha só você conhece.

**Revisão antes de enviar.** Toda pergunta ao Watson monta blocos de contexto a
partir da base e mostra quais são antes do envio. Uma pergunta sobre saúde não
precisa levar junto o dossiê de uma negociação. O comportamento é desligável em
Ajustes, mas vem ligado.

**Entrada assistida, conferência humana.** Relatórios do Whoop e resumos do Plaud
entram como texto colado. A IA separa os campos e o usuário confere antes de
gravar. A IA lê rápido, mas quem assina os dados é o usuário.

**Busca textual local.** A base corporativa usa FTS5 com remoção de acentos, de
modo que "licitacao" encontra "licitação". A busca roda no aparelho, e só os
trechos relevantes seguem para a IA.

**Notificações locais.** Sem servidor não há push remoto. Os lembretes são
notificações agendadas pelo próprio aparelho, recalculadas do zero a cada
alteração na agenda.

## Cruzamento entre agenda e saúde

Duas análises rodam sobre os dados, ambas apresentadas como indício e nunca como
prova de causa:

**Custo por reunião recorrente.** Para cada reunião que se repete, compara a
recuperação do dia seguinte com a média geral do período. Uma reunião que aparece
sistematicamente abaixo da média é candidata a ser revista.

**Dias cheios contra dias leves.** Ordena os dias por horas em reunião e compara
o terço mais pesado com o terço mais leve. A divisão por terços evita o problema
de uma agenda com muitos dias de carga idêntica, em que um corte pela mediana
deixaria um dos grupos vazio.

Os alertas de saúde seguem as faixas do próprio Whoop: recuperação abaixo de 34%
é zona vermelha, entre 34% e 66% é amarela. O Watson lê números e sinaliza
padrões. Ele não diagnostica, e sinal persistente é assunto para um médico.

## Estrutura

```
app/                    rotas (expo-router)
  (auth)/acesso.tsx     cadastro e login
  (tabs)/               as quatro telas e ajustes
src/
  ai/                   cliente da API, prompts, montagem de contexto
  components/           kit de interface e gráficos
  db/                   esquema, migrações e repositórios
  features/             análise, notificações, backup, telas compostas
  lib/                  datas, tipos, senha, cofre de chaves
  theme/                paleta e tipografia
tests/                  suíte executada em Node com SQLite real
```

## Sobre o design

Preto de fuligem, cinza de neblina e latão de lamparina a gás. Títulos em serifa,
dados em sans. As cores de estado foram validadas contra o fundo escuro para
contraste e separação sob daltonismo, e nunca aparecem sozinhas: todo estado
carrega ícone e texto junto da cor.
