/**
 * Normaliza a resposta bruta da API num relatório estável (`report.json`).
 *
 * O relatório reúne, por estratégia: notas das categorias, métricas de
 * laboratório, dados de campo do CrUX (página e origem) e todas as auditorias
 * que não passaram, ordenadas por impacto e com os itens de detalhe (URLs,
 * seletores, trechos de HTML, economia estimada). O JSON bruto continua salvo
 * ao lado, para consulta de qualquer campo que a normalização resuma.
 */
import type { Categoria, Estrategia } from "./api.js";

/** Versão do formato do relatório. Mude quando um campo sair ou mudar de tipo. */
export const VERSAO_FORMATO = 1;

/** Nota mínima para considerar uma auditoria aprovada (escala 0 a 1). */
export const NOTA_APROVADA = 0.9;

/** IDs das métricas de laboratório exibidas no relatório. */
export const METRICAS_LAB = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
] as const;

/** Métrica de laboratório. */
export interface MetricaLab {
  title: string;
  displayValue: string | null;
  numericValue: number | null;
  score: number | null;
}

/** Métrica de campo do Chrome UX Report. */
export interface MetricaCampo {
  percentile: number;
  category: string;
}

/** Bloco de dados de campo (página ou origem). */
export interface DadosCampo {
  overallCategory: string | null;
  metrics: Record<string, MetricaCampo>;
}

/** Auditoria que não passou, já pronta para virar ação. */
export interface AuditoriaPendente {
  id: string;
  categories: Categoria[];
  group: string | null;
  weight: number;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue: string | null;
  numericValue: number | null;
  metricSavings: Record<string, number>;
  detailsType: string | null;
  headings: Array<{ key: string; label: string }>;
  items: unknown[];
  totalItems: number;
  truncated: boolean;
}

/** Resultado normalizado de uma estratégia. */
export interface ExecucaoNormalizada {
  strategy: Estrategia;
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  lighthouseVersion: string;
  userAgent: string;
  runWarnings: string[];
  runtimeError: string | null;
  scores: Partial<Record<Categoria, number | null>>;
  labMetrics: Record<string, MetricaLab>;
  field: { page: DadosCampo | null; origin: DadosCampo | null };
  failedAudits: AuditoriaPendente[];
  manualAudits: Array<{ id: string; category: Categoria; title: string }>;
  passedAuditIds: string[];
  rawFile: string;
}

/** Formato completo do `report.json`. */
export interface Relatorio {
  formatVersion: number;
  tool: "pagespeedfy";
  toolVersion: string;
  generatedAt: string;
  url: string;
  locale: string;
  categories: Categoria[];
  maxItems: number;
  runs: ExecucaoNormalizada[];
}

type Json = Record<string, unknown>;

const obj = (v: unknown): Json =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Chaves sem valor para correção que inflam o relatório. */
const CHAVES_DESCARTADAS = new Set(["boundingRect", "lhId", "path"]);

/**
 * Copia um item de detalhe sem as chaves de posicionamento interno do
 * Lighthouse, preservando seletor, snippet, URL, economia e sub-itens.
 */
export function limparItem(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(limparItem);
  if (valor === null || typeof valor !== "object") return valor;
  const saida: Json = {};
  for (const [chave, interno] of Object.entries(valor as Json)) {
    if (CHAVES_DESCARTADAS.has(chave)) continue;
    saida[chave] = limparItem(interno);
  }
  return saida;
}

/** Converte o nome de categoria da API (`best-practices`) para o tipo local. */
function categoriaLocal(id: string): Categoria | null {
  return id === "performance" ||
    id === "accessibility" ||
    id === "best-practices" ||
    id === "seo"
    ? id
    : null;
}

/** Extrai o bloco `loadingExperience` ou `originLoadingExperience`. */
function normalizarCampo(bloco: unknown): DadosCampo | null {
  const b = obj(bloco);
  const metricas = obj(b.metrics);
  const chaves = Object.keys(metricas);
  if (chaves.length === 0) return null;
  const saida: Record<string, MetricaCampo> = {};
  for (const chave of chaves) {
    const m = obj(metricas[chave]);
    const percentile = num(m.percentile);
    if (percentile === null) continue;
    saida[chave] = { percentile, category: str(m.category) ?? "NONE" };
  }
  return { overallCategory: str(b.overall_category), metrics: saida };
}

/** Soma das economias estimadas, usada para ordenar auditorias. */
function somaEconomia(a: AuditoriaPendente): number {
  return Object.values(a.metricSavings).reduce((t, v) => t + v, 0);
}

/**
 * Normaliza uma resposta de `runPagespeed`.
 *
 * Uma auditoria entra em `failedAudits` quando pertence a uma categoria
 * consultada, tem modo de nota `binary`, `numeric` ou `metricSavings` e nota
 * abaixo de 0,9. Auditorias `manual` vão para `manualAudits`. As métricas
 * (grupo `metrics`) ficam em `labMetrics`, fora da lista de pendências.
 */
