# Modelo do plano de correções

Grave o plano em `plano.md`, na pasta da medição aberta por `rawFile`, dentro
de `.pagespeedfy/reports/`. Mostre o conteúdo completo no chat antes de pedir
autorização.

````markdown
# Plano de correções: <url>

- Medição: mobile #12 e desktop #13, de <AAAA-MM-DD HH:MM> (`<projeto>/.pagespeedfy/history.db`)
- Pasta da medição: `<projeto>/.pagespeedfy/reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/`
- Medições anteriores lidas: <quantidade e datas, ou "nenhuma">
- Rota no projeto: `<src/pages/...>`
- Layout e componentes envolvidos: `<arquivos>`

## Situação atual

| Estratégia | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile | 71 | 96 | 100 | 100 | 3,4 s | 0,020 | 380 ms |
| Desktop | 94 | 96 | 100 | 100 | 1,1 s | 0,010 | 40 ms |

Dados de campo (CrUX): <resumo ou "sem dados">.
Histórico: <auditorias recorrentes, resolvidas ou novas desde a medição anterior>.
Comparação: <resultado de `pagespeedfy compare <url>` ou "primeira medição">.

## Correções propostas

| # | Auditoria | Estratégias | Escopo | Arquivo | Correção proposta | Efeito esperado | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `image-delivery-insight` | mobile, desktop | Página | `src/pages/index.astro` | Trocar `<img>` da capa por `<Image>` com `widths` e `sizes` | LCP −300 ms, −180 KiB | pendente |
| 2 | `color-contrast` | mobile, desktop | Componente | `src/components/Hero.astro` | Usar o token `--text-muted-strong` no subtítulo | Acessibilidade +4 | pendente |
| 3 | `cache-insight` | mobile | Fora do código | Hospedagem | `Cache-Control: immutable` para `/_astro/*` | Visitas repetidas mais rápidas | fora do código |

Detalhe de cada linha, com os itens do relatório que justificam a correção:

### 1. `image-delivery-insight`

- Itens: `https://.../cover.png` (184 KiB evitáveis), seletor `main > img.cover`.
- Mudança: <antes e depois resumidos>.

## Componentes compartilhados

<componente> também aparece em: <rotas>.

## Pendências sem correção

- <auditoria>: <motivo>.

## Verificações manuais

- `<id>`: <título>.

## Autorização

- Status: aguardando autorização.
- Data:
- Linhas autorizadas:
- Ajustes pedidos:
````

Regras:

- Uma linha por auditoria reprovada, na ordem da medição.
- Escopo Global sempre com o diff resumido no detalhe da linha.
- Efeito esperado vem de `metricSavings`, `wastedBytes` ou `wastedMs` da
  medição. Sem número no relatório, descreva o efeito sem inventar valor.
- Status possíveis: `pendente`, `aplicada`, `não aplicada` (com motivo) e
  `fora do código`.
- Depois de medir de novo, acrescente a comparação e atualize o status de cada
  linha antes de entregar o relatório final.
