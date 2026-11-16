/**
 * `report <ref>`: prints one stored measurement in full: scores, lab
 * metrics, field data and every failed audit with its detail items.
 *
 * `<ref>` is a measurement id or a page URL (its latest measurement for
 * `--strategy`). `--json` returns the full normalized run.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { measurementMarkdown } from "../../pagespeed/markdown.ts";
import { findMeasurement, withHistory } from "../../pagespeed/queries.ts";
import { PROJECT_OPTION, READ_STRATEGY_OPTION, readStrategy, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const reportCommand: Command = {
  name: "report",
  description: "Print one stored measurement with its failed audits.",
  arguments: [{ name: "ref", description: "Measurement id, or a page URL for its latest measurement.", required: true }],
  options: [READ_STRATEGY_OPTION, PROJECT_OPTION],
  exitCodes: [ExitCode.NOT_FOUND, ExitCode.CONFIG],
  examples: [`${manifest.bin} report 12`, `${manifest.bin} report https://example.com/ --strategy desktop`, `${manifest.bin} report 12 --json`],
  run: (ctx) =>
    withHistory(stringOption(ctx.options, "project"), (db) => {
      const measurement = findMeasurement(db, ctx.args[0] as string, readStrategy(ctx.options));
      return { data: measurement, text: () => measurementMarkdown(measurement) };
    }),
};
