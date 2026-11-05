/**
 * Compara dois relatórios da mesma URL: diferença de notas, de métricas de
 * laboratório e auditorias resolvidas, novas ou mantidas por estratégia.
 */
import type { Relatorio } from "./relatorio.js";

/** Diferença numérica de um indicador. */
export interface Diferenca {
  before: number | null;
  after: number | null;
  delta: number | null;
}

/** Comparação de uma estratégia presente nos dois relatórios. */
export interface ComparacaoEstrategia {
  strategy: string;
  scores: Record<string, Diferenca>;
  labMetrics: Record<string, Diferenca>;
  resolvedAudits: string[];
  newAudits: string[];
  remainingAudits: string[];
}

/** Resultado de `pagespeedfy compare`. */
export interface Comparacao {
  before: { url: string; generatedAt: string };
  after: { url: string; generatedAt: string };
  sameUrl: boolean;
  strategies: ComparacaoEstrategia[];
}

const dif = (a: number | null | undefined, b: number | null | undefined): Diferenca => ({
  before: a ?? null,
  after: b ?? null,
  delta: a === null || a === undefined || b === null || b === undefined ? null : Number((b - a).toFixed(4)),
});

/** Compara `antes` e `depois` estratégia por estratégia. */
export function comparar(antes: Relatorio, depois: Relatorio): Comparacao {
  const estrategias: ComparacaoEstrategia[] = [];
  for (const a of antes.runs) {
    const d = depois.runs.find((r) => r.strategy === a.strategy);
    if (!d) continue;
    const scores: Record<string, Diferenca> = {};
    for (const c of new Set([...Object.keys(a.scores), ...Object.keys(d.scores)])) {
      scores[c] = dif(a.scores[c as keyof typeof a.scores], d.scores[c as keyof typeof d.scores]);
    }
    const labMetrics: Record<string, Diferenca> = {};
    for (const m of new Set([...Object.keys(a.labMetrics), ...Object.keys(d.labMetrics)])) {
      labMetrics[m] = dif(a.labMetrics[m]?.numericValue, d.labMetrics[m]?.numericValue);
    }
    const idsA = new Set(a.failedAudits.map((x) => x.id));
    const idsD = new Set(d.failedAudits.map((x) => x.id));
    estrategias.push({
      strategy: a.strategy,
      scores,
      labMetrics,
      resolvedAudits: [...idsA].filter((id) => !idsD.has(id)).sort(),
      newAudits: [...idsD].filter((id) => !idsA.has(id)).sort(),
      remainingAudits: [...idsA].filter((id) => idsD.has(id)).sort(),
    });
  }
  return {
    before: { url: antes.url, generatedAt: antes.generatedAt },
    after: { url: depois.url, generatedAt: depois.generatedAt },
    sameUrl: antes.url === depois.url,
    strategies: estrategias,
  };
}

/** Formata um delta com sinal explícito. */
function sinal(d: Diferenca, casas = 0): string {
  if (d.delta === null) return "—";
  const v = casas > 0 ? d.delta.toFixed(casas) : String(Math.round(d.delta));
  return d.delta > 0 ? `+${v}` : v;
}

/** Renderiza a comparação em Markdown. */
export function comparacaoMarkdown(c: Comparacao): string {
  const linhas = [
    `# Comparação: ${c.after.url}`,
    "",
    `Antes: ${c.before.generatedAt} · Depois: ${c.after.generatedAt}`,
    "",
  ];
  if (!c.sameUrl) linhas.push(`> Atenção: os relatórios medem URLs diferentes (${c.before.url}).`, "");
  for (const e of c.strategies) {
    linhas.push(`## ${e.strategy}`, "", "| Categoria | Antes | Depois | Diferença |", "| --- | --- | --- | --- |");
    for (const [cat, d] of Object.entries(e.scores)) {
      linhas.push(`| ${cat} | ${d.before ?? "—"} | ${d.after ?? "—"} | ${sinal(d)} |`);
    }
    linhas.push("", "| Métrica | Antes | Depois | Diferença |", "| --- | --- | --- | --- |");
    for (const [m, d] of Object.entries(e.labMetrics)) {
      const casas = m === "cumulative-layout-shift" ? 3 : 0;
      const f = (v: number | null) => (v === null ? "—" : casas ? v.toFixed(3) : String(Math.round(v)));
      linhas.push(`| ${m} | ${f(d.before)} | ${f(d.after)} | ${sinal(d, casas)} |`);
    }
    linhas.push("");
    linhas.push(`- Resolvidas (${e.resolvedAudits.length}): ${e.resolvedAudits.join(", ") || "nenhuma"}`);
    linhas.push(`- Novas (${e.newAudits.length}): ${e.newAudits.join(", ") || "nenhuma"}`);
    linhas.push(`- Mantidas (${e.remainingAudits.length}): ${e.remainingAudits.join(", ") || "nenhuma"}`, "");
  }
  if (c.strategies.length === 0) linhas.push("Nenhuma estratégia em comum entre os relatórios.", "");
  return linhas.join("\n").trimEnd() + "\n";
}
