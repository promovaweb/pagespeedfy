/**
 * `import <path>`: brings the `report.json` folders written by
 * Pagespeedfy 0.3.x (default `pagespeedfy-reports/`) into the project
 * history, so the timeline starts before the upgrade. Reports already
 * imported are skipped, so running it twice is safe.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { importLegacyReports } from "../../pagespeed/queries.ts";
import { PROJECT_OPTION, stringOption } from "../pagespeed-options.ts";
import type { Command } from "../registry.ts";

export const importCommand: Command = {
  name: "import",
  description: "Import Pagespeedfy 0.3.x report.json folders into the project history.",
  arguments: [{ name: "path", description: "Folder searched recursively for report.json files, or one report.json.", required: true }],
  options: [PROJECT_OPTION],
  exitCodes: [ExitCode.NOT_FOUND, ExitCode.CONFIG, ExitCode.PERMISSION],
  examples: [`${manifest.bin} import pagespeedfy-reports`, `${manifest.bin} import pagespeedfy-reports --json`],
  run: (ctx) => {
    const result = importLegacyReports(ctx.args[0] as string, stringOption(ctx.options, "project"));
    const failed = result.failed.length > 0 ? `\nNot imported (unreadable or not a Pagespeedfy report):\n${result.failed.map((f) => `  ${f}`).join("\n")}` : "";
    return {
      data: result,
      text: `Imported ${result.imported} measurement(s), skipped ${result.skipped} already in the history, into ${result.project}.${failed}`,
    };
  },
};
