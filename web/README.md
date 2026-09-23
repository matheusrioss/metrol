# Watson na web

Versão do Watson que roda no navegador, publicada como página na conta Claude do
usuário. Nasceu porque a versão em aplicativo exigia Node, Expo Go e um
computador ligado na mesma rede sempre que o Watson fosse aberto.

Arquivo único: `watson.html`. Sem build, sem dependências, sem servidor.

## O que muda em relação ao aplicativo

| | Aplicativo (raiz do repositório) | Web (esta pasta) |
|---|---|---|
| Onde os dados ficam | SQLite no aparelho | Banco do artefato, na conta Claude |
| Como abre | Expo Go, com o computador ligado | Link, em qualquer navegador |
| Acesso | Senha local e Face ID | Login da conta Claude |
| Chave da API | Colada pelo usuário | Conta do próprio visualizador |
| Lembretes | Notificações locais agendadas | Avisos na página e resumo diário por rotina |

## Capacidades declaradas

- `db` guarda eventos, aniversários, saúde, dossiês e a conversa
- `sample` lê os relatórios do Whoop, organiza os resumos de reunião e responde no chat
- `downloads` gera o arquivo de backup

A página abre e funciona mesmo quando nenhuma delas responde: nesse caso mostra o
exemplo e avisa que nada será guardado.

## Estrutura do banco

```
eventos/{id}        titulo, descricao, categoria, empresa, local, inicio, fim,
                    diaInteiro, recorrencia, ate, lembretes[]
aniversarios/{id}   nome, dia, mes, ano, relacao, notas, lembretes[]
saude/{AAAA-MM-DD}  data, recuperacao, vfc, fcRepouso, sono, desempenhoSono,
                    esforco, calorias, respiracao, oxigenacao, temperatura
dossies/{id}        titulo, empresa, data, participantes[], temas[], resumo,
                    decisoes, acoes, textoBruto
conversa/{id}       papel, texto, consultado, criadoEm
```

## Lógica compartilhada com o aplicativo

Recorrência de eventos, alertas de saúde e o cruzamento entre agenda e
recuperação foram portados de `src/`. A suíte em `tests/` cobre a versão em
TypeScript; a versão desta página foi verificada contra os mesmos casos, incluindo
evento mensal no dia 31, limite de repetição e a divisão por terços que impede a
correlação de colapsar quando muitos dias têm carga idêntica.

## Ao mexer nesta página

O arquivo é montado à mão, sem empacotador. Depois de editar, confira a sintaxe
de cada bloco de script antes de publicar:

```bash
python3 -c "
import re,pathlib,subprocess
src=pathlib.Path('web/watson.html').read_text()
for i,b in enumerate(re.findall(r'<script>(.*?)</script>',src,re.S)):
    open(f'/tmp/b{i}.js','w').write(b)
    r=subprocess.run(['node','--check',f'/tmp/b{i}.js'],capture_output=True,text=True)
    print(i, 'ok' if r.returncode==0 else r.stderr[:300])
"
```

Republicar mantém a mesma URL, desde que seja o mesmo caminho de arquivo ou a URL
seja passada explicitamente.
