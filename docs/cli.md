# CLI

## Convenções

- `{{bin}} <command> [subcommand] [arguments] [options]`.
- Options aceitam `--key value` e `--key=value`. Não há agrupamento de flags
  curtas (`-abc`).
- `--` encerra a leitura de options; o que vem depois é argument.
- Options globais valem em qualquer posição, antes ou depois do command.
- Sem argumentos, em terminal interativo, o binário abre a TUI. Sem TTY,
  imprime o help e sai com exit code 2.
- Toda saída de dados vai para stdout. Avisos, progresso e erros em modo
  texto vão para stderr.
- Nomes de commands, subcommands, options, arguments, keys e campos de saída
  são em inglês. Mensagens do binário também.

## Options globais

| Option | Efeito |
| --- | --- |
| `-h`, `--help` | Help do command atual. Exit code 0. |
| `-V`, `--version` | Imprime `{{bin}} <version>`. Exit code 0. |
| `--json` | Saída em JSON com envelope estável. Erros também saem em JSON, em stdout. |
| `--skill [topic]` | Documentação embutida. Topics: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`. |
| `--opencli` | Descrição OpenCLI 0.1 da árvore de commands em JSON. |
| `--no-color` | Desliga cores ANSI. `NO_COLOR=1` tem o mesmo efeito. |

## Saída em texto e em JSON

Texto é o padrão quando `output.format` em settings.json é `text`. Com
`--json`, ou com `output.format = json`, a saída segue este envelope:

```json
{ "ok": true, "command": "{{bin}} config get", "data": { "key": "tui.theme", "value": "night" } }
```

Em erro:

```json
{
  "ok": false,
  "command": "{{bin}} credentials get",
  "error": { "code": 4, "name": "CREDENTIALS", "message": "Credential \"x\" not found.", "details": { "name": "x" } }
}
```

O exit code do processo é sempre o mesmo de `error.code`. Um agente deve ler
os dois: o envelope para a mensagem, o code para a classe da falha.

## Medir, guardar e comparar

O ciclo de trabalho é sempre o mesmo:

1. `run <url>` mede uma página, grava as respostas brutas e registra a
   medição em `<projeto>/.pagespeedfy/history.db`.
2. `history` lê o que já existe. Sem URL, lista as páginas acompanhadas com
   as notas mais recentes. Com URL, mostra a linha do tempo daquela página.
3. `compare` confronta duas medições: notas, métricas de laboratório e
   auditorias resolvidas ou novas.

O histórico pertence ao projeto do site, não à pasta de dados do binário.
Por isso `run` grava ao lado do código e `history`, `report` e `compare`
abrem o mesmo banco a partir do diretório atual. Use `--project <dir>` para
apontar outro projeto, ou defina `PAGESPEEDFY_PROJECT`. O fluxo completo
está em [Configuração](configuration.md).

```bash
cd ~/site
{{bin}} run https://example.com/ --note "baseline"
# ajusta a página
{{bin}} run https://example.com/ --note "imagens em AVIF"
{{bin}} compare https://example.com/
```

`history` e `compare` não chamam a API. Eles custam zero cota e podem rodar
em CI ou num agente que só lê o histórico.

## `run`

Mede uma página com PageSpeed Insights e registra a medição no histórico do
projeto. Mobile e desktop são consultados em paralelo; dentro de cada
estratégia, as leituras de `--samples` acontecem em sequência, para não
estourar o limite da API. A nota gravada é a da leitura mediana por
performance.

| Argument | Obrigatório | Descrição |
| --- | --- | --- |
| `url` | sim | URL pública completa, com `http://` ou `https://`. URL local é recusada antes de gastar cota. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-s`, `--strategy <strategy>` | `all` | `mobile`, `desktop` ou `all`. |
| `-c`, `--category <list>` | todas | Categorias separadas por vírgula: `performance`, `accessibility`, `best-practices`, `seo`. |
| `-n`, `--samples <n>` | `1` | Leituras por estratégia, de 1 a 9. A mediana por performance é gravada. |
| `-m`, `--note <text>` | nenhum | O que mudou antes desta medição, exibido na linha do tempo. |
| `--fail-under <budget>` | nenhum | Notas mínimas, por exemplo `performance=90,seo=95`. Um número sozinho vale para todas as categorias. Sai com 10 quando alguma nota fica abaixo. |
| `-l`, `--locale <locale>` | `pt-BR` | Idioma dos textos da auditoria. |
| `--max-items <n>` | `50` | Itens de detalhe guardados por auditoria que falhou. |
| `--timeout <seconds>` | `180` | Tempo máximo por consulta à API. |
| `--retries <n>` | `3` | Tentativas por consulta em HTTP 429 e 5xx. |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto que contém `.pagespeedfy/`. |

