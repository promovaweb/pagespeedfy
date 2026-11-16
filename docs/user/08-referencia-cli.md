# Referência do CLI

Esta referência cobre todos os commands do `pagespeedfy` 1.0.0. A fonte é o
registro de commands do binário, o mesmo que monta o `--help`.

## Formas de uso

```text
pagespeedfy <subcommand> [options]
pagespeedfy                        abre a TUI, sem argumentos e num terminal
pagespeedfy mcp                    inicia o servidor MCP por stdio
```

## Opções globais

| Opção | Tipo | Efeito |
| --- | --- | --- |
| `-h`, `--help` | flag | Mostra a ajuda do command e sai com código 0 |
| `-V`, `--version` | flag | Imprime a versão e sai com código 0 |
| `--json` | flag | Devolve o envelope `{ ok, command, data }` ou `{ ok, command, error }` |
| `--skill [topic]` | texto | Imprime a documentação embutida, inteira ou por tópico |
| `--opencli` | flag | Imprime a descrição OpenCLI da árvore de commands em JSON |
| `--no-color` | flag | Desliga cores ANSI, o mesmo que `NO_COLOR=1` |

O `--json` pode vir antes ou depois do command. O progresso vai para o stderr e
os dados para o stdout. Em `mcp`, o stdout é do JSON-RPC.

## Códigos de saída

| Código | Nome | Significado |
| --- | --- | --- |
| `0` | SUCCESS | Operação concluída |
| `1` | GENERIC_ERROR | Falha sem classificação específica |
| `2` | USAGE | Argumento, opção ou subcommand inválido |
| `3` | CONFIG | `settings.json` ausente, inválido ou com chave desconhecida |
| `4` | CREDENTIALS | Cofre ilegível, chave mestra ausente ou credencial não encontrada |
| `5` | NETWORK_OR_API | Falha de rede ou resposta inesperada da API |
| `6` | NOT_FOUND | Recurso pedido não existe |
| `7` | PERMISSION | Permissão negada no sistema de arquivos |
| `8` | NO_TTY | A TUI precisa de um terminal interativo |
| `9` | MCP | O servidor MCP falhou ao iniciar ou perdeu o transporte stdio |
| `10` | BUDGET | Nota abaixo do `--fail-under` ou regressão com `--fail-on-regression` |
| `130` | INTERRUPTED | Entrada cancelada ou processo interrompido |

## Variáveis de ambiente

| Variável | Efeito |
| --- | --- |
| `PAGESPEEDFY_API_KEY` | Chave da API. Tem prioridade sobre o cofre |
| `PAGESPEEDFY_PROJECT` | Raiz do projeto do site |
| `PAGESPEEDFY_HOME` | Pasta dos dados da máquina, no lugar de `~/.pagespeedfy/` |
| `PAGESPEEDFY_MASTER_KEY` | Chave mestra do cofre, com 64 caracteres hexadecimais |
| `PAGESPEEDFY_API_ENDPOINT` | Endpoint da API, para espelho ou servidor de teste |
| `NO_COLOR` | Desliga cores ANSI quando vale `1` |

## Raiz do projeto

O `run`, o `history`, o `report`, o `compare`, o `import` e o `forget` aceitam
`-p`, `--project <dir>`. Sem a opção, a raiz vem de `PAGESPEEDFY_PROJECT`. Sem
a variável, o binário sobe do diretório atual até a pasta mais próxima que já
tem `.pagespeedfy/`, pulando a home. Se não achar, usa a pasta mais próxima com
`.git` ou `package.json` e, por fim, o diretório atual.

## `pagespeedfy run <url>`

