# 💊 Antigravity Pill

![status](https://img.shields.io/badge/status-funcionando-brightgreen) ![stack](https://img.shields.io/badge/stack-Electron%2033-0A192F?logo=electron&logoColor=white) ![license](https://img.shields.io/badge/license-MIT-d96526) ![plataforma](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows11&logoColor=white)

> Pílula de quota estilo "notch" fixada no topo da tela para **múltiplas contas Gemini (Antigravity)** rotacionadas pelo CLIProxyAPI — com **consumo real obtido direto da API oficial do Google**, sem interceptar tráfego.

**Proposta de valor:** você roda 5 contas Gemini em round-robin num proxy local e nunca sabe quanto da quota de cada uma já queimou — até bater no limite no meio de uma tarefa. A pílula resolve isso com 5 anéis sempre visíveis na tela, atualizados a cada 5 minutos, que ligam quando a conta está acabando.

Inspirado no [Codenotch](https://github.com/vinzdg/codenotch) (MIT) — mesmo conceito visual de anéis na borda, reescrito em Electron e adaptado para ler as sessões do [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI).

<!-- Adicione um print real da pílula na sua tela: docs/screenshot.png
![Antigravity Pill](docs/screenshot.png) -->

## ✨ O que ela mostra

- **5 anéis pendurados no topo da tela** (um por conta Google), com silhueta orgânica estilo notch
- **Percentual embaixo de cada anel** = faixa mais crítica da conta
- Régua semântica: 🟢 `<50%` · 🟠 `50–80%` · 🔴 `≥80%` · cinza `OFF` (conta desativada) · `ERR` (token)
- **Hover no anel** abre um card balão com as 4 faixas reais da conta:
  - **Gemini** — Sessão (5h) e Semana
  - **Claude/GPT** — Sessão (5h) e Semana
  - cada faixa com barra, percentual usado e horário de reset
- **Arrastável** pelo corpo da pílula, com posição persistida entre reinícios
- **Minimizar** (puxador na base) → some pra bandeja do sistema; clique no ícone traz de volta

## 🔌 De onde vêm os dados (o pulo do gato)

Nenhum tráfego é interceptado e nenhuma porta é ocupada — a pílula é 100% observadora:

```
~/.cli-proxy-api/antigravity-*.json      (sessões OAuth2 do CLIProxyAPI, só leitura)
        ↓  token expirado? renova sozinho via OAuth2 (client público do Antigravity CLI)
https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary
        ↓  quota REAL por modelo (remainingFraction + resetTime)
anéis + card balão na tela               (poll a cada 5 min + botão manual)
```

- Tokens renovados ficam **apenas em memória** — nada em disco, nada em logs
- Os arquivos de sessão **nunca são escritos** (o proxy cuida do próprio ciclo de refresh)
- O endpoint de quota é o mesmo que o app Antigravity oficial consulta — descoberto lendo o código do Codenotch

## 🚀 Guia rápido

```bash
# 1. dependências
npm install

# 2. credencial pública do cliente Antigravity (fora do git por boas práticas)
cp core/secret.example.mjs core/secret.local.mjs
#    → cole o client secret do cliente OAuth público (mesmo do CLI oficial,
#      visível em router-for-me/CLIProxyAPI: internal/auth/antigravity/constants.go)

# 3. rodar
npm start           # ou dois cliques em INICIAR_PILL.bat (Windows)
```

O PC precisa ter as sessões do CLIProxyAPI em `~/.cli-proxy-api/` (o proxy cria isso ao autenticar as contas).

## 🌳 Estrutura

```
antigravity-pill/
├── main.js                  ← janela transparente always-on-top + bandeja + drag/posição
├── preload.js               ← ponte IPC (contextIsolation on)
├── core/
│   ├── sessions.mjs         ← lê ~/.cli-proxy-api/antigravity-*.json (só leitura)
│   ├── oauth.mjs            ← refresh_token → access_token (cache em memória)
│   ├── secret.loader.mjs    ← carrega secret de secret.local.mjs ou env (versionado, sem segredo)
│   ├── secret.example.mjs   ← template do secret (versionado)
│   ├── secret.local.mjs     ← seu secret local (gitignored)
│   ├── quota.mjs            ← retrieveUserQuotaSummary → 4 faixas por conta
│   └── poller.mjs           ← orquestra o snapshot de todas as contas
├── renderer/
│   ├── index.html           ← pílula notch + card balão
│   ├── pill.css             ← preto puro, sockets orgânicos, acentos laranja
│   └── pill.js              ← anéis SVG + hover card + interação click-through
├── spike/                   ← scripts de validação da API de quota (histórico da investigação)
├── assets/tray.png          ← ícone da bandeja
└── INICIAR_PILL.bat         ← lançador Windows (não duplica instância)
```

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Shell | Electron 33 (janela frameless transparente, always-on-top, click-through seletivo) |
| Dados | Node.js nativo (fs, fetch) — zero dependências de runtime |
| UI | HTML/CSS/SVG puro — anéis com `stroke-dasharray`, fonte Plus Jakarta Sans + JetBrains Mono |
| API | Google Cloud Code `v1internal:loadCodeAssist` + `retrieveUserQuotaSummary` |

## 📝 Notas técnicas

- **Click-through seletivo:** a janela usa `setIgnoreMouseEvents(true, {forward:true})` e o renderer decide em tempo real quando o cursor está sobre a pílula — o resto da tela fica 100% clicável
- **Capturas de tela não "vêem" a pílula:** janelas em camadas (layered) não aparecem em BitBlt/PrintWindow — na tela real ela está lá
- **Modo debug opaco:** `PILL_DEBUG_OPAQUE=1 npm start` (janela sólida, pra gravar vídeo/print do conteúdo)

## 🗺️ Roadmap

- [ ] Bolha mini (1 anel = conta mais crítica)
- [ ] Alerta visual/sonoro ao cruzar 80%
- [ ] Contagem de requests do dia (via transcrições do Antigravity, como no Codenotch)
- [ ] Ícone por provedor dentro do anel

## 👤 Autor

**Thiago Nascimento Barbosa** — TM Sempre Tecnologia
GitHub: [@Thiago-dev-ia](https://github.com/Thiago-dev-ia)

## 📄 Licença

[MIT](LICENSE) — design inspirado no [Codenotch](https://github.com/vinzdg/codenotch) de @vinzdg.