Cada execução grava uma linha por estratégia, todas com o mesmo `session`.
As respostas brutas ficam em
`.pagespeedfy/reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/<estrategia>-<n>.raw.json`.
A chave vem de `PAGESPEEDFY_API_KEY` ou do cofre, na credencial
`pagespeed.api_key`.

```bash
{{bin}} run https://example.com/
{{bin}} run https://example.com/pricing --samples 3 --note "hero com lazy-load"
{{bin}} run https://example.com/ --strategy mobile --fail-under performance=90 --json
```

Em texto, a saída traz uma linha por estratégia com as quatro notas, LCP,
TBT, CLS, contagem de auditorias que falharam e o caminho do banco. Em JSON,
`data` contém `url`, `project`, `database`, `session`, `measurements` e
`budget`. Cada item de `measurements` é um resumo com `id`, `strategy`,
`scores`, `lab`, `failedAudits`, `rawFile` e `sampleScores`. `budget` é
`null` sem `--fail-under`; com a option, traz `minimums`, `failures` e
`passed`.

Exit codes: 0 em sucesso, 4 sem chave, 5 em falha de rede ou API, 3 quando
a pasta do projeto não pode ser criada, 7 em permissão negada e 10 quando a
nota fica abaixo do orçamento.

## `history`

Lê `<projeto>/.pagespeedfy/history.db`, sem rede. Sem URL, lista cada página
acompanhada, com a data da última medição e a nota de performance mais
recente de mobile e desktop. Com URL, lista as medições daquela página da
mais antiga para a mais recente, para a melhoria ser lida de cima para baixo.

| Argument | Obrigatório | Descrição |
| --- | --- | --- |
| `url` | não | Página cuja linha do tempo mostrar. Omitido, lista todas as páginas. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-s`, `--strategy <strategy>` | `all` | `mobile`, `desktop` ou `all` na linha do tempo. |
| `--limit <n>` | `50` | Quantidade máxima de medições recentes mostradas. |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto. |

Cada item da linha do tempo traz estratégia, data, as quatro notas, LCP,
TBT, CLS, auditorias pendentes e a anotação da pessoa. Em JSON, sem URL,
`data` contém `project` e `pages`; com URL, `project`, `url` e
`measurements`.

Exit codes: 0 em sucesso, 6 quando não há histórico no projeto ou a URL não
tem medição, 3 quando o projeto não pode ser resolvido.

```bash
{{bin}} history
{{bin}} history https://example.com/ --strategy mobile
{{bin}} history https://example.com/ --limit 10 --json
```

## `report`

Imprime uma medição guardada por inteiro: notas, métricas de laboratório,
dados de campo e todas as auditorias que falharam, com os itens de detalhe.

| Argument | Obrigatório | Descrição |
| --- | --- | --- |
| `ref` | sim | Id da medição, mostrado por `run` e `history`, ou URL da página para a última medição dela. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-s`, `--strategy <strategy>` | `mobile` | Estratégia usada quando `ref` é uma URL. |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto. |

Em JSON, `data` é a medição completa: o resumo e o objeto `run`
normalizado, com `scores`, `labMetrics`, `fieldData`, `failedAudits` e
`formatVersion`.

Exit codes: 0 em sucesso, 6 quando o id ou a página não existe, 3 quando o
projeto não pode ser resolvido.

```bash
{{bin}} report 12
{{bin}} report https://example.com/ --strategy desktop
{{bin}} report 12 --json
```

## `compare`

Compara duas medições da mesma página: diferença de cada nota e de cada
métrica de laboratório, auditorias resolvidas, novas e ainda pendentes.

