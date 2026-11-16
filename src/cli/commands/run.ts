/**
 * `run <url>`: measures one page with PageSpeed Insights and records the
 * median run of each strategy in the project history.
 *
 * Progress goes to stderr; stdout gets the summary (or the JSON envelope).
 * With `--fail-under`, the command exits with BUDGET (10) when a score is
 * below the budget, which makes it usable as a CI gate.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { checkBudget, parseBudget } from "../../pagespeed/budget.ts";
import { DEFAULTS, MAX_SAMPLES, measurePage } from "../../pagespeed/measure.ts";
import { CATEGORIES } from "../../pagespeed/report.ts";
import { formatMetric } from "../../pagespeed/markdown.ts";
import { color } from "../format.ts";
import { PROJECT_OPTION, band, intOption, parseCategories, parseStrategies, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const runCommand: Command = {
  name: "run",
  description: "Measure ONE page with PageSpeed Insights and record it in the project history.",
  longDescription:
    "Queries mobile and desktop in parallel, takes --samples readings per strategy and keeps the median by performance score. Raw responses go to <project>/.pagespeedfy/reports/ and the median runs to <project>/.pagespeedfy/history.db. Needs an API key: PAGESPEEDFY_API_KEY or the vault entry pagespeed.api_key.",
  arguments: [{ name: "url", description: "Full public URL of the page (http or https).", required: true }],
  options: [
    { name: "--strategy", aliases: ["-s"], argument: { name: "strategy", values: ["mobile", "desktop", "all"] }, description: "Strategy to measure.", default: "all" },
    { name: "--category", aliases: ["-c"], argument: { name: "list" }, description: `Comma-separated categories (${CATEGORIES.join(", ")}). Default: all.` },
    { name: "--samples", aliases: ["-n"], argument: { name: "n" }, description: `Readings per strategy; the median is recorded (1 to ${MAX_SAMPLES}).`, default: String(DEFAULTS.samples) },
    { name: "--note", aliases: ["-m"], argument: { name: "text" }, description: "What changed before this measurement, shown in the history timeline." },
    { name: "--fail-under", argument: { name: "budget" }, description: "Minimum scores, e.g. performance=90,seo=95 (a bare number applies to every category). Exit code 10 when any is below." },
    { name: "--locale", aliases: ["-l"], argument: { name: "locale" }, description: "Language of the audit texts.", default: DEFAULTS.locale },
    { name: "--max-items", argument: { name: "n" }, description: "Detail items kept per failed audit.", default: String(DEFAULTS.maxItems) },
    { name: "--timeout", argument: { name: "seconds" }, description: "Maximum time per API query.", default: String(DEFAULTS.timeoutSeconds) },
    { name: "--retries", argument: { name: "n" }, description: "Attempts per query on HTTP 429 and 5xx.", default: String(DEFAULTS.retries) },
    PROJECT_OPTION,
  ],
  exitCodes: [ExitCode.CREDENTIALS, ExitCode.NETWORK_OR_API, ExitCode.CONFIG, ExitCode.PERMISSION, ExitCode.BUDGET],
  examples: [
    `${manifest.bin} run https://example.com/`,
    `${manifest.bin} run https://example.com/pricing --samples 3 --note "lazy-load hero video"`,
    `${manifest.bin} run https://example.com/ --strategy mobile --fail-under performance=90 --json`,
  ],
  run: async (ctx) => {
    const budget = stringOption(ctx.options, "fail-under");
    const parsedBudget = budget ? parseBudget(budget) : undefined;
    const result = await measurePage({
      url: ctx.args[0] as string,
      strategies: parseStrategies(stringOption(ctx.options, "strategy")),
      categories: parseCategories(stringOption(ctx.options, "category")),
      samples: intOption(ctx.options, "samples", DEFAULTS.samples, MAX_SAMPLES),
      note: stringOption(ctx.options, "note") ?? null,
      locale: stringOption(ctx.options, "locale") ?? DEFAULTS.locale,
      maxItems: intOption(ctx.options, "max-items", DEFAULTS.maxItems),
      timeoutMs: intOption(ctx.options, "timeout", DEFAULTS.timeoutSeconds) * 1000,
      retries: intOption(ctx.options, "retries", DEFAULTS.retries, 10),
      project: stringOption(ctx.options, "project"),
      onProgress: ctx.json ? undefined : ctx.stderr,
    });
    const failures = parsedBudget ? checkBudget(parsedBudget, result.measurements.map((m) => m.run)) : [];

    const data = {
      url: result.url,
      project: result.project.root,
      database: result.project.database,
      session: result.session,
      measurements: result.measurements.map(({ run, ...m }) => ({ ...m, rawFile: run.rawFile, sampleScores: run.sampleScores })),
      budget: parsedBudget ? { minimums: parsedBudget, failures, passed: failures.length === 0 } : null,
    };

    return {
      data,
      code: failures.length > 0 ? ExitCode.BUDGET : ExitCode.SUCCESS,
      text: () => {
        const lines = result.measurements.map((m) => {
          const s = m.scores;
          const scores = `perf ${band(s.performance)} · a11y ${band(s.accessibility)} · bp ${band(s["best-practices"])} · seo ${band(s.seo)}`;
          const lab = `LCP ${formatMetric("lcp", m.lab.lcp)} · TBT ${formatMetric("tbt", m.lab.tbt)} · CLS ${formatMetric("cls", m.lab.cls)}`;
          const samples = m.samples > 1 ? color.dim(` · median of ${m.samples}`) : "";
          return `${m.strategy.padEnd(7)} #${m.id}  ${scores}  ${color.dim(lab)} · ${m.failedAudits} failed audits${samples}`;
        });
        lines.push(color.dim(`History: ${result.project.database}`));
        lines.push(color.dim(`Details: ${manifest.bin} report ${result.measurements[0]?.id ?? ""} · Timeline: ${manifest.bin} history ${result.url}`));
        for (const f of failures) lines.push(color.error(`Budget: ${f.strategy} ${f.category} ${f.score ?? "—"} < ${f.minimum}`));
        return lines.join("\n");
      },
    };
  },
};
