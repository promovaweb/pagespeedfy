/** Read-only project history navigation: pages, chronological runs and comparisons. */
import { BoxRenderable, ScrollBoxRenderable, TextRenderable } from "@opentui/core";
import { AppError } from "../../app/errors.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { getMeasurement, listMeasurements, listPages, type MeasurementSummary, type PageSummary } from "../../db/history.ts";
import { CATEGORY_LABELS, formatDate, formatMetric } from "../../pagespeed/markdown.ts";
import { resolveProject } from "../../pagespeed/project.ts";
import { comparePair, withHistory } from "../../pagespeed/queries.ts";
import { CATEGORIES, LAB_METRICS, type Strategy } from "../../pagespeed/report.ts";
import { panel } from "../components.ts";
import type { Screen, ScreenContext } from "../screen.ts";
import type { Theme } from "../theme.ts";

/** Returns the Lighthouse status color, retaining missing scores as unknown. */
export function scoreColor(score: number | null | undefined, theme: Theme): string {
  return score == null ? theme.textDim : score < 50 ? theme.error : score < 90 ? theme.warn : theme.ok;
}

/** Draws performance on a fixed 0–100 scale; missing scores are gaps. */
export function performanceSparkline(scores: Array<number | null>): string {
  return scores.map((score) => score == null ? "·" : "▁▂▃▄▅▆▇█"[Math.round(Math.max(0, Math.min(100, score)) * 7 / 100)]).join("");
}

