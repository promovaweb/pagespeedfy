# Changelog

Todas as mudanças relevantes do Pagespeedfy são registradas neste arquivo. O
projeto segue versionamento semântico e commits convencionais.

## [1.0.0](https://github.com/promovaweb/pagespeedfy/compare/v0.3.5...v1.0.0) (2026-11-16)

O Pagespeedfy passa a ser um binário [Termfy](https://github.com/promovaweb/termfy):
TUI, CLI e servidor MCP stdio no mesmo executável, com o histórico de
melhorias de cada página guardado no projeto.

### Adicionado

- Histórico em SQLite no projeto do usuário, em `.pagespeedfy/history.db`, com os JSON brutos em `.pagespeedfy/reports/` e um `.gitignore` gerado que deixa só o banco versionável.
- Commands `history` (páginas ou linha do tempo), `report <id|url>`, `compare` por URL, id ou par, `import` (relatórios da 0.3.x) e `forget`.
- `run --samples N`: N leituras por estratégia, com a mediana gravada no histórico.
- `run --note`: registra o que mudou antes da medição e aparece na linha do tempo.
- `run --fail-under` e `compare --fail-on-regression`, com o exit code 10 `BUDGET` para uso no CI.
- TUI com a aba History: páginas, linha do tempo com sparkline, filtro por estratégia, detalhe e comparação com a medição anterior.
- Servidor MCP com as tools `pagespeed_run`, `pagespeed_history`, `pagespeed_report` e `pagespeed_compare` e o prompt `optimize_page`.
- Binários para linux-x64, linux-arm64, darwin-x64, darwin-arm64 e windows-x64 na GitHub Release.

### Alterado

- A API key fica no cofre cifrado do Termfy (`pagespeedfy credentials set pagespeed.api_key`). A chave da 0.3.x em `~/.pagespeedfy/credentials` é movida para o cofre no primeiro uso.
- A chave vai no cabeçalho `X-Goog-Api-Key`, fora da URL.
- Mobile e desktop são medidos em paralelo.
- O pacote npm `@promovaweb/pagespeedfy` virou um invólucro que baixa e confere o binário da release. Ele não leva mais os PDFs e EPUBs de versões antigas (de 3,1 MB para poucos KB).
- Código, mensagens e campos do `--json` em inglês, como pede o Termfy.

### Corrigido

- URLs de `0.0.0.0`, link-local, CGNAT (Tailscale), IPv6 privado e nomes `.internal`, `.lan` e `.home.arpa` são recusadas antes da consulta.
- Um relatório ilegível não derruba mais o CLI com stack trace.

### Removido

- Commands `auth login`, `auth status` e `auth logout`, substituídos por `credentials`.
- Options `--output` e `--print` e os arquivos `report.json` e `report.md`.

## [0.3.5] - 2026-11-14

### Corrigido

- Revisada a redação do guia do usuário em `docs/user/`, com explicações mais precisas e correções de linguagem.
- Atualizados os formatos portáteis da documentação a partir das fontes revisadas.

## [0.3.4](https://github.com/promovaweb/pagespeedfy/compare/v0.3.3...v0.3.4) (2026-11-13)

### Correções

- Atualiza o README do ebook com os requisitos do gerador Node.js e a versão sincronizada com o pacote.
- Regenera PDF e EPUB na edição 0.3.4, mantendo a identidade visual aplicada na 0.3.3.

## [0.3.3](https://github.com/promovaweb/pagespeedfy/compare/v0.3.2...v0.3.3) (2026-11-13)

### Correções

- Aplica os tokens da marca ao PDF e EPUB, com a assinatura oficial na capa e áreas separadas para logo e texto.
- Substitui o renderizador de PDF por Playwright/Chromium, controlado por Node.js, e gera a capa do EPUB pela mesma composição.
- Sincroniza a edição do ebook com a versão do pacote e inclui tokens e logo na verificação de integridade.

## [0.3.2](https://github.com/promovaweb/pagespeedfy/compare/v0.3.1...v0.3.2) (2026-11-13)

### Marca

- Nova identidade visual: ícone, logotipo e kit de marca em `brand/`. O conceito é uma página veloz, a folha do site com um raio verde recortado, que mostra a página mais rápida depois das correções.
- `brand/` traz logo em SVG e PNG para fundo claro e escuro, favicons, paleta com petróleo e turquesa da Promovaweb e verde próprio (`#22C55E` e `#15803D`), tokens, CSS, tema Tailwind, fontes, relatório de contraste, manifesto com hashes e guia visual.
- O README abre com o logo do Pagespeedfy e a linha "Um projeto da Promovaweb".
- O ebook passa à edição 0.2.2, com o ícone novo na capa no lugar do medidor antigo.

## [0.3.1](https://github.com/promovaweb/pagespeedfy/compare/v0.3.0...v0.3.1) (2026-11-13)

### Build

- A publicação no npm passa a ser feita só pela máquina local; o workflow de release não publica mais no npm.
- O workflow `Release`, o Release Please (`release-please-config.json` e `.release-please-manifest.json`), o script `publicar-npm.mjs` e o comando `npm run publish:npm` saem do repositório. Sem token, o Release Please não abria a Release PR, e as versões já saíam desta máquina.
- `RELEASING.md` reescrito com o fluxo real: bump, validação, empacotamento, tag, GitHub Release com anexos e `npm publish` local.

## [0.3.0](https://github.com/promovaweb/pagespeedfy/compare/v0.2.2...v0.3.0) (2026-11-13)

### Licença

- A partir desta versão, o projeto é distribuído sob a GNU AGPL 3.0 (SPDX `AGPL-3.0-only`); versões anteriores continuam sob a licença com que foram publicadas.
- `LICENSE` novo na raiz com o texto oficial e integral da AGPL 3.0. O campo `license` do `package.json` deixa de ser `UNLICENSED`.
- README com badge e seção Licença, que registra que a licença não concede o uso do nome e do logo do Pagespeedfy nem da marca Promovaweb. `CONTRIBUTING.md` informa que as contribuições entram sob a mesma licença.

## [0.2.2](https://github.com/promovaweb/pagespeedfy/compare/v0.2.1...v0.2.2) (2026-11-13)

### Documentação

- README reorganizado para quem usa: cabeçalho com o logo da Promovaweb, badges, banner do Discord e links para a documentação publicada, os planos da Promovaweb e o changelog. Novas seções Feito com, Comunidade e suporte, Contribuir e Promovaweb, com os repositórios usados.
- `CONTRIBUTING.md` novo para quem contribui, com ambiente, organização do código, regras, validação, commits e releases. As instruções de desenvolvimento saem do README.
- `.markdownlint.json` libera os elementos HTML do cabeçalho.

## [0.2.1](https://github.com/promovaweb/pagespeedfy/compare/v0.2.0...v0.2.1) (2026-11-05)

### Correções

- Opção ou argumento inválido, como `--timeout 0` ou `--strategy tablet`, passa a sair com código 2, como a referência documenta. Ajuda e versão saem com 0.
- Duas execuções da mesma página no mesmo segundo deixam de reaproveitar a pasta: a segunda recebe o sufixo `-2`.
- A skill só confere o `.gitignore` antes do plano; a inclusão de `pagespeedfy-reports/` entra no plano e espera a autorização como as demais mudanças.

### Documentação

- README do npm e guia do usuário com instalação rápida em três passos: CLI pelo npm, skill pelo `npx skills add https://github.com/promovaweb/pagespeedfy` e `pagespeedfy auth login`.
- Revisão geral: campos que podem ser `null` no `report.json`, cota diária ligada à chave, publicação manual em `RELEASING.md` e exemplos de versão atualizados. Ebook na edição 0.2.1.

## [0.2.0](https://github.com/promovaweb/pagespeedfy/compare/v0.1.1...v0.2.0) (2026-11-05)

### Funcionalidades

- Move a skill `pagespeedfy-otimizar-pagina` de `.codex/skills/` para `skills/`, o layout lido pelo `npx skills`. A instalação passa a ser `npx skills add https://github.com/promovaweb/pagespeedfy`.

### Documentação

- Atualiza README, guia do usuário e ebook (edição 0.2.0) com a instalação da skill pelo `npx skills add`.

## [0.1.1](https://github.com/promovaweb/pagespeedfy/compare/v0.1.0...v0.1.1) (2026-11-05)

### Build

- Primeira versão disponível no npm. A 0.1.0 ficou retida no staging de publicação do npm e não pode ser reutilizada; o conteúdo do pacote é o mesmo da 0.1.0.

## [0.1.0](https://github.com/promovaweb/pagespeedfy/releases/tag/v0.1.0) (2026-11-05)

### Funcionalidades

- Adiciona `pagespeedfy auth login`, `auth status` e `auth logout`, com a API key em `~/.pagespeedfy/credentials` (pasta `0700`, arquivo `0600`) e prioridade para `PAGESPEEDFY_API_KEY`.
- Adiciona `pagespeedfy run <url>`, que consulta a API PageSpeed Insights v5 para uma página em mobile e desktop e salva JSON bruto, `report.json` normalizado e `report.md` na pasta visível `pagespeedfy-reports/`.
- Adiciona `pagespeedfy report` e `pagespeedfy compare` para reler e comparar execuções.
- Adiciona a skill `pagespeedfy-otimizar-pagina`, que lê todos os relatórios da rota, grava e exibe um plano de correções em `plano.md` e só altera o projeto Astro depois da autorização da pessoa.

### Documentação

- Adiciona o guia do usuário em `docs/user/` (oito capítulos), a documentação de arquitetura e o ebook em PDF e EPUB gerado por `npm run ebook`.

### Build

- Publica no npm como `@promovaweb/pagespeedfy`. A versão 0.1.0 sai desta máquina; as próximas saem pelo Release Please e pelo workflow `Release`.
