# Como ler o relatório do Pagespeedfy

O Pagespeedfy guarda tudo no projeto, em `.pagespeedfy/`:

```text
.pagespeedfy/
├── .gitignore
├── history.db
└── reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/<estratégia>-<n>.raw.json
```

O `history.db` é a fonte de trabalho. Ele tem uma página por URL, uma medição
por execução e a auditoria de cada estratégia. As respostas brutas da API
ficam em `reports/`, um arquivo por leitura e por estratégia. Elas servem para
consultar um campo que a normalização resumiu.

A leitura acontece pelos comandos do CLI, com `--json` quando o agente precisa
do dado estruturado:

| Comando | Devolve |
| --- | --- |
| `pagespeedfy report <ref> --json` | a medição completa, com as notas, as métricas e cada auditoria reprovada |
| `pagespeedfy history <url> --json` | a linha do tempo da página, da mais antiga para a mais nova |
| `pagespeedfy compare <ref> [ref] --json` | a diferença entre duas medições |
| `pagespeedfy run <url>` | a medição nova, com o id de cada estratégia |

`<ref>` é o id da medição (`12`) ou a URL da página. Com URL, o `report`
devolve a última medição da estratégia pedida, mobile por padrão.

## O envelope

Todo `--json` devolve `{ ok, command, data }` no sucesso e
`{ ok, command, error }` no erro. Erros também saem em JSON, com `code`,
`message` e a família do exit code. Leia `ok` antes de qualquer outro campo.

## Campos da medição

`report --json` devolve em `data`:

| Campo | Conteúdo |
| --- | --- |
| `id` | Id da medição, usado em `report`, `compare` e `forget` |
| `pageId` | Id da página no histórico |
| `url` | URL medida |
| `session` | Pasta da execução, no formato `AAAAMMDD-HHMMSS` |
| `strategy` | `mobile` ou `desktop` |
| `measuredAt` | Data ISO da medição |
| `note` | Texto do `--note`, ou `null` |
| `samples` | Quantas leituras geraram a medição |
| `toolVersion` | Versão do Pagespeedfy |
| `lighthouseVersion` | Versão do Lighthouse usada pelo Google |
| `scores` | Nota de 0 a 100 por categoria, ou `null` quando a categoria não tem nota |
| `lab` | LCP, TBT, CLS, FCP, SI e TTI em número |
| `failedAudits` | Quantidade de auditorias reprovadas |
| `run` | A leitura completa, descrita abaixo |

## Campos de `run`

| Campo | Como usar |
| --- | --- |
| `requestedUrl` e `finalUrl` | URL pedida e URL após redirecionamentos. Quando forem diferentes, há redirect a corrigir |
| `fetchTime` | Data da consulta no formato da API |
| `runtimeError` | Mensagem de falha do Lighthouse. Preenchido significa medição inválida |
| `runWarnings` | Avisos que reduzem a confiança na medição |
| `scores` | Notas por categoria |
| `labMetrics` | FCP, LCP, TBT, CLS, SI e TTI, cada um com `numericValue` em ms (CLS sem unidade), `displayValue` e `score` |
| `field.page` | CrUX da URL: p75 de LCP, CLS, INP, FCP e TTFB de usuários reais nos últimos 28 dias |
| `field.origin` | CrUX do domínio inteiro. Usado quando a página não tem tráfego suficiente |
| `failedAudits` | Auditorias reprovadas, já ordenadas por peso, economia e nota |
| `manualAudits` | Verificações que o Lighthouse não automatiza |
| `passedAuditIds` | IDs aprovados. Útil para confirmar que uma correção não quebrou outra |
| `rawFile` | JSON bruto da estratégia, relativo a `.pagespeedfy/` |
| `samples` e `sampleScores` | Quantas leituras foram feitas e a nota de performance de cada uma |

`field` é sempre um objeto. Quando `field.page` e `field.origin` são `null`, o
CrUX não tem dados da página nem do domínio. Nesse caso, trabalhe só com
laboratório.

## Campos de cada `failedAudits[]`

| Campo | Como usar |
| --- | --- |
| `id` | Chave para `astro-correcoes.md` |
| `categories` | Categorias afetadas pela auditoria |
| `group` | Grupo do Lighthouse (`insights`, `diagnostics`, `a11y-*`, `seo-*`) |
| `weight` | Peso na nota. Auditorias de Performance costumam ter peso 0 e agir pelas métricas |
| `score` | Nota de 0 a 1, ou `null` quando não há nota numérica |
| `displayValue` | Resumo do Lighthouse, como "Economia estimada de 600 ms" |
| `metricSavings` | Ganho estimado por métrica (`LCP`, `FCP`, `TBT`, `CLS`, `INP`) |
| `description` | Orientação do Lighthouse no idioma pedido |
| `headings` | Colunas dos itens, com rótulo legível |
| `items` | Detalhes: URLs, seletores, trechos de HTML, bytes e ms evitáveis |
| `totalItems` e `truncated` | Quando `truncated` é `true`, o restante está no `rawFile` |

## Itens de detalhe

Os formatos mais comuns:

- **Elemento**: `node.selector`, `node.snippet` e `node.nodeLabel`. Procure a
  classe ou o texto no código-fonte.
- **Recurso**: `url`, `totalBytes`, `wastedBytes` e `wastedMs`. Recursos em
  `/_astro/` saem do build; o nome antes do hash aponta para o arquivo de
  origem.
- **Terceiros**: `entity` e `url` de outro domínio.
- **Sub-itens**: `subItems.items` detalha um item, por exemplo os scripts de
  uma mesma origem.

## Ler o JSON bruto

O `rawFile` da medição indica o caminho. Para uma auditoria truncada, na raiz
do projeto:

```bash
jq '.lighthouseResult.audits["<id>"].details' ".pagespeedfy/$(jq -r '.data.run.rawFile' <arquivo-da-medição>)"
```

Com o caminho já conhecido, o comando fica direto:

```bash
jq '.lighthouseResult.audits["image-delivery-insight"].details' \
  .pagespeedfy/reports/exemplo.com/home/20261105-094934/mobile-1.raw.json
```

Para ver o elemento de LCP:

```bash
jq '.lighthouseResult.audits["largest-contentful-paint-element"].details' \
  .pagespeedfy/reports/exemplo.com/home/20261105-094934/mobile-1.raw.json
```

## Histórico e comparação

`history <url> --json` devolve `data.url` e `data.measurements`, com uma
entrada resumida por medição: `id`, `strategy`, `measuredAt`, `note`, `samples`,
`scores`, `lab` e `failedAudits`. Sem URL, devolve `data.pages`, cada página com
a contagem de medições, a data da última e a nota mais recente por estratégia.

`compare --json` devolve `data.before` e `data.after` (com `id`, `measuredAt`,
`note` e `samples`), `data.scores` e `data.labMetrics` com `before`, `after` e
`delta`, as listas `resolvedAudits`, `newAudits` e `remainingAudits` e o
booleano `regression`.

`sameUrl` e `sameStrategy` avisam quando as duas medições não são comparáveis.

## Laboratório e campo

As notas e `labMetrics` vêm de uma execução simulada e variam alguns pontos
entre medições. Os dados de `field` refletem usuários reais e mudam devagar.
Uma correção boa aparece primeiro no laboratório. O campo confirma semanas
depois.