Mede uma página e grava a medição no histórico do projeto.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `<url>` | texto | obrigatório | URL pública e completa, `http` ou `https` |
| `-s`, `--strategy` | `mobile`, `desktop`, `all` | `all` | Estratégias medidas em paralelo |
| `-c`, `--category` | lista | as quatro | `performance`, `accessibility`, `best-practices`, `seo`. Repita a opção ou separe por vírgula |
| `-n`, `--samples` | inteiro de 1 a 9 | `1` | Leituras por estratégia; grava a mediana pela nota de Performance |
| `-m`, `--note` | texto | nenhum | O que mudou antes da medição, exibido na linha do tempo |
| `--fail-under` | orçamento | nenhum | Mínimos por categoria, como `performance=90,seo=95`, ou um número para todas. Sai com código 10 quando alguma nota fica abaixo |
| `-l`, `--locale` | texto | `pt-BR` | Idioma dos textos das auditorias |
| `--max-items` | inteiro | `50` | Itens de detalhe guardados por auditoria |
| `--timeout` | segundos | `180` | Tempo máximo de cada consulta |
| `--retries` | inteiro | `3` | Tentativas por consulta em HTTP 429 e 5xx |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** uma linha por estratégia com id, notas, LCP, TBT, CLS e auditorias
pendentes, mais o caminho do `history.db` e o comando para detalhar.

**JSON:** `{ url, project, database, session, measurements, budget }`. Cada
medição traz `id`, `strategy`, `scores`, `lab`, `failedAudits`, `samples`,
`sampleScores` e `rawFile`.

**Efeito persistente:** cria `.pagespeedfy/`, o `.gitignore` e o `history.db`
quando faltam. Grava os JSON brutos em `.pagespeedfy/reports/`.

**Falhas:** URL inválida ou privada devolve código 2. Chave ausente devolve 4.
Cota diária, HTTP 400 e 403 devolvem 5 ou 4, conforme o caso. Nota abaixo do
orçamento devolve 10.

**Exemplos:**

```bash
# 1. Medição completa, mobile e desktop
pagespeedfy run https://promovaweb.com/

# 2. Linha de base com três leituras
pagespeedfy run https://promovaweb.com/ --samples 3 --note "baseline"

# 3. Só mobile e só Performance, para iterar rápido
pagespeedfy run https://promovaweb.com/blog/ --strategy mobile --category performance

# 4. Orçamento de nota para o CI
pagespeedfy run https://promovaweb.com/ --fail-under performance=90,seo=95

# 5. Projeto fora do diretório atual, com JSON
pagespeedfy --json run https://preview.promovaweb.com/ --project /home/você/site
```

## `pagespeedfy history [url]`

Lê o histórico do projeto.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `[url]` | texto | nenhuma | Página cuja linha do tempo será mostrada |
| `-s`, `--strategy` | `mobile`, `desktop`, `all` | `all` | Estratégia exibida na linha do tempo |
| `--limit` | inteiro | `50` | Medições mais recentes exibidas |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** sem URL, as páginas com a última nota de mobile e desktop. Com URL,
uma tabela de medições da mais antiga para a mais nova, com data, estratégia,
notas, LCP, TBT, CLS, auditorias pendentes e a nota de cada execução.

**JSON:** `{ project, pages }` sem URL, `{ project, url, measurements }` com
URL.

**Falhas:** projeto sem `history.db` ou página sem medições devolve 6.

**Exemplos:**

```bash
# 1. Páginas medidas no projeto
pagespeedfy history

# 2. Linha do tempo da página
pagespeedfy history https://promovaweb.com/

# 3. Só desktop, dez medições
pagespeedfy history https://promovaweb.com/ --strategy desktop --limit 10

# 4. O histórico em JSON
pagespeedfy --json history https://promovaweb.com/

# 5. Outro projeto
pagespeedfy history --project /home/você/site
```

## `pagespeedfy report <ref>`

Mostra uma medição completa.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `<ref>` | texto | obrigatório | Id da medição ou URL da página |
| `-s`, `--strategy` | `mobile`, `desktop` | `mobile` | Estratégia usada quando `ref` é uma URL |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** Markdown com notas, métricas de laboratório, dados de campo,
auditorias pendentes com até cinco itens cada e verificações manuais.

**JSON:** a medição inteira, com os campos de identificação e o `run`
normalizado.

**Falhas:** id ou URL sem medição devolve 6.

**Exemplos:**

```bash
# 1. Pelo id
pagespeedfy report 12

# 2. Última medição mobile da página
pagespeedfy report https://promovaweb.com/

# 3. Última medição desktop
pagespeedfy report https://promovaweb.com/ --strategy desktop

# 4. Ids das auditorias pendentes
pagespeedfy --json report 12 | jq -r '.data.run.failedAudits[].id'

# 5. Outro projeto
pagespeedfy report 12 --project /home/você/site
```

