# Primeira medição

## Medir

Na raiz do projeto, rode:

```bash
pagespeedfy run https://promovaweb.com/ --note "baseline"
```

O comando consulta mobile e desktop em paralelo, com 20 a 90 segundos por
consulta. O progresso vai para o stderr e o resumo para o stdout:

```text
Measuring mobile: https://promovaweb.com/
Measuring desktop: https://promovaweb.com/
mobile  #1  perf 71 · a11y 96 · bp 100 · seo 100  LCP 3.4 s · TBT 210 ms · CLS 0.010 · 6 failed audits
desktop #2  perf 94 · a11y 96 · bp 100 · seo 100  LCP 1.7 s · TBT 40 ms · CLS 0.002 · 3 failed audits
History: /home/você/site/.pagespeedfy/history.db
Details: pagespeedfy report 1 · Timeline: pagespeedfy history https://promovaweb.com/
```

A nota entre parênteses é o identificador da medição no histórico. Use esse
número em `report`, `compare` e `forget`.

## O que ficou no projeto

```text
<projeto>/.pagespeedfy/
├── history.db
├── .gitignore
└── reports/
    └── promovaweb.com/
        └── home/
            └── 20261116-103012/
                ├── mobile-1.raw.json
                └── desktop-1.raw.json
```

O binário cria `.pagespeedfy/.gitignore` na primeira execução. Ele ignora a
pasta `reports/` e os arquivos temporários do SQLite (`*.db-wal`, `*.db-shm`,
`*.bak`).

## O que versionar

| Arquivo | Versionar | Por quê |
| --- | --- | --- |
| `.pagespeedfy/history.db` | Sim | O time compartilha a linha do tempo e compara com a mesma base |
| `.pagespeedfy/reports/` | Não | Os JSON brutos são grandes e trazem HTML da página |
| `.pagespeedfy/.gitignore` | Sim | Mantém a regra de ignore junto do histórico |

O histórico é binário. Evite dois commits ao mesmo tempo no mesmo arquivo,
porque o Git não faz merge de SQLite.

## Medir com três leituras

O Lighthouse simula rede e CPU, por isso duas medições seguidas podem diferir
alguns pontos. A opção `--samples` faz N leituras por estratégia e grava a
mediana pela nota de Performance:

```bash
pagespeedfy run https://promovaweb.com/ --samples 3 --note "lazy-load hero video"
```

O resumo marca `median of 3`. As notas de cada leitura aparecem em dois
lugares: no campo `sampleScores` do `--json` e no cabeçalho do `report`. Use 3
leituras na linha de base e depois de cada mudança que for comparar.

## Ler a medição

```bash
pagespeedfy report 1
```

O comando imprime o relatório em Markdown, com notas, métricas de laboratório,
dados de campo e auditorias pendentes. Para ver a linha do tempo da página:

```bash
pagespeedfy history https://promovaweb.com/
```

## Quem vem da 0.3.x

A 0.3.x gravava as pastas em `pagespeedfy-reports/`, com `report.json` e
`report.md`. Também aceitava `--output` e `--print path`. Na 1.0, a pasta
dentro do projeto é fixa em `.pagespeedfy/`, o relatório fica no banco e o caminho do
histórico aparece no fim de cada `run`. Para trazer as medições antigas:

```bash
pagespeedfy import pagespeedfy-reports
```

Os detalhes estão em [Histórico e comparação](06-historico-e-comparacao.md).
