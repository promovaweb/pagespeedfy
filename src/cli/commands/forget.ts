/**
 * `forget <id>`: removes one measurement from the history, for readings
 * taken by mistake (wrong deploy, broken page). The raw JSON files stay in
 * `.pagespeedfy/reports/`. A page left without measurements disappears from
 * `history`.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import { getMeasurementSummary, removeMeasurement } from "../../db/history.ts";
import { withHistory } from "../../pagespeed/queries.ts";
import { PROJECT_OPTION, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const forgetCommand: Command = {
  name: "forget",
  description: "Remove one measurement from the history.",
  arguments: [{ name: "id", description: "Measurement id, as shown by history and run.", required: true }],
  options: [PROJECT_OPTION],
  exitCodes: [ExitCode.NOT_FOUND, ExitCode.CONFIG],
  examples: [`${manifest.bin} forget 12`],
  run: (ctx) => {
    const ref = ctx.args[0] as string;
    if (!/^\d+$/.test(ref)) throw error.usage(`forget takes a measurement id, got "${ref}".`);
    return withHistory(stringOption(ctx.options, "project"), (db) => {
      const removed = getMeasurementSummary(db, Number(ref));
      removeMeasurement(db, removed.id);
      return { data: { removed }, text: `Removed measurement #${removed.id} (${removed.strategy}, ${removed.measuredAt}) of ${removed.url}.` };
    });
  },
};