| Forma | O que compara |
| --- | --- |
| `compare <url>` | as duas últimas medições da página, na estratégia de `--strategy`. |
| `compare <id>` | a medição indicada e a anterior da mesma página e estratégia. |
| `compare <before> <after>` | as duas referências, nessa ordem. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-s`, `--strategy <strategy>` | `mobile` | Estratégia usada quando uma referência é URL. |
| `--fail-on-regression` | desligado | Sai com 10 quando alguma nota caiu ou uma auditoria nova falhou. |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto. |

Em JSON, `data` traz `url`, `strategy`, `sameUrl`, `sameStrategy`, `before`,
`after`, `scores` e `labMetrics` (cada um com `before`, `after` e `delta`),
`resolvedAudits`, `newAudits`, `remainingAudits` e `regression`.

Exit codes: 0 em sucesso, 6 quando falta medição para comparar, 3 quando o
projeto não pode ser resolvido e 10 com `--fail-on-regression` quando há
regressão.

```bash
{{bin}} compare https://example.com/
{{bin}} compare 12 15
{{bin}} compare https://example.com/ --strategy desktop --fail-on-regression
```

## `import`

Traz para o histórico as pastas `report.json` escritas por Pagespeedfy
0.3.x, para a linha do tempo começar antes da atualização. A busca é
recursiva; um arquivo `report.json` também é aceito. Relatório já importado
é pulado, então rodar duas vezes é seguro.

| Argument | Obrigatório | Descrição |
| --- | --- | --- |
| `path` | sim | Pasta vasculhada por arquivos `report.json`, ou um `report.json`. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto que recebe o histórico. |

Cria `.pagespeedfy/` quando a pasta ainda não existe. Em JSON, `data` traz
`imported`, `skipped`, `failed` e `project`.

Exit codes: 0 em sucesso, 6 quando o caminho não existe, 3 quando o
histórico não pode ser criado e 7 em permissão negada.

```bash
{{bin}} import pagespeedfy-reports
{{bin}} import pagespeedfy-reports --json
```

## `forget`

Remove uma medição do histórico, para leitura feita por engano: deploy
errado, página quebrada. As respostas brutas continuam em
`.pagespeedfy/reports/`. A página que fica sem medição desaparece de
`history`; o id removido não é reutilizado.

| Argument | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | sim | Id numérico da medição, como mostrado por `run` e `history`. |

| Option | Default | Efeito |
| --- | --- | --- |
| `-p`, `--project <dir>` | projeto atual | Raiz do projeto. |

Em JSON, `data` contém `removed`, o resumo da medição apagada.

Exit codes: 0 em sucesso, 6 quando o id não existe, 3 quando o projeto não
pode ser resolvido e 2 quando o argumento não é um id numérico.

```bash
{{bin}} forget 12
```

## Commands herdados

| Command | Função |
| --- | --- |
| `tui [--tab <tab>]` | Abre a TUI. Exige TTY. |
| `about` | Version, executable, runtime, platform e credits. |
| `config list\|get\|set\|unset\|path\|schema` | Preferências em settings.json. |
| `credentials set\|get\|list\|remove\|status\|clear\|rotate-key` | Cofre cifrado em credentials.json. |
| `mcp [--list]` | Servidor MCP via stdio, ou listagem do que ele registra. |
| `skill [topic]` | Mesmo efeito de `--skill`. |
| `doctor` | Confere runtime, TTY, pasta, settings, chave e cofre. |
| `completion <shell>` | Gera script para `bash`, `zsh` ou `fish`. |

## Diagnóstico e completion

`{{bin}} doctor` confere Bun 1.4.4 ou superior, TTY de stdin/stdout,
pasta de dados com 0700, leitura de settings.json, origem da master key,
decifragem do cofre, versão e plataforma. Cada linha usa ✓, ! ou ✗.
Em JSON, `data` contém `{ checks, ok }`; cada check tem `name`, `status`
e `detail`. Ausência de TTY ou de arquivos ainda não criados gera `warn`.
Uma verificação com `fail` produz exit code 3; as demais retornam 0.
O diagnóstico não cria arquivos nem mostra segredos.

`{{bin}} completion <shell>` imprime o script em stdout. O argument `shell`
aceita `bash`, `zsh` ou `fish`; subcommands, options locais e globais e valores
de enum vêm do registry. Com `--json`, `data` contém `{ shell, script }`.
O script Zsh usa `compdef` e `compadd`, sem `bashcompinit`.
Instale na sessão atual ou acrescente a linha ao arquivo de inicialização:

```bash
eval "$({{bin}} completion bash)"
eval "$({{bin}} completion zsh)"
# fish
{{bin}} completion fish | source
```

## Referência gerada

`{{bin}} --skill reference` retorna somente a referência gerada do registry,
com commands, arguments, options e exit codes. `skill reference` tem o mesmo
resultado, sem os capítulos da documentação. A lista de options acima é um
resumo para leitura; a referência gerada é a fonte exata dos defaults.
