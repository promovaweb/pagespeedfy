# Pagespeedfy

`pagespeedfy`: CLI, TUI and MCP stdio server to measure pages with PageSpeed Insights and track their improvement history.

## Purpose

Quem otimiza um site, e o agente de IA que corrige o código com essa
pessoa, precisa medir uma página publicada no PageSpeed Insights, decidir o
que corrigir a partir das auditorias e confirmar depois do deploy que a
correção funcionou. O Pagespeedfy faz isso uma página por vez e guarda cada
medição num banco SQLite dentro do próprio projeto
(`<projeto>/.pagespeedfy/history.db`), para que o histórico de melhorias de
cada página acompanhe o repositório do site. Até a 0.3.5 ele era um CLI em
Node que gravava pastas de JSON soltas; a 1.0 refaz a ferramenta sobre o
Termfy, com TUI, MCP, cofre cifrado para a API key e o histórico consultável.

## Audiences

| Público | Modo | Necessidade |
| --- | --- | --- |
| pessoa desenvolvedora | CLI texto | medir uma página, ler as auditorias e comparar antes e depois sem sair do terminal |
| pessoa desenvolvedora | TUI | ver a evolução das notas de cada página do projeto e abrir o detalhe de uma medição |
| CI | CLI `--json` | medir depois do deploy e falhar o pipeline com `--fail-under` ou `--fail-on-regression` |
| agentes (Claude Code, Codex, OpenCode) | MCP e a skill `pagespeedfy-otimizar-pagina` | medir, escolher correções, corrigir o site Astro e confirmar o ganho com as tools `pagespeed_*` |

## Out of scope

- Medir várias páginas numa execução ou rastrear o site inteiro: o trabalho
  é uma página por vez.
- Medir `localhost` ou redes privadas: o PageSpeed Insights roda nos
  servidores do Google.
- Rodar o Lighthouse localmente.
- Editar o código do site: isso é da skill e do agente, com autorização.
- Disparar medições pela TUI: ela só lê o histórico.

## Surface

### Commands

| Command | Função | Options | `data` no `--json` | Exit codes | Credenciais |
| --- | --- | --- | --- | --- | --- |
| `run` | Measure ONE page with PageSpeed Insights and record it in the project history. | `<url>`, `--strategy <mobile\|desktop\|all>`, `--category <list>`, `--samples <n>`, `--note <text>`, `--fail-under <budget>`, `--locale <locale>`, `--max-items <n>`, `--timeout <seconds>`, `--retries <n>`, `--project <dir>` | `{ url, project, database, session, measurements[], budget }` | 3, 4, 5, 7, 10 | `pagespeed.api_key` |
| `history` | List the tracked pages, or the measurement timeline of one page. | `[url]`, `--strategy <mobile\|desktop\|all>`, `--limit <n>`, `--project <dir>` | `{ project, pages[] }` ou `{ project, url, measurements[] }` | 3, 6 | |
| `report` | Print one stored measurement with its failed audits. | `<ref>`, `--strategy <mobile\|desktop>`, `--project <dir>` | medição com `run` completo | 3, 6 | |
| `compare` | Compare two measurements: score and metric changes, resolved and new audits. | `<before>`, `[after]`, `--strategy <mobile\|desktop>`, `--fail-on-regression`, `--project <dir>` | `{ url, strategy, before, after, scores, labMetrics, resolvedAudits[], newAudits[], remainingAudits[], regression }` | 3, 6, 10 | |
| `import` | Import Pagespeedfy 0.3.x report.json folders into the project history. | `<path>`, `--project <dir>` | `{ imported, skipped, failed[], project }` | 3, 6, 7 | |
| `forget` | Remove one measurement from the history. | `<id>`, `--project <dir>` | `{ removed }` | 3, 6 | |
| `tui` | Open the terminal interface. Requires a TTY. | | | 8 | |
| `about` | Show version, executable, runtime, platform and credits. | | veja `docs/cli.md` | | |
| `config` | Read and write preferences in ~/.pagespeedfy/settings.json. | `list`, `get`, `set`, `unset`, `path` | veja `docs/cli.md` | 3, 7 | |
| `credentials` (alias `cred`) | Store encrypted secrets (AES-256-GCM) in ~/.pagespeedfy/credentials.json. | `set`, `get`, `list`, `remove`, `status`, `clear`, `rotate-key` | veja `docs/cli.md` | 4, 7, 130 | |
| `mcp` | Start the MCP server (stdio). | `--list` | veja `docs/cli.md` | 9 | |
| `skill` | Print the embedded documentation, whole or by topic. | `[topic]` | `{ topic, markdown }` | | |
| `doctor` | Check runtime, terminal, settings, key source and vault readability. | | `{ checks[], ok }` | 3 | |
| `completion` | Print a completion script for bash, zsh or fish. | `<shell>` | veja `docs/cli.md` | | |

### Screens

| Screen | Função | Teclas |
| --- | --- | --- |
| `history` | páginas do projeto, linha do tempo com sparkline da performance, detalhe da medição e comparação com a anterior | `↑` `↓`, `Enter`, `Esc`, `f`, `r`, `←` `→`, `1`-`9`, `?`, `q` |
| `overview` | ambiente, estado local e próximos passos | `←` `→`, `1`-`9`, `?`, `q` |
| `about` | identidade, links e créditos do binário | `←` `→`, `1`-`9`, `?`, `q` |

