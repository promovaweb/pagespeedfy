# Ler o relatório

## Abrir uma medição

```bash
pagespeedfy report 12
```

O argumento é o id da medição ou a URL da página. Com a URL, o comando mostra a
medição mais recente daquela página, em mobile por padrão:

```bash
pagespeedfy report https://promovaweb.com/ --strategy desktop
```

O comando imprime Markdown, com esta ordem:

1. a identificação da medição, com id, estratégia, data, versão e a nota
   registrada no `run`;
2. a nota de cada categoria;
3. as métricas de laboratório;
4. os dados de campo do CrUX, quando existem;
5. as auditorias pendentes, com orientação, itens e economia estimada;
6. as verificações manuais;
7. a contagem de auditorias aprovadas e o caminho do JSON bruto.

O `report` não consulta a API. Ele lê o `history.db` e monta o texto a partir da
medição gravada.

## O JSON de uma medição

Com `--json`, o envelope traz a medição inteira em `data`. Os campos de
identificação ficam no topo e o resultado normalizado fica em `data.run`:

```json
{
  "ok": true,
  "command": "report",
  "data": {
    "id": 12,
    "url": "https://promovaweb.com/",
    "strategy": "mobile",
    "measuredAt": "2026-11-16T13:30:12.000Z",
    "note": "lazy-load hero video",
    "samples": 3,
    "toolVersion": "1.0.0",
    "lighthouseVersion": "13.0.0",
    "scores": { "performance": 84, "accessibility": 96, "best-practices": 100, "seo": 100 },
    "lab": { "fcp": 1200, "lcp": 3100, "tbt": 180, "cls": 0.01, "si": 2400, "tti": 3600 },
    "failedAudits": 4,
    "run": {
      "formatVersion": 2,
      "strategy": "mobile",
      "requestedUrl": "https://promovaweb.com/",
      "finalUrl": "https://promovaweb.com/",
      "fetchTime": "2026-11-16T13:30:40.000Z",
      "lighthouseVersion": "13.0.0",
      "userAgent": "Mozilla/5.0 ...",
      "runWarnings": [],
      "runtimeError": null,
      "scores": { "performance": 84, "accessibility": 96, "best-practices": 100, "seo": 100 },
      "labMetrics": {
        "largest-contentful-paint": { "title": "Largest Contentful Paint", "displayValue": "3,1 s", "numericValue": 3100, "score": 0.72 }
      },
      "field": {
        "page": { "overallCategory": "AVERAGE", "metrics": { "LARGEST_CONTENTFUL_PAINT_MS": { "percentile": 2900, "category": "AVERAGE" } } },
        "origin": null
      },
      "failedAudits": [
        {
          "id": "image-delivery-insight",
          "categories": ["performance"],
          "group": "insights",
          "weight": 0,
          "title": "Melhorar a entrega de imagens",
          "description": "...",
          "score": 0.5,
          "scoreDisplayMode": "metricSavings",
          "displayValue": "Economia estimada de 180 KiB",
          "numericValue": null,
          "metricSavings": { "LCP": 300 },
          "detailsType": "table",
          "headings": [{ "key": "url", "label": "URL" }],
          "items": [{ "url": "https://promovaweb.com/cover.png", "wastedBytes": 184320, "node": { "selector": "main > img", "snippet": "<img ...>" } }],
          "totalItems": 1,
          "truncated": false
        }
      ],
      "manualAudits": [{ "id": "focus-traps", "category": "accessibility", "title": "..." }],
      "passedAuditIds": ["document-title", "image-alt"],
      "rawFile": "reports/promovaweb.com/home/20261116-103012/mobile-2.raw.json",
      "samples": 3,
      "sampleScores": [81, 84, 86]
    }
  }
}
```

Os campos do `run` têm estes usos:

| Campo | Conteúdo |
| --- | --- |
| `formatVersion` | Versão do formato normalizado. Hoje é 2 |
| `scores` | Nota de cada categoria de 0 a 100, ou `null` quando não foi pedida |
| `labMetrics` | FCP, LCP, TBT, CLS, Speed Index e TTI, com valor, texto e nota |
| `field.page` e `field.origin` | Dados de usuários reais do CrUX para a página e para a origem |
| `failedAudits` | Auditorias pendentes, ordenadas por impacto |
| `manualAudits` | Verificações que o Lighthouse não mede sozinho |
| `passedAuditIds` | Auditorias que passaram |
| `runWarnings` | Avisos que afetam a confiança na medição |
| `runtimeError` | Erro do Lighthouse durante a medição |
| `rawFile` | Caminho do JSON bruto, relativo a `.pagespeedfy/` |
| `samples` e `sampleScores` | Quantas leituras foram feitas e a nota de Performance de cada uma |

## Auditorias pendentes

Uma auditoria entra em `failedAudits` quando pertence a uma categoria
consultada, tem `scoreDisplayMode` igual a `binary`, `numeric` ou
`metricSavings` e nota menor que 0,9. As demais ficam no JSON bruto, fora das
listas.

Cada auditoria traz os campos que você precisa para agir:

- `weight`: o peso dela na nota da categoria;
- `score` e `displayValue`: o resultado e o texto do Lighthouse;
- `metricSavings`: quanto de LCP, FCP ou CLS ela pode economizar;
- `description`: a orientação do Lighthouse, já sem links;
- `items`: URLs, seletores, trechos de HTML e bytes economizáveis;
- `totalItems` e `truncated`: quantos itens existem e se alguns ficaram fora.

Para listar só os ids no terminal:

```bash
pagespeedfy --json report 12 | jq -r '.data.run.failedAudits[].id'
```

Para ver os itens de uma auditoria:

```bash
pagespeedfy --json report 12 | jq '.data.run.failedAudits[] | select(.id == "image-delivery-insight")'
```

## Dados de campo

Os blocos `field.page` e `field.origin` vêm do Chrome UX Report e resumem 28
dias de usuários reais. Eles só aparecem quando a página ou a origem tem
tráfego suficiente. Uma página nova mostra `No CrUX field data for this URL or
origin.` no texto e `null` nos dois blocos do JSON.

## O que versionar

O `report` não escreve nada. A medição já está no `history.db`. O JSON bruto
já está em `.pagespeedfy/reports/`. O `history.db` pode ir para o Git. A pasta
`reports/` é ignorada pelo `.pagespeedfy/.gitignore` criado pelo binário.

## Compatibilidade

Um campo novo pode entrar no formato normalizado sem mudar `formatVersion`.
Remover um campo ou mudar o tipo dele exige `formatVersion` novo e registro no
CHANGELOG.

A 0.3.x gravava `report.json` e `report.md` por pasta. Na 1.0, o relatório
normalizado fica no `history.db` e o Markdown é gerado na hora por `report`. O
command `import` lê os `report.json` da 0.3.x para trazer as medições antigas.
