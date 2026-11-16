/**
 * `history [url]`: reads the project history.
 *
 * Without a URL, lists every tracked page with its latest scores per
 * strategy. With a URL, prints the timeline of that page, oldest first, so
 * the improvements read top to bottom, with the note given on each `run`.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { listMeasurements, listPages } from "../../db/history.ts";
import { formatDate, timelineMarkdown } from "../../pagespeed/markdown.ts";
import { requirePage, withHistory } from "../../pagespeed/queries.ts";
import { STRATEGIES, type Strategy } from "../../pagespeed/report.ts";
import { color } from "../format.ts";
import { PROJECT_OPTION, band, intOption, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const historyCommand: Command = {
  name: "history",
  description: "List the tracked pages, or the measurement timeline of one page.",
  longDescription:
    "Reads <project>/.pagespeedfy/history.db. Without a URL, lists the pages with their latest mobile and desktop scores. With a URL, lists its measurements oldest first, with scores, LCP, TBT, CLS, failed audits and the note of each run.",
  arguments: [{ name: "url", description: "Page whose timeline to show. Omit to list every page." }],
  options: [
    { name: "--strategy", aliases: ["-s"], argument: { name: "strategy", values: [...STRATEGIES, "all"] }, description: "Strategy shown in the timeline.", default: "all" },
    { name: "--limit", argument: { name: "n" }, description: "Most recent measurements shown in the timeline.", default: "50" },
    PROJECT_OPTION,
  ],
  exitCodes: [ExitCode.NOT_FOUND, ExitCode.CONFIG],
  examples: [`${manifest.bin} history`, `${manifest.bin} history https://example.com/ --strategy mobile`, `${manifest.bin} history https://example.com/ --json`],
  run: (ctx) => {
    const url = ctx.args[0];
    const project = stringOption(ctx.options, "project");
    if (!url) {
      return withHistory(project, (db, paths) => {
        const pages = listPages(db);
        return {
          data: { project: paths.root, pages },
          text: () => {
            if (pages.length === 0) return `No pages in ${paths.database} yet. Measure one with: ${manifest.bin} run <url>`;
            const rows = pages.map((p) => {
              const latest = (s: Strategy) => band(p.latest[s]?.scores.performance);
              return `${p.url}\n  ${color.dim(`${p.measurements} measurement(s) · last ${formatDate(p.lastMeasuredAt)}`)} · mobile ${latest("mobile")} · desktop ${latest("desktop")}`;
            });
            return [...rows, color.dim(`History: ${paths.database}`)].join("\n");
          },
        };
      });
    }
    const raw = stringOption(ctx.options, "strategy");
    const strategy = raw && raw !== "all" ? (raw as Strategy) : undefined;
    const limit = intOption(ctx.options, "limit", 50);
    return withHistory(project, (db, paths) => {
      const pageId = requirePage(db, url);
      const measurements = listMeasurements(db, { pageId, strategy, limit });
      const pageUrl = measurements[0]?.url ?? url;
      return { data: { project: paths.root, url: pageUrl, measurements }, text: () => timelineMarkdown(pageUrl, measurements) };
    });
  },
};