### MCP

| Tipo | Nome | Função | Efeito |
| --- | --- | --- | --- |
| tool | `pagespeed_run` | mede uma página e grava no histórico do projeto | `network`, `write` |
| tool | `pagespeed_history` | páginas do projeto ou linha do tempo de uma página | `read` |
| tool | `pagespeed_report` | uma medição com as auditorias pendentes | `read` |
| tool | `pagespeed_compare` | compara duas medições | `read` |
| tool | `about` | versão, executável, runtime, plataforma e créditos | `read` |
| tool | `exit_codes` | tabela de exit codes | `read` |
| tool | `skill` | documentação embutida, inteira ou por tópico | `read` |
| tool | `config_list` | todas as keys com o valor efetivo | `read` |
| tool | `config_get` | valor de uma key | `read` |
| tool | `credentials_status` | nomes salvos e origem da master key, sem valores | `read` |
| tool | `doctor` | diagnóstico de runtime, terminal e configuração | `read` |
| resource | `pagespeedfy://about` | identidade e runtime em JSON | `read` |
| resource | `pagespeedfy://exit-codes` | tabela de exit codes em JSON | `read` |
| resource | `pagespeedfy://skill` | documentação completa | `read` |
| resource | `pagespeedfy://skill/{topic}` | uma seção da documentação | `read` |
| prompt | `operate` | conduz o agente a operar o binário pela CLI | `read` |
| prompt | `optimize_page` | conduz medir, corrigir e comparar uma página | `read` |

### Settings

| Key | Tipo | Padrão | Função |
| --- | --- | --- | --- |
| `output.format` | `enum` (`text`, `json`) | `text` | formato padrão da saída |
| `output.colors` | `boolean` | `true` | cores ANSI na saída de texto |
| `tui.initialTab` | `enum` (`history`, `overview`, `about`) | `history` | aba aberta ao iniciar a TUI |
| `tui.theme` | `enum` (`night`, `day`) | `night` | paleta da TUI |
| `telemetry.enabled` | `boolean` | `false` | reservado; nada é enviado |

### Credentials

| Nome | Usada por | Como obter |
| --- | --- | --- |
| `pagespeed.api_key` | `run`, `pagespeed_run` | Google Cloud Console, projeto com a PageSpeed Insights API ativada, em APIs e serviços > Credenciais. `PAGESPEEDFY_API_KEY` tem prioridade. A chave da 0.3.x em `~/.pagespeedfy/credentials` é movida para o cofre no primeiro uso. |

### Storage

Banco `<projeto>/.pagespeedfy/history.db`, schema versão 1
(`src/db/migrations/0001-create-history.ts`).

| Tabela | Coluna | Tipo | Regras |
| --- | --- | --- | --- |
| `pages` | `id` | `INTEGER` | chave primária |
| `pages` | `url` | `TEXT` | `NOT NULL`, `UNIQUE` |
| `pages` | `host` | `TEXT` | `NOT NULL` |
| `pages` | `created_at` | `TEXT` | `NOT NULL`, ISO 8601 |
| `measurements` | `id` | `INTEGER` | chave primária |
| `measurements` | `page_id` | `INTEGER` | `NOT NULL`, referência a `pages (id)`, `ON DELETE CASCADE` |
| `measurements` | `session` | `TEXT` | `NOT NULL`; agrupa as estratégias de um `run` |
| `measurements` | `strategy` | `TEXT` | `NOT NULL` |
| `measurements` | `measured_at` | `TEXT` | `NOT NULL`, ISO 8601 |
| `measurements` | `note` | `TEXT` | |
| `measurements` | `samples` | `INTEGER` | `NOT NULL` |
| `measurements` | `tool_version` | `TEXT` | `NOT NULL` |
| `measurements` | `lighthouse_version` | `TEXT` | `NOT NULL` |
| `measurements` | `performance`, `accessibility`, `best_practices`, `seo` | `INTEGER` | 0 a 100 |
| `measurements` | `fcp`, `lcp`, `tbt`, `cls`, `si`, `tti` | `REAL` | métricas de laboratório |
| `measurements` | `failed_audits` | `INTEGER` | `NOT NULL` |
| `measurements` | `run` | `TEXT` | `NOT NULL`, JSON da execução normalizada |

## Specs

| ID | Título | Status |
| --- | --- | --- |
| 0001 | Migração para o Termfy com histórico no projeto | done |

## Notes

- 2026-11-16: visão macro registrada a partir dos pedidos do Luiz na sessão
  de migração (Termfy, MCP, TUI, histórico em SQLite no projeto, API key no
  cofre).
- 2026-11-16: exceção à regra da `termfy-database`: o banco fica no projeto
  do usuário, não em `~/.pagespeedfy/data.db`, por pedido explícito, para o
  histórico acompanhar o repositório do site.
- 2026-11-16: spec 0001 (Migração para o Termfy com histórico no projeto) closed.
