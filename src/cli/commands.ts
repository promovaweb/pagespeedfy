/**
 * Root of the command registry.
 *
 * Imports each command from `commands/` and builds the tree. The order
 * defines the display order in `--help` and in the OpenCLI description:
 * the PageSpeed commands first, then the commands inherited from the
 * Termfy starter kit.
 */
import { manifest } from "../app/manifest.ts";
import { aboutCommand } from "./commands/about.ts";
import { compareCommand } from "./commands/compare.ts";
import { configCommand } from "./commands/config.ts";
import { credentialsCommand } from "./commands/credentials.ts";
import { forgetCommand } from "./commands/forget.ts";
import { historyCommand } from "./commands/history.ts";
import { importCommand } from "./commands/import.ts";
import { mcpCommand } from "./commands/mcp.ts";
import { reportCommand } from "./commands/report.ts";
import { runCommand } from "./commands/run.ts";
import { createSkillCommand } from "./commands/skill.ts";
import { tuiCommand } from "./commands/tui.ts";
import { doctorCommand } from "./commands/doctor.ts";
import { createCompletionCommand } from "./commands/completion.ts";
import type { Command } from "./registry.ts";

export const root: Command = {
  name: manifest.bin,
  description: manifest.description,
  subcommands: [
    runCommand,
    historyCommand,
    reportCommand,
    compareCommand,
    importCommand,
    forgetCommand,
    tuiCommand,
    aboutCommand,
    configCommand,
    credentialsCommand,
    mcpCommand,
    createSkillCommand(() => root),
    doctorCommand,
    createCompletionCommand(() => root),
  ],
  examples: [
    `${manifest.bin}`,
    `${manifest.bin} credentials set pagespeed.api_key`,
    `${manifest.bin} run https://example.com/ --note "first measurement"`,
    `${manifest.bin} history https://example.com/`,
    `${manifest.bin} compare https://example.com/`,
    `${manifest.bin} mcp`,
    `${manifest.bin} --skill`,
  ],
};
