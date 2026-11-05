# Primeira medição

## Medir

Na pasta do projeto Astro:

```bash
pagespeedfy run https://promovaweb.com/
```

O CLI consulta mobile e depois desktop. Cada consulta leva de 20 a 90
segundos. O progresso aparece no stderr:

```text
Consultando mobile: https://promovaweb.com/
Consultando desktop: https://promovaweb.com/
mobile: performance 71 · accessibility 96 · best-practices 100 · seo 100 · 6 auditorias pendentes
desktop: performance 94 · accessibility 96 · best-practices 100 · seo 100 · 3 auditorias pendentes
Relatório: .pagespeedfy/reports/promovaweb.com/home/20261105-103012/report.json
Resumo: .pagespeedfy/reports/promovaweb.com/home/20261105-103012/report.md
```

## Ler o resumo

```bash
pagespeedfy report .pagespeedfy/reports/promovaweb.com/home/20261105-103012
```

O resumo mostra, por estratégia:

1. a nota de cada categoria;
2. as métricas de laboratório (LCP, CLS, TBT e outras);
3. os dados de campo do CrUX, quando existem;
4. as auditorias reprovadas, com a orientação do Lighthouse e os primeiros
   itens (URLs, seletores, economia estimada);
5. as verificações manuais.

## Medir mais rápido enquanto ajusta

Para repetir só o que interessa:

```bash
pagespeedfy run https://promovaweb.com/ -s mobile -c performance
```

## Comparar

Depois de publicar uma mudança, meça de novo e compare as duas pastas:

```bash
pagespeedfy compare \
  .pagespeedfy/reports/promovaweb.com/home/20261105-103012 \
  .pagespeedfy/reports/promovaweb.com/home/20261106-091544
```

A comparação mostra a diferença de notas e métricas e lista as auditorias
resolvidas, as novas e as que continuam.

## Variação entre medições

O Lighthouse simula rede e CPU, e duas medições seguidas podem diferir alguns
pontos em Performance. Olhe as métricas e a lista de auditorias resolvidas
antes de concluir que uma mudança funcionou. Os dados de campo refletem 28
dias de usuários reais e só mostram o efeito semanas depois.
