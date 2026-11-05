# Referência do CLI

Esta referência cobre todos os comandos do `pagespeedfy` a partir da versão 0.1.0. A
fonte é `src/cli.ts`. O teste `tests/docs.test.ts` confere que cada comando
implementado tem uma seção aqui, com pelo menos cinco exemplos.

## Opções globais

| Opção | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `--json` | flag | desligada | Imprime a saída em JSON, para scripts e agentes |
| `-V`, `--version` | flag | | Imprime a versão |
| `-h`, `--help` | flag | | Mostra a ajuda do comando |

`--json` vem antes do comando: `pagespeedfy --json auth status`.

## Códigos de saída

| Código | Significado |
| --- | --- |
| `0` | Sucesso |
| `1` | Falha de operação: sem chave, API recusou, arquivo inválido |
| `2` | Uso incorreto: URL inválida ou local, opção com valor inválido |

## Precedência da API key

1. Variável `PAGESPEEDFY_API_KEY`.
2. Arquivo `~/.pagespeedfy/credentials` (ou `$PAGESPEEDFY_HOME/credentials`).

Sem nenhuma das duas, os comandos que consultam a API falham com código `1`.

## `pagespeedfy auth login`

Grava a API key do PageSpeed Insights em `~/.pagespeedfy/credentials`.

| Opção | Tipo | Obrigatória | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `--stdin` | flag | não | desligada | Lê a chave do stdin em vez de perguntar |
| `--validar` | flag | não | desligada | Consulta `https://example.com/` (mobile, SEO) com a chave antes de gravar |

**Saída:** linha com a chave mascarada e o caminho. Com `--json`:
`{ path, apiKey, validated, updatedAt }`.

**Efeito persistente:** cria `~/.pagespeedfy/` com permissão `0700` e grava
`credentials` com `0600`, de forma atômica. Ao regravar, preserva `createdAt`.

**Permissões:** escrita na pasta pessoal. Nenhuma alteração no projeto.

**Recusas:** sem terminal interativo e sem `--stdin` (código 2); chave vazia
(código 2); com `--validar`, chave recusada pela API (código 1, nada é
gravado).

**Limites:** uma chave por máquina. A chave fora do formato `AIza` + 35
caracteres gera aviso, mas é gravada.

**Exemplos:**

```bash
# 1. Pergunta a chave no terminal, sem eco
pagespeedfy auth login

# 2. Valida a chave com uma consulta real antes de gravar
pagespeedfy auth login --validar

# 3. Lê a chave de um gerenciador de senhas
op read "op://Promovaweb/PageSpeed/credential" | pagespeedfy auth login --stdin

# 4. Grava em outra pasta base, para CI ou testes
PAGESPEEDFY_HOME=/tmp/psf pagespeedfy auth login --stdin < chave.txt

# 5. Saída em JSON para um script de setup
pagespeedfy --json auth login --stdin < chave.txt
```

## `pagespeedfy auth status`

Mostra qual chave será usada e de onde ela vem.

Sem opções próprias.

**Saída:** caminho do arquivo, chave mascarada do arquivo e da variável e a
origem em uso. Com `--json`: `{ path, file, env, active }`. O campo `active` vale
`"env"`, `"arquivo"` ou `null`.

**Efeito persistente:** nenhum.

**Recusas:** arquivo corrompido (código 1). Sem chave configurada, imprime a
orientação e sai com código 1.

**Limites:** não testa a chave na API. Use `auth login --validar` para isso.

**Exemplos:**

```bash
# 1. Conferência rápida
pagespeedfy auth status

# 2. Uso em script: falha se não houver chave
pagespeedfy auth status > /dev/null || echo "configure a chave"

# 3. Origem em JSON
pagespeedfy --json auth status | jq -r .active

# 4. Confirma que a variável tem prioridade
PAGESPEEDFY_API_KEY=AIza... pagespeedfy auth status

# 5. Inspeciona outra pasta base
PAGESPEEDFY_HOME=/tmp/psf pagespeedfy auth status
```

