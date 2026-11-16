/**
 * Markdown renderers for measurements, comparisons and the page timeline.
 *
 * The text output of `report`, `compare` and `history <url>`, the MCP tool
 * results and the `report` key of the TUI detail all come from here, so a
 * person and an agent read the same summary. The JSON in the history
 * database remains the full source.
 */
import type { Measurement, MeasurementSummary } from "../db/history.ts";
import type { Comparison, Delta } from "./compare.ts";
import { LAB_METRICS, type FailedAudit, type LabMetricId, type Run } from "./report.ts";

/** Category labels used in tables. */
export const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
};

/** Detail items shown per audit in Markdown. */
const ITEMS_PER_AUDIT = 5;

/** Escapes pipes and line breaks for table cells. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/** Removes Markdown links from Lighthouse descriptions. */
function withoutLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/** Formats an ISO timestamp as local `YYYY-MM-DD HH:MM`, the way people read the history. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Formats a lab metric value: CLS with three decimals, the rest in ms or s. */
export function formatMetric(id: LabMetricId | string, value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (id === "cumulative-layout-shift" || id === "cls") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

/**
 * Summarizes one detail item in a line: selector or URL first, then the
 * savings in bytes or milliseconds when present.
 */
export function summarizeItem(item: unknown): string {
  if (item === null || typeof item !== "object") return String(item);
  const i = item as Record<string, unknown>;
  const parts: string[] = [];
  const node = i.node as Record<string, unknown> | undefined;
  if (node && typeof node === "object") {
    if (typeof node.selector === "string") parts.push(`\`${node.selector}\``);
    if (typeof node.snippet === "string") parts.push(`\`${node.snippet.slice(0, 120)}\``);
  }
  for (const key of ["url", "source", "entity", "label", "groupLabel"]) {
    const v = i[key];
    if (typeof v === "string") parts.push(v);
    else if (v && typeof v === "object" && typeof (v as Record<string, unknown>).url === "string") parts.push(String((v as Record<string, unknown>).url));
  }
  if (typeof i.wastedBytes === "number") parts.push(`${Math.round(i.wastedBytes / 1024)} KiB avoidable`);
  if (typeof i.wastedMs === "number") parts.push(`${Math.round(i.wastedMs)} ms avoidable`);
  if (typeof i.totalBytes === "number" && typeof i.wastedBytes !== "number") parts.push(`${Math.round(i.totalBytes / 1024)} KiB`);
  if (parts.length === 0) return cell(JSON.stringify(i).slice(0, 160));
  return cell(parts.join(" · "));
}

function audit(a: FailedAudit): string {
  const score = a.score === null ? "no score" : `score ${Math.round(a.score * 100)}`;
  const savings = Object.entries(a.metricSavings)
    .map(([m, v]) => `${m} −${m === "CLS" ? v.toFixed(3) : `${Math.round(v)} ms`}`)
    .join(", ");
  const lines = [`#### \`${a.id}\` · ${a.title}`, "", `- Categories: ${a.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(", ")}; weight ${a.weight}; ${score}.`];
  if (a.displayValue) lines.push(`- Result: ${a.displayValue}.`);
  if (savings) lines.push(`- Estimated savings: ${savings}.`);
  if (a.description) lines.push(`- Guidance: ${withoutLinks(a.description)}`);
  if (a.totalItems > 0) {
    lines.push(`- Items (${a.totalItems}${a.truncated ? `, ${a.items.length} stored` : ""}):`);
    for (const item of a.items.slice(0, ITEMS_PER_AUDIT)) lines.push(`  - ${summarizeItem(item)}`);
    if (a.totalItems > ITEMS_PER_AUDIT) lines.push(`  - … ${a.totalItems - ITEMS_PER_AUDIT} more in the --json output.`);
  }
  return lines.join("\n");
}

/** Renders one normalized run (one strategy). */
export function runMarkdown(run: Run, heading = `## ${run.strategy === "mobile" ? "Mobile" : "Desktop"}`): string {
  const lines: string[] = [heading, ""];
  if (run.runtimeError) lines.push(`> Lighthouse error: ${run.runtimeError}`, "");
  const samples = run.samples > 1 ? ` · median of ${run.samples} samples (performance ${run.sampleScores.map((s) => s ?? "—").join(", ")})` : "";
  lines.push(`Final URL: ${run.finalUrl} · Lighthouse ${run.lighthouseVersion} · ${run.fetchTime}${samples}`, "");

  lines.push("| Category | Score |", "| --- | --- |");
  for (const [c, n] of Object.entries(run.scores)) lines.push(`| ${CATEGORY_LABELS[c] ?? c} | ${n ?? "—"} |`);
  lines.push("");

  const metrics = Object.values(run.labMetrics);
  if (metrics.length > 0) {
    lines.push("### Lab metrics", "", "| Metric | Value | Score |", "| --- | --- | --- |");
    for (const m of metrics) lines.push(`| ${cell(m!.title)} | ${m!.displayValue ?? "—"} | ${m!.score === null ? "—" : Math.round(m!.score * 100)} |`);
    lines.push("");
  }

  for (const [label, block] of [["page", run.field.page], ["origin", run.field.origin]] as const) {
    if (!block) continue;
    lines.push(`### Field data (${label}): ${block.overallCategory ?? "unclassified"}`, "", "| Metric | p75 | Category |", "| --- | --- | --- |");
    for (const [id, m] of Object.entries(block.metrics)) lines.push(`| ${id} | ${m.percentile} | ${m.category} |`);
    lines.push("");
  }
  if (!run.field.page && !run.field.origin) lines.push("No CrUX field data for this URL or origin.", "");

  if (run.runWarnings.length > 0) lines.push("### Run warnings", "", ...run.runWarnings.map((w) => `- ${cell(w)}`), "");

  lines.push(`### Failed audits (${run.failedAudits.length})`, "");
  if (run.failedAudits.length === 0) lines.push("No failed audits.", "");
  for (const a of run.failedAudits) lines.push(audit(a), "");

  if (run.manualAudits.length > 0) {
    lines.push(`### Manual checks (${run.manualAudits.length})`, "");
    for (const m of run.manualAudits) lines.push(`- \`${m.id}\`: ${m.title}`);
    lines.push("");
  }
  lines.push(`Passed audits: ${run.passedAuditIds.length}. Raw JSON: \`.pagespeedfy/${run.rawFile}\`.`, "");
  return lines.join("\n");
}

/** Renders one stored measurement with its header. */
export function measurementMarkdown(m: Measurement): string {
  const header = [`# PageSpeed Insights: ${m.url}`, "", `Measurement #${m.id} · ${m.strategy} · ${formatDate(m.measuredAt)} · Pagespeedfy ${m.toolVersion}`];
  if (m.note) header.push("", `Note: ${m.note}`);
  return finish([...header, "", runMarkdown(m.run)]);
}

function signed(d: Delta, decimals = 0): string {
  if (d.delta === null) return "—";
  const v = decimals > 0 ? d.delta.toFixed(decimals) : String(Math.round(d.delta));
  return d.delta > 0 ? `+${v}` : v;
}

/** Renders a comparison. */
export function comparisonMarkdown(c: Comparison): string {
  const sideLine = (label: string, s: Comparison["before"]) => `${label}: #${s.id} · ${formatDate(s.measuredAt)}${s.note ? ` · ${s.note}` : ""}`;
  const lines = [`# Comparison: ${c.url} (${c.strategy})`, "", sideLine("Before", c.before), sideLine("After", c.after), ""];
  if (!c.sameUrl) lines.push("> Warning: the measurements are from different URLs.", "");
  if (!c.sameStrategy) lines.push("> Warning: the measurements use different strategies.", "");
  lines.push("| Category | Before | After | Change |", "| --- | --- | --- | --- |");
  for (const [cat, d] of Object.entries(c.scores)) lines.push(`| ${CATEGORY_LABELS[cat] ?? cat} | ${d!.before ?? "—"} | ${d!.after ?? "—"} | ${signed(d!)} |`);
  lines.push("", "| Metric | Before | After | Change |", "| --- | --- | --- | --- |");
  for (const [id, d] of Object.entries(c.labMetrics)) {
    const cls = id === "cumulative-layout-shift";
    lines.push(`| ${LAB_METRICS[id as LabMetricId]} | ${formatMetric(id, d!.before)} | ${formatMetric(id, d!.after)} | ${cls ? signed(d!, 3) : `${signed(d!)}${d!.delta === null ? "" : " ms"}`} |`);
  }
  lines.push(
    "",
    `- Resolved (${c.resolvedAudits.length}): ${c.resolvedAudits.join(", ") || "none"}`,
    `- New (${c.newAudits.length}): ${c.newAudits.join(", ") || "none"}`,
    `- Remaining (${c.remainingAudits.length}): ${c.remainingAudits.join(", ") || "none"}`,
    "",
    c.regression ? "Result: regression (a score dropped or a new audit failed)." : "Result: no regression.",
  );
  return finish(lines);
}

/** Renders the timeline of one page, oldest first, so improvements read top to bottom. */
export function timelineMarkdown(url: string, measurements: readonly MeasurementSummary[]): string {
  const lines = [`# History: ${url}`, ""];
  if (measurements.length === 0) return finish([...lines, "No measurements yet."]);
  lines.push("| # | Date | Strategy | Perf | A11y | BP | SEO | LCP | TBT | CLS | Failed | Note |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const m of [...measurements].reverse()) {
    const s = m.scores;
    lines.push(
      `| ${m.id} | ${formatDate(m.measuredAt)} | ${m.strategy} | ${s.performance ?? "—"} | ${s.accessibility ?? "—"} | ${s["best-practices"] ?? "—"} | ${s.seo ?? "—"} | ${formatMetric("lcp", m.lab.lcp)} | ${formatMetric("tbt", m.lab.tbt)} | ${formatMetric("cls", m.lab.cls)} | ${m.failedAudits} | ${cell(m.note ?? "")} |`,
    );
  }
  return finish(lines);
}

function finish(lines: string[]): string {
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
