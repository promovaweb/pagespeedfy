/**
 * `compare <ref> [ref]`: compares two measurements of the same page.
 *
 * - `compare <url>`: the two latest measurements of the page (`--strategy`);
 * - `compare <id>`: that measurement and the previous one of the same page
 *   and strategy;
 * - `compare <before> <after>`: two ids or URLs, in that order.
 *
 * `--fail-on-regression` exits with BUDGET (10) when a score dropped or a
 * new audit failed.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { comparisonMarkdown } from "../../pagespeed/markdown.ts";
import { comparePair, withHistory } from "../../pagespeed/queries.ts";
import { PROJECT_OPTION, READ_STRATEGY_OPTION, readStrategy, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const compareCommand: Command = {
  name: "compare",
  description: "Compare two measurements: score and metric changes, resolved and new audits.",
  longDescription:
    "With one URL, compares its two latest measurements. With one id, compares it with the previous measurement of the same page and strategy. With two references, compares them in the given order (before, after).",
  arguments: [
    { name: "before", description: "Measurement id or page URL.", required: true },
    { name: "after", description: "Measurement id or page URL. Omit to pick the previous measurement automatically." },
  ],
  options: [
    READ_STRATEGY_OPTION,
    { name: "--fail-on-regression", description: "Exit with code 10 when a score dropped or a new audit failed." },
    PROJECT_OPTION,
  ],
  exitCodes: [ExitCode.NOT_FOUND, ExitCode.CONFIG, ExitCode.BUDGET],
  examples: [
    `${manifest.bin} compare https://example.com/`,
    `${manifest.bin} compare 12 15`,
    `${manifest.bin} compare https://example.com/ --strategy desktop --fail-on-regression`,
  ],
  run: (ctx) =>
    withHistory(stringOption(ctx.options, "project"), (db) => {
      const comparison = comparePair(db, ctx.args[0] as string, ctx.args[1], readStrategy(ctx.options));
      const fail = ctx.options["fail-on-regression"] === true && comparison.regression;
      return { data: comparison, text: () => comparisonMarkdown(comparison), code: fail ? ExitCode.BUDGET : ExitCode.SUCCESS };
    }),
};
