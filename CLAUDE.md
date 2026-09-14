# Watson

Aplicativo Expo/React Native. Assistente pessoal que reúne agenda, saúde do
Whoop, resumos de reunião do Plaud e aniversários em uma base local.

## Comandos

```bash
npx expo start      # desenvolvimento (Expo Go no iPhone)
npm test            # suíte completa
npm run typecheck   # tsc --noEmit
```

## Restrições que valem para qualquer mudança

**Nada de servidor.** O projeto é deliberadamente sem backend. Não introduza
chamadas de rede além da API da Anthropic, não adicione sincronização em nuvem e
não mova dados para fora do aparelho.

**Roda no Expo Go, no SDK 54.** Não adicione dependência que exija build nativo
próprio. Antes de instalar algo, confira se a versão consta em
`node_modules/expo/bundledNativeModules.json`.

A fixação no SDK 54 é deliberada. O Expo Go da App Store fica meses atrás dos
SDKs novos, e um projeto à frente dele não abre no iPhone de jeito nenhum. Não
atualize o SDK sem antes confirmar qual versão o Expo Go da App Store aceita: o
projeto precisa acompanhar o Expo Go, nunca o contrário. Isso deixa de valer no
dia em que o app migrar para build próprio.

**Nada sai sem aprovação.** Qualquer caminho novo que envie dados do usuário à
IA precisa passar pelos blocos de `src/ai/context.ts` e pela tela de revisão.

**A IA não grava direto.** Extração automática sempre desemboca em uma tela de
conferência antes de tocar o banco.

## Onde as coisas estão

| Assunto | Arquivo |
|---|---|
| Esquema e migrações | `src/db/schema.ts` |
| Recorrência de eventos | `src/db/repositories/events.ts` |
| Alertas e cruzamento agenda/saúde | `src/features/analysis.ts` |
| Chamadas à API da Anthropic | `src/ai/client.ts` |
| Montagem do contexto enviado | `src/ai/context.ts` |
| Personalidade do Watson | `src/ai/prompts.ts` |
| Backup cifrado | `src/features/backup.ts` |
| Paleta e tipografia | `src/theme/` |

## Banco

Migrações são acumulativas: acrescente uma entrada nova no fim de `MIGRATIONS` e
nunca edite uma já publicada, senão bases existentes divergem.

A tabela `notes_search` é FTS5 e não se atualiza sozinha. Toda escrita em
`meeting_notes` precisa passar por `reindex()` em `src/db/repositories/notes.ts`.

## Testes

A suíte roda em Node, com os módulos nativos do Expo substituídos pelos stubs de
`tests/stubs/`. O banco é o SQLite do próprio Node, então migrações, FTS5 e
consultas são exercitados de verdade. Ao mexer em recorrência, análise, backup ou
repositórios, acrescente o caso correspondente.

## Idioma

Interface, mensagens de erro e comentários em português do Brasil. O código, por
convenção do ecossistema, mistura nomes em português para domínio e inglês para
colunas do banco. Mantenha esse padrão.
