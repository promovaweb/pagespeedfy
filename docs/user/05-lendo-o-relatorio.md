# Ler o relatório

Cada `pagespeedfy run` cria uma pasta própria. Nada é sobrescrito: duas
medições da mesma página ficam lado a lado e podem ser comparadas com
`pagespeedfy compare`. Se duas execuções começarem no mesmo segundo, a
segunda pasta recebe o sufixo `-2`.

## Pasta de saída

```text
<output>/<host>/<rota>/<AAAAMMDD-HHMMSS>/
├── mobile.raw.json
├── desktop.raw.json
├── report.json
└── report.md
```

| Parte | Regra |
| --- | --- |
| `<output>` | `--output`, padrão `pagespeedfy-reports` no diretório atual |
| `<host>` | Host da URL; `:` da porta vira `_` |
| `<rota>` | Segmentos do caminho unidos por `--`, sem acentos; `/` vira `home`; query string vira sufixo `--q-...` |
| `<AAAAMMDD-HHMMSS>` | Data e hora locais do início da execução |

## Arquivos

- **`<estratégia>.raw.json`**: resposta da API sem nenhuma alteração. Contém o
  `lighthouseResult` completo, incluindo auditorias aprovadas, telas de
  carregamento em base64 e o mapa de entidades.
- **`report.json`**: relatório normalizado, descrito abaixo.
- **`report.md`**: o mesmo relatório em Markdown, com até cinco itens por
  auditoria. Pode ser gerado de novo com `pagespeedfy report`.

## `report.json` (formatVersion 1)

```json
{
  "formatVersion": 1,
  "tool": "pagespeedfy",
  "toolVersion": "0.2.0",
  "generatedAt": "2026-11-05T13:30:12.000Z",
  "url": "https://promovaweb.com/",
  "locale": "pt-BR",
  "categories": ["performance", "accessibility", "best-practices", "seo"],
  "maxItems": 50,
  "runs": [
    {
      "strategy": "mobile",
      "requestedUrl": "https://promovaweb.com/",
      "finalUrl": "https://promovaweb.com/",
      "fetchTime": "2026-11-05T13:30:40.000Z",
      "lighthouseVersion": "13.0.0",
      "userAgent": "Mozilla/5.0 ...",
      "runWarnings": [],
      "runtimeError": null,
      "scores": { "performance": 71, "accessibility": 96, "best-practices": 100, "seo": 100 },
      "labMetrics": {
        "largest-contentful-paint": { "title": "Largest Contentful Paint", "displayValue": "3,4 s", "numericValue": 3412, "score": 0.66 }
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
      "rawFile": "mobile.raw.json"
    }
  ]
}
```

## Regras da normalização

- **Notas:** `score` da categoria multiplicado por 100 e arredondado.
  Categoria sem nota fica `null`.
- **Métricas de laboratório:** FCP, LCP, TBT, CLS, Speed Index e TTI. Elas
  ficam fora de `failedAudits` mesmo quando reprovadas.
- **Auditoria reprovada:** pertence a uma categoria consultada, tem
  `scoreDisplayMode` igual a `binary`, `numeric` ou `metricSavings` e nota
  menor que 0,9 (ou nula).
- **Ignoradas:** `notApplicable`, `informative` e `error` não entram em
  nenhuma lista. Continuam no JSON bruto.
- **Manuais:** `scoreDisplayMode` igual a `manual` vai para `manualAudits`.
- **Ordem:** peso na categoria (maior primeiro), soma de `metricSavings`
  (maior primeiro), nota (menor primeiro) e ID.
- **Itens:** os primeiros `maxItems`, sem as chaves internas `boundingRect`,
  `lhId` e `path`. `totalItems` guarda a contagem original.
- **Dados de campo:** `loadingExperience` vira `field.page` e
  `originLoadingExperience` vira `field.origin`. Bloco sem métricas vira
  `null`.

## Compatibilidade

Um campo novo pode entrar em `report.json` sem mudar `formatVersion`. Remover
um campo ou mudar o tipo dele exige `formatVersion` novo e registro no
CHANGELOG.
