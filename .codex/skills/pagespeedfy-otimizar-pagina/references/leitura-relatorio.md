# Como ler o relatório do Pagespeedfy

O comando `pagespeedfy run` grava uma pasta por execução:

```text
.pagespeedfy/reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/
├── mobile.raw.json    resposta completa da API para mobile
├── desktop.raw.json   resposta completa da API para desktop
├── report.json        relatório normalizado (formatVersion 1)
└── report.md          resumo legível do report.json
```

O `report.json` é a fonte de trabalho. O `report.md` mostra no máximo cinco
itens por auditoria. Os arquivos `*.raw.json` guardam tudo o que a API
devolveu e servem para consultar um campo que a normalização resumiu.

## Campos da raiz

| Campo | Conteúdo |
| --- | --- |
| `formatVersion` | Versão do formato. Hoje é `1` |
| `toolVersion` | Versão do Pagespeedfy que gerou o arquivo |
| `generatedAt` | Data ISO da execução |
| `url` | URL consultada |
| `locale` | Idioma dos textos das auditorias |
| `categories` | Categorias consultadas |
| `maxItems` | Limite de itens de detalhe por auditoria |
| `runs` | Uma entrada por estratégia (`mobile`, `desktop`) |

## Campos de cada `runs[]`

| Campo | Como usar |
| --- | --- |
| `strategy` | `mobile` simula um Moto G em rede 4G lenta; `desktop` simula conexão cabeada |
| `finalUrl` | URL após redirecionamentos. Se for diferente da pedida, há redirect a corrigir |
| `runtimeError` | Mensagem de falha do Lighthouse. Preenchido significa medição inválida |
| `runWarnings` | Avisos que reduzem a confiança na medição |
| `scores` | Notas de 0 a 100 por categoria |
| `labMetrics` | FCP, LCP, TBT, CLS, Speed Index e TTI em laboratório, com `numericValue` em ms (CLS sem unidade) |
| `field.page` | CrUX da URL: p75 de LCP, CLS, INP, FCP e TTFB de usuários reais nos últimos 28 dias |
| `field.origin` | CrUX do domínio inteiro. Usado quando a página não tem tráfego suficiente |
| `failedAudits` | Auditorias reprovadas, já ordenadas por peso, economia e nota |
| `manualAudits` | Verificações que o Lighthouse não automatiza |
| `passedAuditIds` | IDs aprovados. Útil para confirmar que uma correção não quebrou outra |
| `rawFile` | Nome do JSON bruto da estratégia, na mesma pasta |

`field` com valor `null` indica que o CrUX não tem dados. Nesse caso, trabalhe
só com laboratório.

## Campos de cada `failedAudits[]`

| Campo | Como usar |
| --- | --- |
| `id` | Chave para `astro-correcoes.md` |
| `categories` | Categorias afetadas pela auditoria |
| `group` | Grupo do Lighthouse (`insights`, `diagnostics`, `a11y-*`, `seo-*`) |
| `weight` | Peso na nota. Auditorias de Performance costumam ter peso 0 e agir pelas métricas |
| `score` | Nota de 0 a 1 |
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

Para uma auditoria truncada:

```bash
node -e 'const r=require("./mobile.raw.json");console.log(JSON.stringify(r.lighthouseResult.audits["<id>"].details,null,2))'
```

Para ver o elemento de LCP:

```bash
node -e 'const r=require("./mobile.raw.json");console.log(JSON.stringify(r.lighthouseResult.audits["largest-contentful-paint-element"]?.details,null,2))'
```

## Laboratório e campo

As notas e `labMetrics` vêm de uma única execução simulada e variam alguns
pontos entre medições. Os dados de `field` refletem usuários reais e mudam
devagar. Uma correção boa aparece primeiro no laboratório. O campo confirma
semanas depois.
