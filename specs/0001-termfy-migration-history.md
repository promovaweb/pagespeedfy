# 0001 Migração para o Termfy com histórico no projeto

Status: done

## Goal

Refazer o Pagespeedfy 0.3.5 (Node + Commander) sobre o starter kit do Termfy
v0.9.4, com TUI, CLI e MCP no mesmo binário, e trocar as pastas soltas de
`report.json` por um histórico SQLite no projeto do usuário, para acompanhar
a melhoria de cada página ao longo do tempo. A versão inclui as melhorias
levantadas na revisão da 0.3.5: chave fora da URL, URLs privadas recusadas
antes da consulta, estratégias em paralelo, mediana de amostras, metas para
CI, `compare` sem caminhos digitados e pacote npm sem os ebooks antigos.
Ficam fora: medir várias páginas por execução e rodar Lighthouse local.

## Behavior

- `pagespeedfy run <url>` valida a URL (recusa localhost, IPs privados,
  link-local, CGNAT e nomes internos com exit 2), resolve a chave
  (`PAGESPEEDFY_API_KEY`, depois o cofre `pagespeed.api_key`, importando a
  chave da 0.3.x na primeira vez), consulta mobile e desktop em paralelo,
  faz `--samples` leituras por estratégia, grava os JSON brutos em
  `.pagespeedfy/reports/` e a mediana em `.pagespeedfy/history.db`.
  `--note` registra o que mudou. `--fail-under` sai com 10 abaixo da meta.
- `history` lista páginas ou a linha do tempo de uma página; `report`
  mostra uma medição; `compare` aceita URL, id ou par e sai com 10 em
  regressão com `--fail-on-regression`; `import` traz os relatórios da
  0.3.x; `forget` remove uma medição.
- Comandos de leitura não criam o banco: sem histórico, exit 6 com o
  comando que mede.
- A TUI abre na aba History, só leitura.
- O MCP expõe `pagespeed_run`, `pagespeed_history`, `pagespeed_report` e
  `pagespeed_compare`, com `project` opcional, e o prompt `optimize_page`.
  Falhas esperadas voltam com `isError` e o nome do exit code.
- O pacote npm vira um invólucro que baixa o binário da GitHub Release.

## Design

- Domínio em `src/pagespeed/`: `report.ts` (normalização e mediana),
  `api.ts` (client com `X-Goog-Api-Key`, retries, `PAGESPEEDFY_API_ENDPOINT`
  para testes), `url.ts`, `key.ts`, `project.ts`, `measure.ts`
  (orquestração compartilhada), `budget.ts`, `compare.ts`, `markdown.ts`,
  `queries.ts` (consultas comuns aos três modos e importação 0.3.x).
- Banco em `src/db/`, a partir de `template/db/`, com o caminho vindo de
  `resolveProject()`; SQL só em `src/db/history.ts`.
- Commands em `src/cli/commands/`, options comuns em
  `src/cli/pagespeed-options.ts`; tools em `src/mcp/tools/pagespeed.ts`;
  screen em `src/tui/screens/history.ts`.
- Exit code novo `BUDGET` (10) na tabela única.
- Distribuição npm copiada do ClickUpfy (`npm/`, `scripts/npm-readme.ts`,
  `release.yml` com conferência de versão).

## Surface

- Adiciona os commands `run`, `history`, `report`, `compare`, `import` e
  `forget`, como na tabela do `CLISPEC.md`.
- Remove os commands `auth login`, `auth status` e `auth logout` e as
  options `--output` e `--print` da 0.3.x.
- Adiciona a screen `history` como primeira aba.
- Adiciona as tools `pagespeed_run`, `pagespeed_history`,
  `pagespeed_report`, `pagespeed_compare` e o prompt `optimize_page`.
- Altera a key `tui.initialTab`: valores `history`, `overview`, `about`;
  padrão `history`.
- Adiciona a credencial `pagespeed.api_key`.
- Adiciona o exit code 10 `BUDGET`.
- Adiciona as tabelas `pages` e `measurements` (schema 1).

## Tasks

- [x] Copiar o starter kit e rodar o bootstrap preservando CHANGELOG, README e licença AGPL `#termfy-init`
- [x] Chave no cofre com importação da 0.3.x `#termfy-config`
- [x] Client da API com cabeçalho, retries e endpoint configurável `#termfy-api`
- [x] Banco do projeto, migration e repositório `#termfy-database`
- [x] Commands `run`, `history`, `report`, `compare`, `import`, `forget` `#termfy-cli`
- [x] Tools e prompt MCP `#termfy-mcp`
- [x] Screen `history` `#termfy-tui`
- [x] Testes de domínio, banco, CLI, MCP e TUI `#termfy-test`
- [x] Documentação embutida em `docs/` e `opencli.json` `#termfy-docs`
- [x] README, CONTRIBUTING, guia do usuário e skill `pagespeedfy-otimizar-pagina` `#termfy-docs`
- [x] Revisão da entrega `#termfy-review`

## Tests

- [x] Normalização, mediana, URLs privadas, metas, client e chave (`tests/pagespeed-domain.test.ts`)
- [x] Repositório, comparação, `forget`, banco mais novo e importação 0.3.x (`tests/pagespeed-history.test.ts`)
- [x] `run` com mediana, `history`, `report`, `compare`, exit codes 2, 4, 6 e 10 contra servidor local (`tests/pagespeed-e2e.test.ts`)
- [x] Tools MCP por stdio, inclusive `isError` (`tests/pagespeed-e2e.test.ts`)
- [x] Screen `history`: vazio, linha do tempo, filtro, detalhe e comparação (`tests/tui-history.test.ts`)
- [x] `bun run validate` verde e binário compilado aplica a migration numa pasta vazia

## Notes

- 2026-11-16: o banco fica em `<projeto>/.pagespeedfy/history.db` por pedido
  do Luiz, fora do padrão `~/.<bin>/data.db` da `termfy-database`.
- 2026-11-16: a TUI foi feita pelo Codex e a documentação pelo OpenCode, com
  revisão do agente principal.
- 2026-11-16: a revisão independente (Codex, `termfy-review`) apontou 7
  achados: JSON brutos sobrescritos no mesmo segundo, chave ecoada numa
  resposta de sucesso, chave do cofre trocada pela da 0.3.x, comparação por
  id limitada a mil medições, importação abortada por relatório inválido,
  variantes de host privado aceitas e `URIError` no slug. Todos corrigidos,
  com testes de regressão.