const clean = (value: string) => value.replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}`;

/** Creates independent navigation state for one TUI application. */
export function createHistoryScreen(): Screen {
  let ctx: ScreenContext;
  let project: string;
  let root: BoxRenderable;
  let status: TextRenderable;
  let viewport: ScrollBoxRenderable;
  let rows: BoxRenderable[] = [];
  let markers: TextRenderable[] = [];
  let pages: PageSummary[] = [];
  let measurements: MeasurementSummary[] = [];
  let pageId: number | undefined;
  let measurementId: number | undefined;
  let filter: "all" | Strategy = "all";
  let level: "pages" | "timeline" | "detail" = "pages";
  let index = 0;
  let pageIndex = 0;
  let timelineIndex = 0;

  const text = (content: string, color = ctx.theme.text) => new TextRenderable(ctx.renderer, {
    content: clean(content), fg: color, wrapMode: "word", flexShrink: 0,
  });
  const line = (parent: BoxRenderable, content: string, color = ctx.theme.text) => parent.add(text(content, color));
  const select = (next: number) => {
    index = Math.max(0, Math.min(rows.length - 1, next));
    rows.forEach((row, i) => {
      row.backgroundColor = i === index ? ctx.theme.surfaceHigh : ctx.theme.surface;
      markers[i]!.content = i === index ? "> " : "  ";
    });
    if (rows[index]) viewport.scrollChildIntoView(rows[index]!);
  };
  const clear = () => {
    if (viewport) { root.remove(viewport); viewport.destroyRecursively(); }
    rows = []; markers = [];
    viewport = new ScrollBoxRenderable(ctx.renderer, {
      flexGrow: 1, flexBasis: 0, minHeight: 0, scrollY: true, scrollX: false,
      contentOptions: { flexDirection: "column" },
    });
    root.add(viewport);
  };
  const row = () => {
    const box = new BoxRenderable(ctx.renderer, { flexDirection: "row", flexShrink: 0 });
    const marker = text("  ", ctx.theme.accent);
    marker.width = 2;
    box.add(marker);
    const body = new BoxRenderable(ctx.renderer, { flexDirection: "column", flexGrow: 1, minWidth: 0 });
    box.add(body); viewport.add(box); rows.push(box); markers.push(marker);
    return body;
  };
  const scores = (body: BoxRenderable, values: MeasurementSummary["scores"]) => {
    for (const category of CATEGORIES) {
      line(body, `${CATEGORY_LABELS[category]}: ${values[category] ?? "—"}`, scoreColor(values[category], ctx.theme));
    }
  };
  const trend = (strategy: Strategy) => {
    const values = measurements.filter((m) => m.strategy === strategy).map((m) => m.scores.performance);
    const first = values[0], last = values.at(-1);
    const delta = first == null || last == null ? "—" : `${signed(last - first)} pts`;
    const width = Math.max(1, Math.min(48, ctx.renderer.width - 32));
    const visible = values.slice(-width);
    const window = values.length > width ? ` [last ${visible.length}/${values.length}]` : "";
    return `${strategy}: ${performanceSparkline(visible)}  ${first ?? "—"} → ${last ?? "—"} (${delta})${window}`;
  };
  const load = (preserve = true) => {
    const oldId = !preserve ? undefined : level === "pages" ? pages[index]?.id : measurements[index]?.id;
    status.content = "Loading history…";
    try {
      withHistory(project, (db) => {
        pages = listPages(db);
        if (level !== "pages" && !pages.some((p) => p.id === pageId)) level = "pages";
        measurements = level === "pages" ? [] : listMeasurements(db, {
          pageId, strategy: filter === "all" ? undefined : filter, limit: -1,
        }).reverse();
        if (level === "detail" && !measurements.some((m) => m.id === measurementId)) level = "timeline";
        clear();
        root.title = ` History / ${level} `;
        if (!pages.length) {
          status.content = `No history in ${project}`;
          line(viewport, "Measure a page first: pagespeedfy run <url>");
          return;
        }
        if (level === "pages") {
          status.content = `Project: ${project}`;
          for (const page of pages) {
            const body = row();
            line(body, page.url);
            line(body, `${page.measurements} measurements | Last: ${formatDate(page.lastMeasuredAt)}`, ctx.theme.textDim);
            const scoreRow = new BoxRenderable(ctx.renderer, { flexDirection: "row", flexShrink: 0, flexWrap: "wrap" });
            for (const strategy of ["mobile", "desktop"] as const) {
              const score = page.latest[strategy]?.scores.performance;
              scoreRow.add(text(`${strategy}: ${score ?? "—"}   `, scoreColor(score, ctx.theme)));
            }
            body.add(scoreRow);
          }
        } else if (level === "timeline") {
          status.content = `${pages.find((p) => p.id === pageId)?.url}\nFilter: ${filter} | Performance (0–100)\n${filter === "all" ? `${trend("mobile")}\n${trend("desktop")}` : trend(filter)}`;
          for (const m of measurements) {
            const body = row();
            line(body, `#${m.id} ${formatDate(m.measuredAt)} | ${m.strategy}`, ctx.theme.textStrong);
            line(body, `P ${m.scores.performance ?? "—"} | A ${m.scores.accessibility ?? "—"} | BP ${m.scores["best-practices"] ?? "—"} | SEO ${m.scores.seo ?? "—"}`);
            line(body, `LCP ${formatMetric("lcp", m.lab.lcp)} | TBT ${formatMetric("tbt", m.lab.tbt)} | CLS ${formatMetric("cls", m.lab.cls)} | Pending: ${m.failedAudits}`);
            line(body, `Note: ${m.note ?? "—"}`, ctx.theme.textDim);
          }
          if (!measurements.length) line(viewport, "No measurements for this filter. Press f to change it.");
        } else {
          const m = getMeasurement(db, measurementId!);
          status.content = `#${m.id} ${formatDate(m.measuredAt)} | ${m.strategy}\n${m.url}`;
          scores(viewport, m.scores);
          line(viewport, `Note: ${m.note ?? "—"}`, ctx.theme.textDim);
          line(viewport, "Lab metrics", ctx.theme.accent);
          for (const [id, label] of Object.entries(LAB_METRICS)) {
            line(viewport, `${label}: ${formatMetric(id, m.run.labMetrics[id as keyof typeof LAB_METRICS]?.numericValue)}`);
          }
          line(viewport, "Pending audits (impact order)", ctx.theme.accent);
          if (!m.run.failedAudits.length) line(viewport, "No pending audits.");
          // Runs already carry the domain's canonical impact ordering.
          for (const audit of m.run.failedAudits) {
            const savings = Object.entries(audit.metricSavings).map(([metric, value]) => `${metric}: ${formatMetric(metric.toLowerCase(), value)}`).join(", ");
            line(viewport, `${audit.title} | Estimated savings: ${savings || audit.displayValue || "—"}`);
          }
          try {
            const comparison = comparePair(db, String(m.id), undefined);
            line(viewport, `Compared with #${comparison.before.id} (${m.strategy})`, ctx.theme.accent);
            for (const category of CATEGORIES) {
              const d = comparison.scores[category]?.delta;
              line(viewport, `${CATEGORY_LABELS[category]} change: ${d == null ? "—" : `${signed(d)} pts`}`);
            }
            line(viewport, `Resolved audits: ${comparison.resolvedAudits.join(", ") || "None"}`, ctx.theme.ok);
            line(viewport, `New audits: ${comparison.newAudits.join(", ") || "None"}`, ctx.theme.warn);
          } catch (error) {
            if (!(error instanceof AppError) || error.code !== ExitCode.NOT_FOUND) throw error;
            line(viewport, "No earlier measurement for this strategy.");
          }
        }
        const items = level === "pages" ? pages : measurements;
        const previous = items.findIndex((item) => item.id === oldId);
        select(previous >= 0 ? previous : index);
      }, { create: false });
    } catch (error) {
      clear();
      if (error instanceof AppError && error.code === ExitCode.NOT_FOUND) {
        status.content = `No history in ${project}`;
        line(viewport, "Measure a page first: pagespeedfy run <url>");
      } else {
        status.content = "Unable to load history. Press r to retry.";
        line(viewport, `Project: ${project}`);
      }
    }
  };
  return {
    id: "history", title: "History", description: "Project measurement history",
    keys: [{ key: "↑/↓", action: "move" }, { key: "Enter", action: "open" }, { key: "Esc", action: "back" }, { key: "f", action: "filter" }, { key: "r", action: "reload" }],
    mount: (context) => {
      ctx = context; project = resolveProject().root;
      root = panel(ctx.renderer, ctx.theme, { title: "History", flexGrow: 1, active: true });
      root.minHeight = 0;
      status = new TextRenderable(ctx.renderer, { content: "Loading history…", fg: ctx.theme.textDim, flexShrink: 0, wrapMode: "word" });
      root.add(status);
      return root;
    },
    onEnter: () => load(),
    onKey: (name) => {
      if (name === "r") { load(); return true; }
      if (name === "escape" && level !== "pages") {
        if (level === "detail") { level = "timeline"; index = timelineIndex; }
        else { level = "pages"; index = pageIndex; }
        load(false); return true;
      }
      if (name === "f" && level === "timeline") {
        filter = filter === "all" ? "mobile" : filter === "mobile" ? "desktop" : "all";
        load(); return true;
      }
      if (["up", "k", "down", "j"].includes(name)) {
        const delta = name === "up" || name === "k" ? -1 : 1;
        if (level === "detail") viewport.scrollBy(delta);
        else select(index + delta);
        return true;
      }
      if (name === "return" || name === "enter") {
        if (level === "pages" && rows.length && pages[index]) {
          pageId = pages[index]!.id; pageIndex = index; index = 0; level = "timeline"; load(false);
        } else if (level === "timeline" && rows.length && measurements[index]) {
          measurementId = measurements[index]!.id; timelineIndex = index; level = "detail"; load(false);
        }
        return true;
      }
      return false;
    },
  };
}