## `pagespeedfy auth logout`

Remove o arquivo de credencial.

Sem opções próprias.

**Saída:** `Removido: <caminho>.` ou `Nenhuma credencial gravada.` Com
`--json`: `{ path, removed }`.

**Efeito persistente:** apaga `~/.pagespeedfy/credentials`. A pasta e os
relatórios ficam.

**Recusas:** nenhuma; sem arquivo, sai com código 0.

**Limites:** não altera `PAGESPEEDFY_API_KEY` e não revoga a chave no Google
Cloud.

**Exemplos:**

```bash
# 1. Remove a chave da máquina
pagespeedfy auth logout

# 2. Troca de chave
pagespeedfy auth logout && pagespeedfy auth login

# 3. Resultado em JSON
pagespeedfy --json auth logout

# 4. Limpeza de pasta de teste
PAGESPEEDFY_HOME=/tmp/psf pagespeedfy auth logout

# 5. Confirma a remoção
pagespeedfy auth logout && pagespeedfy auth status
```

## `pagespeedfy run <url>`

Consulta o PageSpeed Insights para **uma** página e salva o relatório.

| Argumento ou opção | Tipo | Obrigatório | Padrão | Efeito |
| --- | --- | --- | --- | --- |
| `<url>` | texto | sim | | URL pública e completa, `http` ou `https` |
| `-s`, `--strategy` | `mobile`, `desktop`, `all` | não | `all` | Estratégias consultadas, em sequência |
| `-c`, `--category` | lista | não | as quatro | `performance`, `accessibility`, `best-practices`, `seo`. Repita a opção ou separe por vírgula |
| `-l`, `--locale` | texto | não | `pt-BR` | Idioma dos títulos e descrições das auditorias |
| `-o`, `--output` | caminho | não | `pagespeedfy-reports` | Pasta base dos relatórios, relativa ao diretório atual |
| `--max-items` | inteiro > 0 | não | `50` | Itens de detalhe preservados por auditoria no `report.json` |
| `--timeout` | segundos inteiros > 0 | não | `180` | Tempo máximo de cada consulta |
| `--retries` | inteiro > 0 | não | `3` | Tentativas por estratégia em HTTP 429 e 5xx |
| `--print` | `summary`, `markdown`, `path` | não | `summary` | O que imprimir ao fim |

**Saída:** com `summary`, uma linha de notas por estratégia e os caminhos do
`report.json` e do `report.md`. Com `markdown`, o relatório inteiro. Com
`path`, só o caminho absoluto do `report.json`. Com `--json`:
`{ dir, report, markdown, runs: [{ strategy, scores, failedAudits }] }`. O
progresso vai para o stderr.

**Efeito persistente:** cria
`<output>/<host>/<rota>/<AAAAMMDD-HHMMSS>/` com `<estratégia>.raw.json`,
`report.json` e `report.md`. A rota `/` vira `home`; `/blog/post/` vira
`blog--post`. Detalhes em [Ler o relatório](05-lendo-o-relatorio.md).

**Permissões:** leitura da chave; escrita na pasta de saída; acesso HTTPS a
`www.googleapis.com`.

**Recusas:**

- URL sem protocolo, com protocolo diferente de http/https, `localhost`, IP
  privado (`10.*`, `172.16-31.*`, `192.168.*`, `127.*`) ou `.local`: código 2.
- Sem API key: código 1.
- HTTP 400 (URL inacessível para o Google) e 403 (chave recusada ou API
  desativada): código 1, sem nova tentativa.
- HTTP 429 de cota diária esgotada: código 1, sem nova tentativa.
- 429 por minuto, 5xx e tempo esgotado: repete com espera de 2 s, 4 s e
  assim por diante, e falha após `--retries` tentativas.

**Limites:** uma URL por execução. A API pode levar de 20 a 90 segundos por
estratégia. A chave nunca aparece em mensagens: o CLI troca o valor por `***`.