export function normalizarExecucao(
  bruto: Json,
  estrategia: Estrategia,
  rawFile: string,
  maxItems: number,
): ExecucaoNormalizada {
  const lh = obj(bruto.lighthouseResult);
  const auditorias = obj(lh.audits);
  const categorias = obj(lh.categories);

  const scores: Partial<Record<Categoria, number | null>> = {};
  const referencias = new Map<string, { categories: Categoria[]; group: string | null; weight: number }>();

  for (const [idCategoria, valor] of Object.entries(categorias)) {
    const categoria = categoriaLocal(idCategoria);
    if (!categoria) continue;
    const c = obj(valor);
    const nota = num(c.score);
    scores[categoria] = nota === null ? null : Math.round(nota * 100);
    const refs = Array.isArray(c.auditRefs) ? c.auditRefs : [];
    for (const ref of refs) {
      const r = obj(ref);
      const id = str(r.id);
      if (!id) continue;
      const atual = referencias.get(id) ?? { categories: [], group: str(r.group), weight: 0 };
      if (!atual.categories.includes(categoria)) atual.categories.push(categoria);
      atual.weight = Math.max(atual.weight, num(r.weight) ?? 0);
      referencias.set(id, atual);
    }
  }

  const labMetrics: Record<string, MetricaLab> = {};
  for (const id of METRICAS_LAB) {
    const a = obj(auditorias[id]);
    if (Object.keys(a).length === 0) continue;
    labMetrics[id] = {
      title: str(a.title) ?? id,
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      score: num(a.score),
    };
  }

  const falhas: AuditoriaPendente[] = [];
  const manuais: ExecucaoNormalizada["manualAudits"] = [];
  const aprovadas: string[] = [];

  for (const [id, ref] of referencias) {
    if (ref.group === "metrics") continue;
    const a = obj(auditorias[id]);
    if (Object.keys(a).length === 0) continue;
    const modo = str(a.scoreDisplayMode) ?? "";
    const nota = num(a.score);

    if (modo === "manual") {
      manuais.push({ id, category: ref.categories[0]!, title: str(a.title) ?? id });
      continue;
    }
    if (!["binary", "numeric", "metricSavings"].includes(modo)) continue;
    if (nota !== null && nota >= NOTA_APROVADA) {
      aprovadas.push(id);
      continue;
    }

    const detalhes = obj(a.details);
    const itens = Array.isArray(detalhes.items) ? detalhes.items : [];
    const cabecalhos = Array.isArray(detalhes.headings) ? detalhes.headings : [];
    const economia: Record<string, number> = {};
    for (const [metrica, valor] of Object.entries(obj(a.metricSavings))) {
      const n = num(valor);
      if (n !== null && n > 0) economia[metrica] = n;
    }

    falhas.push({
      id,
      categories: ref.categories,
      group: ref.group,
      weight: ref.weight,
      title: str(a.title) ?? id,
      description: str(a.description) ?? "",
      score: nota,
      scoreDisplayMode: modo,
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      metricSavings: economia,
      detailsType: str(detalhes.type),
      headings: cabecalhos
        .map((h) => {
          const o = obj(h);
          const key = str(o.key);
          const label = str(o.label) ?? str(o.text) ?? key;
          return key ? { key, label: label ?? key } : null;
        })
        .filter((h): h is { key: string; label: string } => h !== null),
      items: itens.slice(0, maxItems).map(limparItem),
      totalItems: itens.length,
      truncated: itens.length > maxItems,
    });
  }

  falhas.sort(
    (a, b) =>
      b.weight - a.weight ||
      somaEconomia(b) - somaEconomia(a) ||
      (a.score ?? 0) - (b.score ?? 0) ||
      a.id.localeCompare(b.id),
  );

  const ambiente = obj(lh.environment);
  const erro = obj(lh.runtimeError);

  return {
    strategy: estrategia,
    requestedUrl: str(lh.requestedUrl) ?? str(bruto.id) ?? "",
    finalUrl: str(lh.finalDisplayedUrl) ?? str(lh.finalUrl) ?? "",
    fetchTime: str(lh.fetchTime) ?? "",
    lighthouseVersion: str(lh.lighthouseVersion) ?? "",
    userAgent: str(ambiente.networkUserAgent) ?? "",
    runWarnings: Array.isArray(lh.runWarnings)
      ? lh.runWarnings.filter((w): w is string => typeof w === "string")
      : [],
    runtimeError: str(erro.message),
    scores,
    labMetrics,
    field: {
      page: normalizarCampo(bruto.loadingExperience),
      origin: normalizarCampo(bruto.originLoadingExperience),
    },
    failedAudits: falhas,
    manualAudits: manuais.sort((a, b) => a.id.localeCompare(b.id)),
    passedAuditIds: aprovadas.sort(),
    rawFile,
  };
}
