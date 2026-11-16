# Histórico e comparação

Cada `pagespeedfy run` grava uma medição no `history.db` do projeto. O
histórico guarda a página, a estratégia, a data, a nota de cada categoria, as
métricas, a nota dada com `--note`, o número de leituras e o resultado
normalizado completo. A partir dele você lista páginas, lê a linha do tempo e
compara duas medições.

## Listar as páginas

```bash
pagespeedfy history
```

Sem URL, o comando lista as páginas medidas no projeto do diretório atual:

```text
https://promovaweb.com/
  6 measurement(s) · last 2026-11-16 13:30 · mobile 84 · desktop 96
https://promovaweb.com/blog/
  2 measurement(s) · last 2026-11-15 09:12 · mobile 78 · desktop 95
History: /home/você/site/.pagespeedfy/history.db
```

Cada linha traz a última nota de mobile e de desktop. Quando não existe
histórico, o comando informa o caminho procurado e o comando `run` para
começar.

## Ler a linha do tempo

```bash
pagespeedfy history https://promovaweb.com/
```

Com a URL, o comando mostra as medições da página, da mais antiga para a mais
nova, para a melhora aparecer de cima para baixo:

| # | Date | Strategy | Perf | A11y | BP | SEO | LCP | TBT | CLS | Failed | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-16 13:30 | mobile | 71 | 96 | 100 | 100 | 3.4 s | 210 ms | 0.010 | 6 | baseline |
| 2 | 2026-11-16 13:30 | desktop | 94 | 96 | 100 | 100 | 1.7 s | 40 ms | 0.002 | 3 | baseline |
| 3 | 2026-11-17 09:05 | mobile | 84 | 96 | 100 | 100 | 3.1 s | 180 ms | 0.010 | 4 | lazy-load hero video |

A tabela já vem em Markdown. O `--limit` controla quantas medições recentes
entram, 50 por padrão. O `--strategy` filtra mobile, desktop ou todas:

```bash
pagespeedfy history https://promovaweb.com/ --strategy desktop --limit 10
```

## Comparar duas medições

O `compare` aceita três formas.

**Uma URL** compara as duas últimas medições da página na estratégia pedida:

```bash
pagespeedfy compare https://promovaweb.com/
pagespeedfy compare https://promovaweb.com/ --strategy desktop
```

**Um id** compara aquela medição com a anterior da mesma página e estratégia:

```bash
pagespeedfy compare 12
```

**Dois ids ou URLs** compara na ordem dada, antes e depois:

```bash
pagespeedfy compare 12 15
```

A saída traz as duas medições, uma tabela de notas, uma tabela de métricas e
três listas:

```text
# Comparison: https://promovaweb.com/ (mobile)

Before: #1 · 2026-11-16T13:30:12.000Z · baseline
After: #3 · 2026-11-17T09:05:44.000Z · lazy-load hero video

| Category       | Before | After | Change |
| Performance    |     71 |    84 |    +13 |
| Accessibility  |     96 |    96 |      0 |

- Resolved (3): image-delivery-insight, render-blocking-resources, unused-javascript
- New (1): third-party-cookies
- Remaining (3): color-contrast, lcp-discovery-insight, use-landmarks

Result: regression (a score dropped or a new audit failed).
```

Uma nota que cai ou uma auditoria nova marcada como reprovada caracteriza
regressão. A comparação não altera o histórico.

## Falhar o build com nota baixa

O `run` aceita um orçamento de nota com `--fail-under`. Ele sai com código 10
quando alguma nota fica abaixo do mínimo:

```bash
pagespeedfy run https://promovaweb.com/ --fail-under performance=90,seo=95
```

Um número só vale para todas as categorias:

```bash
pagespeedfy run https://promovaweb.com/ --fail-under 90
```

O `compare` aceita `--fail-on-regression` para sair com código 10 quando uma
nota caiu ou surgiu auditoria nova:

```bash
pagespeedfy compare https://promovaweb.com/ --fail-on-regression
```

O código 10 é o mesmo para os dois casos e se chama BUDGET. Use os dois em
automação, como no passo abaixo.

## Exemplo no GitHub Actions

Guarde a chave em um secret chamado `PAGESPEEDFY_API_KEY`. O passo mede a
página depois do deploy e falha quando a nota fica abaixo do mínimo ou quando a
medição nova piora em relação à anterior.

```yaml
name: PageSpeed

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  budget:
    runs-on: ubuntu-latest
    env:
      PAGESPEEDFY_API_KEY: ${{ secrets.PAGESPEEDFY_API_KEY }}
    steps:
      - uses: actions/checkout@v4

      - name: Instalar o Pagespeedfy
        run: npm install -g @promovaweb/pagespeedfy

      - name: Medir e aplicar o orçamento
        run: pagespeedfy run https://promovaweb.com/ --samples 3 --note "deploy $GITHUB_SHA" --fail-under performance=90

      - name: Comparar com a medição anterior
        run: pagespeedfy compare https://promovaweb.com/ --fail-on-regression
```

O `--json` funciona em qualquer passo. Para ler a nota de Performance no
script:

```bash
pagespeedfy --json run https://promovaweb.com/ | jq '.data.measurements[0].scores.performance'
```

Em runner sem histórico, a primeira medição cria o `history.db`. Para comparar
com a produção, versione o `.pagespeedfy/history.db` no repositório ou restaure
o arquivo antes do passo.

## Importar medições da 0.3.x

A pasta `pagespeedfy-reports/` da 0.3.x pode entrar no histórico:

```bash
pagespeedfy import pagespeedfy-reports
```

O comando procura `report.json` de forma recursiva e grava cada medição. Rodar
duas vezes não duplica o que já foi importado. Medições ilegíveis são listadas
no fim, sem interromper as demais.

## Remover uma medição

```bash
pagespeedfy forget 12
```

Use quando a medição não vale, por exemplo um deploy quebrado ou uma URL
errada. O JSON bruto continua em `.pagespeedfy/reports/`. Uma página que fica
sem medições sai da listagem de `history`.

## Ler o histórico em JSON

O `--json` devolve o mesmo conteúdo em formato de máquina:

| Command | Campos principais |
| --- | --- |
| `history` | `project`, `pages` |
| `history <url>` | `project`, `url`, `measurements` |
| `compare` | `url`, `strategy`, `before`, `after`, `scores`, `labMetrics`, `resolvedAudits`, `newAudits`, `remainingAudits`, `regression` |
| `import` | `imported`, `skipped`, `failed`, `project` |
| `forget` | `removed` |

Para comparar a nota de Performance entre duas medições:

```bash
pagespeedfy --json compare 12 15 | jq '.data.scores.performance'
```