## `pagespeedfy compare <before> [after]`

Compara duas medições da mesma página.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `<before>` | texto | obrigatório | Id ou URL |
| `[after]` | texto | escolhido pelo binário | Id ou URL. Sem ele, usa a medição anterior da mesma página e estratégia |
| `-s`, `--strategy` | `mobile`, `desktop` | `mobile` | Estratégia usada quando uma URL representa a última medição |
| `--fail-on-regression` | flag | desligada | Sai com código 10 quando uma nota caiu ou surgiu auditoria nova |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** as duas medições, tabela de notas, tabela de métricas e as listas de
auditorias resolvidas, novas e mantidas, com o resultado de regressão.

**JSON:** `{ url, strategy, sameUrl, sameStrategy, before, after, scores,
labMetrics, resolvedAudits, newAudits, remainingAudits, regression }`.

**Falhas:** referência inválida devolve 6. Regressão com a flag devolve 10.

**Exemplos:**

```bash
# 1. As duas últimas medições da página
pagespeedfy compare https://promovaweb.com/

# 2. Uma medição contra a anterior
pagespeedfy compare 12

# 3. Duas medições na ordem
pagespeedfy compare 12 15

# 4. Porta de CI contra regressão
pagespeedfy compare https://promovaweb.com/ --fail-on-regression

# 5. Só a diferença de Performance no desktop
pagespeedfy --json compare 12 15 --strategy desktop | jq '.data.scores.performance'
```

## `pagespeedfy import <path>`

Importa os `report.json` da 0.3.x para o histórico.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `<path>` | caminho | obrigatório | Pasta procurada de forma recursiva, ou um `report.json` |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** `Imported N measurement(s), skipped N already in the history, into
<projeto>.` e a lista de arquivos não importados, quando houver.

**JSON:** `{ imported, skipped, failed, project }`.

**Falhas:** pasta inexistente devolve 6. Falha de leitura devolve 7.

**Exemplos:**

```bash
# 1. Pasta padrão da 0.3.x
pagespeedfy import pagespeedfy-reports

# 2. Um report.json da 0.3.x
pagespeedfy import pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.json

# 3. A pasta da 0.3.x em outro projeto
pagespeedfy import pagespeedfy-reports --project /home/você/site
```

## `pagespeedfy forget <id>`

Remove uma medição do histórico.

| Argumento ou opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `<id>` | inteiro | obrigatório | Id mostrado por `run`, `history` e `report` |
| `-p`, `--project` | caminho | regra do projeto | Raiz que contém `.pagespeedfy/` |

**Saída:** `Removed measurement #12 (mobile, ...) of <url>.`

**JSON:** `{ removed }`, com o resumo da medição removida.

**Efeito persistente:** apaga a linha no `history.db`. O JSON bruto continua
em `.pagespeedfy/reports/`. Página sem medições sai da listagem.

**Falhas:** id inexistente devolve 6. Valor não numérico devolve 2.

**Exemplos:**

```bash
# 1. Remover uma medição errada
pagespeedfy forget 12

# 2. Conferir a remoção
pagespeedfy history https://promovaweb.com/

# 3. Remover em outro projeto
pagespeedfy forget 12 --project /home/você/site
```

## `pagespeedfy tui`

Abre a interface do terminal. Exige TTY.

| Opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `--tab` | `overview`, `about` | `tui.initialTab` | Aba inicial, sobrepondo a preferência |

**Falhas:** sem terminal interativo devolve 8.

**Exemplos:**

```bash
# 1. Abrir a TUI
pagespeedfy tui

# 2. Começar em About
pagespeedfy tui --tab about

# 3. Sem argumentos, o mesmo que o command tui
pagespeedfy
```

## `pagespeedfy credentials`

Gerencia o cofre cifrado em `~/.pagespeedfy/credentials.json`.

| Subcommand | Efeito |
| --- | --- |
| `set <name>` | Grava ou troca uma credencial. Lê sem eco ou do stdin com `--stdin` |
| `get <name>` | Mostra a credencial mascarada. `--reveal` mostra o valor |
| `list`, `ls` | Lista os nomes, nunca os valores |
| `remove <name>`, `rm` | Remove uma credencial |
| `status` | Mostra o arquivo, a cifra, a origem da chave mestra e a contagem |
| `clear` | Apaga o `credentials.json` e mantém o `master.key`. Pede confirmação no terminal |
| `rotate-key` | Re-cifra o cofre com uma chave mestra nova |

