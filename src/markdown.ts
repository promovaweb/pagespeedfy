/**
 * Renderiza o relatório normalizado em Markdown legível no terminal e por
 * agentes. O Markdown resume; o `report.json` continua sendo a fonte completa.
 */
import type { AuditoriaPendente, ExecucaoNormalizada, Relatorio } from "./relatorio.js";

const NOMES_CATEGORIA: Record<string, string> = {
  performance: "Performance",
  accessibility: "Acessibilidade",
  "best-practices": "Boas práticas",
  seo: "SEO",
};

/** Itens de detalhe exibidos por auditoria no Markdown. */
const ITENS_POR_AUDITORIA = 5;

/** Escapa barras verticais e quebras de linha para células de tabela. */
function celula(texto: string): string {
  return texto.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/** Remove links Markdown do texto de descrição do Lighthouse. */
function semLinks(texto: string): string {
  return texto.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * Resume um item de detalhe numa linha: seletor ou URL primeiro, depois a
 * economia em bytes ou milissegundos quando existir.
 */
export function resumirItem(item: unknown): string {
  if (item === null || typeof item !== "object") return String(item);
  const i = item as Record<string, unknown>;
  const partes: string[] = [];
  const node = i.node as Record<string, unknown> | undefined;
  if (node && typeof node === "object") {
    if (typeof node.selector === "string") partes.push(`\`${node.selector}\``);
    if (typeof node.snippet === "string") partes.push(`\`${node.snippet.slice(0, 120)}\``);
  }
  for (const chave of ["url", "source", "entity", "label", "groupLabel"]) {
    const v = i[chave];
    if (typeof v === "string") partes.push(v);
    else if (v && typeof v === "object" && typeof (v as Record<string, unknown>).url === "string") {
      partes.push(String((v as Record<string, unknown>).url));
    }
  }
  if (typeof i.wastedBytes === "number") partes.push(`${Math.round(i.wastedBytes / 1024)} KiB evitáveis`);
  if (typeof i.wastedMs === "number") partes.push(`${Math.round(i.wastedMs)} ms evitáveis`);
  if (typeof i.totalBytes === "number" && typeof i.wastedBytes !== "number") {
    partes.push(`${Math.round(i.totalBytes / 1024)} KiB`);
  }
  if (partes.length === 0) return celula(JSON.stringify(i).slice(0, 160));
  return celula(partes.join(" · "));
}

/** Renderiza uma auditoria pendente com descrição e primeiros itens. */
function auditoria(a: AuditoriaPendente): string {
  const nota = a.score === null ? "sem nota" : `nota ${Math.round(a.score * 100)}`;
  const economia = Object.entries(a.metricSavings)
    .map(([m, v]) => `${m} −${m === "CLS" ? v.toFixed(3) : `${Math.round(v)} ms`}`)
    .join(", ");
  const linhas = [
    `#### \`${a.id}\` · ${a.title}`,
    "",
    `- Categorias: ${a.categories.map((c) => NOMES_CATEGORIA[c] ?? c).join(", ")}; peso ${a.weight}; ${nota}.`,
  ];
  if (a.displayValue) linhas.push(`- Resultado: ${a.displayValue}.`);
  if (economia) linhas.push(`- Economia estimada: ${economia}.`);
  if (a.description) linhas.push(`- Orientação: ${semLinks(a.description)}`);
  if (a.totalItems > 0) {
    linhas.push(`- Itens (${a.totalItems}${a.truncated ? `, ${a.items.length} no report.json` : ""}):`);
    for (const item of a.items.slice(0, ITENS_POR_AUDITORIA)) {
      linhas.push(`  - ${resumirItem(item)}`);
    }
    if (a.totalItems > ITENS_POR_AUDITORIA) {
      linhas.push(`  - … mais ${a.totalItems - ITENS_POR_AUDITORIA} no report.json.`);
    }
  }
  return linhas.join("\n");
}

/** Renderiza uma estratégia completa. */
function execucao(e: ExecucaoNormalizada): string {
  const linhas: string[] = [`## ${e.strategy === "mobile" ? "Mobile" : "Desktop"}`, ""];
  if (e.runtimeError) {
    linhas.push(`> Erro do Lighthouse: ${e.runtimeError}`, "");
  }
  linhas.push(`URL final: ${e.finalUrl} · Lighthouse ${e.lighthouseVersion} · ${e.fetchTime}`, "");

  linhas.push("| Categoria | Nota |", "| --- | --- |");
  for (const [c, n] of Object.entries(e.scores)) {
    linhas.push(`| ${NOMES_CATEGORIA[c] ?? c} | ${n ?? "—"} |`);
  }
  linhas.push("");

  if (Object.keys(e.labMetrics).length > 0) {
    linhas.push("### Métricas de laboratório", "", "| Métrica | Valor | Nota |", "| --- | --- | --- |");
    for (const m of Object.values(e.labMetrics)) {
      const nota = m.score === null ? "—" : String(Math.round(m.score * 100));
      linhas.push(`| ${celula(m.title)} | ${m.displayValue ?? "—"} | ${nota} |`);
    }
    linhas.push("");
  }

  for (const [rotulo, bloco] of [["página", e.field.page], ["origem", e.field.origin]] as const) {
    if (!bloco) continue;
    linhas.push(`### Dados de campo (${rotulo}): ${bloco.overallCategory ?? "sem classificação"}`, "");
    linhas.push("| Métrica | p75 | Classificação |", "| --- | --- | --- |");
    for (const [id, m] of Object.entries(bloco.metrics)) {
      linhas.push(`| ${id} | ${m.percentile} | ${m.category} |`);
    }
    linhas.push("");
  }
  if (!e.field.page && !e.field.origin) {
    linhas.push("Sem dados de campo do CrUX para esta URL ou origem.", "");
  }

  if (e.runWarnings.length > 0) {
    linhas.push("### Avisos da execução", "", ...e.runWarnings.map((w) => `- ${celula(w)}`), "");
  }

  linhas.push(`### Auditorias pendentes (${e.failedAudits.length})`, "");
  if (e.failedAudits.length === 0) linhas.push("Nenhuma auditoria pendente.", "");
  for (const a of e.failedAudits) linhas.push(auditoria(a), "");

  if (e.manualAudits.length > 0) {
    linhas.push(`### Verificações manuais (${e.manualAudits.length})`, "");
    for (const m of e.manualAudits) linhas.push(`- \`${m.id}\`: ${m.title}`);
    linhas.push("");
  }
  linhas.push(`Auditorias aprovadas: ${e.passedAuditIds.length}. JSON bruto: \`${e.rawFile}\`.`, "");
  return linhas.join("\n");
}

/** Renderiza o relatório inteiro. */
export function relatorioMarkdown(r: Relatorio): string {
  return [
    `# PageSpeed Insights: ${r.url}`,
    "",
    `Gerado em ${r.generatedAt} pelo Pagespeedfy ${r.toolVersion}. Locale ${r.locale}.`,
    "",
    ...r.runs.map(execucao),
  ].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
