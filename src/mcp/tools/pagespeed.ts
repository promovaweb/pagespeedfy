/**
 * PageSpeed tools: measure a page and read the project history.
 *
 * The tools call the same functions as the `run`, `history`, `report` and
 * `compare` commands, so an agent and a person get the same data. Expected
 * failures (missing key, private URL, empty history) come back as
 * `isError` results with the exit-code name, never as protocol errors.
 *
 * The MCP client decides the server's working directory, which is often
 * not the site being optimized: every tool accepts `project` to point at
 * the project root that holds `.pagespeedfy/`.
 */
import { z } from "zod";
import { AppError } from "../../app/errors.ts";
import { exitCodeName } from "../../app/exit-codes.ts";
import { listMeasurements, listPages } from "../../db/history.ts";
import { checkBudget, parseBudget } from "../../pagespeed/budget.ts";
import { comparisonMarkdown, measurementMarkdown, timelineMarkdown } from "../../pagespeed/markdown.ts";
import { MAX_SAMPLES, measurePage } from "../../pagespeed/measure.ts";
import { comparePair, findMeasurement, requirePage, withHistory } from "../../pagespeed/queries.ts";
import { CATEGORIES, STRATEGIES, type Strategy } from "../../pagespeed/report.ts";
import type { Registrar } from "../server.ts";

type ToolResult = { content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean };

const projectField = z
  .string()
  .min(1)
  .optional()
  .describe("Absolute path of the project root (the site repository). Default: the server's working directory and its parents.");
const strategyField = z.enum(STRATEGIES).optional().describe("Strategy used when a URL stands for its latest measurement. Default mobile.");

/** Wraps data as a tool result, with Markdown first when given. */
function ok(data: Record<string, unknown>, markdown?: string): ToolResult {
  const json = JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text: markdown ? `${markdown}\n\n${json}` : json }], structuredContent: data };
}

/** Turns an expected failure into an `isError` result. */
function fail(e: unknown): ToolResult {
  if (e instanceof AppError) {
    const d = { error: { code: e.code, name: exitCodeName(e.code), message: e.message } };
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }], structuredContent: d, isError: true };
  }
  throw e;
}

async function guard(work: () => Promise<ToolResult> | ToolResult): Promise<ToolResult> {
  try {
    return await work();
  } catch (e) {
    return fail(e);
  }
}

export function registerPagespeedTools({ server, catalog }: Registrar): void {
  catalog.tools.push({ name: "pagespeed_run", description: "Measure one page with PageSpeed Insights and record it in the project history." });
  server.registerTool(
    "pagespeed_run",
    {
      title: "Measure a page",
      description:
        "Use after deploying a change to a public page. Queries PageSpeed Insights (mobile and desktop in parallel), keeps the median of `samples` readings and stores it in <project>/.pagespeedfy/history.db. Returns scores, lab metrics, failed audit count and measurement ids. Takes 20 to 60 s per sample. Needs the API key in the vault or PAGESPEEDFY_API_KEY.",
      inputSchema: {
        url: z.string().url().describe("Full public URL of the page."),
        strategy: z.enum(["mobile", "desktop", "all"]).optional().describe("Strategy to measure. Default all."),
        categories: z.array(z.enum(CATEGORIES)).optional().describe("Lighthouse categories. Default all four."),
        samples: z.number().int().min(1).max(MAX_SAMPLES).optional().describe("Readings per strategy; the median is recorded. Default 1; use 3 to compare before and after."),
        note: z.string().max(500).optional().describe("What changed before this measurement, shown in the timeline."),
        failUnder: z.string().optional().describe("Budget like performance=90,seo=95. The result lists the categories below it."),
        project: projectField,
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ url, strategy, categories, samples, note, failUnder, project }) =>
      guard(async () => {
        const budget = failUnder ? parseBudget(failUnder) : undefined;
        const result = await measurePage({
          url,
          strategies: !strategy || strategy === "all" ? [...STRATEGIES] : [strategy as Strategy],
          categories,
          samples,
          note: note ?? null,
          project,
        });
        const failures = budget ? checkBudget(budget, result.measurements.map((m) => m.run)) : [];
        return ok({
          url: result.url,
          project: result.project.root,
          session: result.session,
          measurements: result.measurements.map(({ run, ...m }) => ({ ...m, sampleScores: run.sampleScores, topFailedAudits: run.failedAudits.slice(0, 5).map((a) => ({ id: a.id, title: a.title, metricSavings: a.metricSavings })) })),
          budget: budget ? { minimums: budget, failures, passed: failures.length === 0 } : null,
        });
      }),
  );

  catalog.tools.push({ name: "pagespeed_history", description: "Tracked pages, or the measurement timeline of one page." });
  server.registerTool(
    "pagespeed_history",
    {
      title: "Improvement history",
      description:
        "Use to see how a page evolved. Without url, lists every tracked page with its latest mobile and desktop scores. With url, returns its measurements (newest first in JSON, oldest first in the Markdown timeline) with scores, LCP, TBT, CLS, failed audits and notes. Read-only.",
      inputSchema: {
        url: z.string().url().optional().describe("Page whose timeline to return. Omit to list pages."),
        strategy: z.enum(STRATEGIES).optional().describe("Only this strategy. Default both."),
        limit: z.number().int().min(1).max(500).optional().describe("Most recent measurements returned. Default 50."),
        project: projectField,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ url, strategy, limit, project }) =>
      guard(() =>
        withHistory(project, (db, paths) => {
          if (!url) return ok({ project: paths.root, pages: listPages(db) });
          const measurements = listMeasurements(db, { pageId: requirePage(db, url), strategy, limit: limit ?? 50 });
          return ok({ project: paths.root, url, measurements }, timelineMarkdown(measurements[0]?.url ?? url, measurements));
        }),
      ),
  );

  catalog.tools.push({ name: "pagespeed_report", description: "One stored measurement with every failed audit and its detail items." });
  server.registerTool(
    "pagespeed_report",
    {
      title: "Measurement report",
      description:
        "Use to decide what to fix. Returns one stored measurement: scores, lab metrics, CrUX field data and failed audits sorted by impact, with selectors, URLs and estimated savings. `ref` is a measurement id or a page URL (its latest measurement). Read-only.",
      inputSchema: {
        ref: z.string().min(1).describe("Measurement id, or a page URL for its latest measurement."),
        strategy: strategyField,
        project: projectField,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ ref, strategy, project }) =>
      guard(() =>
        withHistory(project, (db) => {
          const m = findMeasurement(db, ref, strategy ?? "mobile");
          return ok({ measurement: m }, measurementMarkdown(m));
        }),
      ),
  );

  catalog.tools.push({ name: "pagespeed_compare", description: "Compare two measurements: score changes, resolved and new audits." });
  server.registerTool(
    "pagespeed_compare",
    {
      title: "Compare measurements",
      description:
        "Use after a fix to confirm it worked. With only `before` as a URL, compares the two latest measurements of that page; as an id, compares it with the previous one. With `before` and `after`, compares them in order. Returns deltas, resolved, new and remaining audits and `regression`. Read-only.",
      inputSchema: {
        before: z.string().min(1).describe("Measurement id or page URL."),
        after: z.string().min(1).optional().describe("Measurement id or page URL. Omit to pick automatically."),
        strategy: strategyField,
        project: projectField,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ before, after, strategy, project }) =>
      guard(() =>
        withHistory(project, (db) => {
          const c = comparePair(db, before, after, strategy ?? "mobile");
          return ok({ comparison: c }, comparisonMarkdown(c));
        }),
      ),
  );
}