**Falhas:** cofre ilegível, chave mestra ausente ou credencial inexistente
devolve 4. Permissão negada devolve 7. Entrada cancelada devolve 130.

**Exemplos:**

```bash
# 1. Gravar a chave da API
pagespeedfy credentials set pagespeed.api_key

# 2. Ler de um gerenciador de senhas
op read "op://Promovaweb/PageSpeed/credential" | pagespeedfy credentials set pagespeed.api_key --stdin

# 3. Estado do cofre
pagespeedfy credentials status

# 4. Nomes gravados
pagespeedfy credentials list

# 5. Trocar a chave mestra
pagespeedfy credentials rotate-key
```

## `pagespeedfy config`

Lê e escreve preferências em `~/.pagespeedfy/settings.json`. Chaves usam ponto
para aninhar.

| Subcommand | Efeito |
| --- | --- |
| `list`, `ls` | Lista cada chave com o valor efetivo |
| `get <key>` | Mostra o valor de uma chave |
| `set <key> <value>` | Grava o valor, convertendo pelo esquema |
| `unset <key>`, `rm` | Remove a chave e volta ao padrão |
| `path` | Mostra a pasta de dados e os caminhos dos arquivos |
| `schema` | Lista as chaves conhecidas com tipo, padrão e descrição |

**Falhas:** `settings.json` inválido ou chave desconhecida devolve 3. Chave
inexistente devolve 6. Permissão negada devolve 7.

**Exemplos:**

```bash
# 1. Ver as preferências
pagespeedfy config list

# 2. Abrir a TUI em Overview
pagespeedfy config set tui.initialTab overview

# 3. Usar o tema claro
pagespeedfy config set tui.theme day

# 4. Ver os caminhos
pagespeedfy config path

# 5. Ver o esquema
pagespeedfy config schema
```

## `pagespeedfy mcp`

Inicia o servidor MCP por stdio.

| Opção | Tipo | Efeito |
| --- | --- | --- |
| `--list` | flag | Lista tools, resources e prompts e sai, sem iniciar o servidor |

**Falhas:** falha ao iniciar ou perda do transporte stdio devolve 9.

**Exemplos:**

```bash
# 1. Iniciar o servidor
pagespeedfy mcp

# 2. Ver o catálogo
pagespeedfy mcp --list

# 3. Catálogo em JSON
pagespeedfy mcp --list --json
```

## `pagespeedfy about`

Mostra versão, executável, runtime, plataforma e créditos.

**Exemplos:**

```bash
# 1. Identidade do binário
pagespeedfy about

# 2. Em JSON
pagespeedfy --json about
```

## `pagespeedfy doctor`

Confere runtime, terminal, preferências, origem da chave e leitura do cofre,
sem alterar arquivos.

**Saída:** uma linha por verificação, com `✓`, `!` ou `✗`.

**Falhas:** alguma verificação `✗` devolve 3.

**Exemplos:**

```bash
# 1. Diagnóstico completo
pagespeedfy doctor

# 2. Diagnóstico em JSON
pagespeedfy --json doctor
```

## `pagespeedfy skill [topic]`

Imprime a documentação embutida, inteira ou por tópico.

| Argumento | Tipo | Efeito |
| --- | --- | --- |
| `[topic]` | `cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference` | Imprime só aquele trecho |

**Exemplos:**

```bash
# 1. Documentação inteira
pagespeedfy skill

# 2. Só o trecho do MCP
pagespeedfy skill mcp

# 3. O mesmo pela opção global
pagespeedfy --skill cli
```

## `pagespeedfy completion <shell>`

Imprime um script de autocompletar.

| Argumento | Tipo | Efeito |
| --- | --- | --- |
| `<shell>` | `bash`, `zsh`, `fish` | Shell do script gerado |

**Exemplos:**

```bash
# 1. Bash na sessão atual
eval "$(pagespeedfy completion bash)"

# 2. Zsh na sessão atual
eval "$(pagespeedfy completion zsh)"

# 3. Fish na sessão atual
pagespeedfy completion fish | source
```