**Exemplos:**

```bash
# 1. Medição completa, mobile e desktop
pagespeedfy run https://promovaweb.com/

# 2. Só mobile e só Performance, para iterar rápido
pagespeedfy run https://promovaweb.com/blog/ -s mobile -c performance

# 3. Acessibilidade e SEO em inglês
pagespeedfy run https://promovaweb.com/planos/ -c accessibility,seo -l en

# 4. Caminho do report.json para encadear com outro comando
REPORT=$(pagespeedfy run https://promovaweb.com/ --print path)

# 5. Pasta própria, mais itens por auditoria e JSON de resumo
pagespeedfy --json run https://preview.promovaweb.com/ -o relatorios --max-items 200
```

## `pagespeedfy report <caminho>`

Reimprime um relatório salvo.

| Argumento | Tipo | Obrigatório | Efeito |
| --- | --- | --- | --- |
| `<caminho>` | caminho | sim | Pasta da execução ou arquivo `report.json` |

**Saída:** o Markdown do relatório, gerado de novo a partir do `report.json`.
Com `--json`, o `report.json` inteiro.

**Efeito persistente:** nenhum.

**Recusas:** caminho sem `report.json` ou JSON que não foi gerado pelo
Pagespeedfy (código 1).

**Limites:** não consulta a API. Mostra até cinco itens por auditoria no
Markdown.

**Exemplos:**

```bash
# 1. Pela pasta da execução
pagespeedfy report pagespeedfy-reports/promovaweb.com/home/20261105-103012

# 2. Pelo arquivo
pagespeedfy report pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.json

# 3. Lista os IDs reprovados no mobile
pagespeedfy --json report "$REPORT" | jq -r '.runs[] | select(.strategy=="mobile") | .failedAudits[].id'

# 4. Salva o Markdown em outro lugar
pagespeedfy report "$REPORT" > auditoria-home.md

# 5. Última execução de uma rota
pagespeedfy report "$(ls -d pagespeedfy-reports/promovaweb.com/blog/* | tail -1)"
```

## `pagespeedfy compare <antes> <depois>`

Compara duas execuções da mesma página.

| Argumento | Tipo | Obrigatório | Efeito |
| --- | --- | --- | --- |
| `<antes>` | caminho | sim | Pasta ou `report.json` da execução anterior |
| `<depois>` | caminho | sim | Pasta ou `report.json` da execução posterior |

**Saída:** por estratégia comum aos dois relatórios, tabela de notas e de
métricas de laboratório com a diferença e três listas: auditorias resolvidas,
novas e mantidas. Com `--json`:
`{ before, after, sameUrl, strategies: [{ strategy, scores, labMetrics, resolvedAudits, newAudits, remainingAudits }] }`.

**Efeito persistente:** nenhum.

**Recusas:** qualquer dos caminhos inválido (código 1).

**Limites:** URLs diferentes geram aviso, não erro, para permitir comparar
produção com preview. Estratégias presentes em só um relatório ficam de fora.

**Exemplos:**

```bash
# 1. Antes e depois de uma correção
pagespeedfy compare pagespeedfy-reports/promovaweb.com/home/20261105-103012 \
  pagespeedfy-reports/promovaweb.com/home/20261106-091544

# 2. Produção contra preview
pagespeedfy compare "$REPORT_PRODUCAO" "$REPORT_PREVIEW"

# 3. Só a diferença de Performance no mobile
pagespeedfy --json compare "$A" "$B" | jq '.strategies[] | select(.strategy=="mobile") | .scores.performance'

# 4. Falha num script de CI quando surgem auditorias novas
test "$(pagespeedfy --json compare "$A" "$B" | jq '[.strategies[].newAudits[]] | length')" -eq 0

# 5. As duas últimas execuções de uma rota
set -- $(ls -d pagespeedfy-reports/promovaweb.com/home/* | tail -2)
pagespeedfy compare "$1" "$2"
```
