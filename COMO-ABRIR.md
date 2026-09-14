# Como abrir o Watson no seu iPhone

Guia para Windows, do zero. São cinco etapas e a primeira só se faz uma vez.

Antes de começar, uma coisa que muda como você vai usar isto. No Expo Go, o
Watson não fica instalado de verdade no iPhone: ele é carregado do seu
computador toda vez que abre. Ou seja, o computador precisa estar ligado, com o
servidor rodando, na mesma rede Wi-Fi que o iPhone, sempre que você quiser usar.
Isso serve para você avaliar as telas e decidir. Para usar no dia a dia, o
caminho é compilar o aplicativo de verdade, e aí ele passa a funcionar sozinho.

---

## Etapa 1 — Instalar o Node.js (uma vez só)

O Node.js é o motor que roda o servidor do aplicativo.

1. Abra `https://nodejs.org` no navegador.
2. Baixe a versão **LTS** para Windows.
3. Execute o instalador e vá clicando em avançar até o fim.

Para conferir se deu certo, abra o menu Iniciar, digite `PowerShell`, abra, e
digite:

```powershell
node -v
```

Deve aparecer algo como `v22.x.x`. Se aparecer erro, reinicie o computador e
tente de novo.

---

## Etapa 2 — Baixar o código do Watson

1. Abra `https://github.com/matheusrioss/metrol` no navegador.
2. No seletor de branch, escolha `claude/watson-personal-assistant-app-ok1tx0`.
3. Clique no botão verde **Code** e depois em **Download ZIP**.
4. Descompacte o arquivo em `Documentos`. Você vai ficar com uma pasta chamada
   algo como `metrol-claude-watson-personal-assistant-app-ok1tx0`.

---

## Etapa 3 — Preparar o projeto (uma vez só)

1. Abra a pasta que você descompactou no Explorador de Arquivos.
2. Segure **Shift** e clique com o botão direito em uma área vazia da pasta.
3. Escolha **Abrir janela do PowerShell aqui** (ou **Abrir no Terminal**).
4. Digite o comando abaixo e pressione Enter:

```powershell
npm install
```

Isso baixa as bibliotecas do projeto. Demora de dois a cinco minutos na primeira
vez e mostra bastante texto. Espere terminar.

---

## Etapa 4 — Ligar o servidor

Na mesma janela do PowerShell:

```powershell
npx expo start
```

Vai aparecer um **QR code** grande na tela. Deixe essa janela aberta: fechá-la
desliga o Watson.

---

## Etapa 5 — Abrir no iPhone

1. Na App Store, instale o aplicativo gratuito **Expo Go**.
2. Confirme que o iPhone está na **mesma rede Wi-Fi** do computador.
3. Abra a **Câmera** do iPhone e aponte para o QR code da tela do computador.
4. Toque na notificação que aparece no topo.

O Watson abre. Na primeira vez você cria seu acesso com nome e senha, e a partir
daí pode ligar o Face ID nas Ajustes.

---

## Se alguma coisa der errado

**O QR code não conecta, fica carregando para sempre.**
Rede corporativa costuma bloquear a conexão entre aparelhos. Na janela do
PowerShell, pressione `Ctrl + C` para parar e rode:

```powershell
npx expo start --tunnel
```

Isso passa a conexão por fora da rede local. Fica mais lento, mas funciona em
praticamente qualquer Wi-Fi.

**Aparece "Project is incompatible with this version of Expo Go".**
Significa que a versão do Expo Go da App Store não bate com a do projeto. A
mensagem cita um número de SDK. Anote esse número e me avise: é um ajuste de
poucos minutos no projeto.

**O Expo Go pede para fazer login.**
Crie uma conta gratuita em `https://expo.dev` e entre com ela nos dois lados, no
aplicativo e no computador. Para entrar pelo computador, rode `npx expo login`.

**Nada acontece ao apontar a câmera.**
Abra o Expo Go, toque em **Enter URL manually** e digite o endereço que aparece
logo acima do QR code no PowerShell, algo como `exp://192.168.0.15:8081`.

---

## Para usar todo dia, sem depender do computador

O Watson precisa virar um aplicativo compilado, com ícone próprio na sua tela
inicial. No iPhone isso exige uma conta Apple Developer, que custa US$ 99 por
ano, e a instalação acontece pelo TestFlight. A compilação roda nos servidores da
Expo, então você não precisa instalar mais nada no computador.

Quando quiser seguir por esse caminho, me avise que eu preparo a configuração.
