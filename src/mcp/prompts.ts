/**
 * Prompts: conversation templates that help the agent operate the binary.
 * The skeleton ships a single guidance prompt; derived projects add
 * domain-specific ones.
 */
import { z } from "zod";
import { manifest } from "../app/manifest.ts";
import type { Registrar } from "./server.ts";

export function registerPrompts({ server, catalog }: Registrar): void {
  catalog.prompts.push({ name: "operate", description: "Guides the agent to read the documentation and run a task through the CLI." });
  server.registerPrompt(
    "operate",
    {
      title: `Operate ${manifest.title}`,
      description: "Builds an instruction for the agent to read the embedded documentation and complete a task using the CLI with --json.",
      argsSchema: { task: z.string().describe("What the user wants to do with the binary.") },
    },
    ({ task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `You will operate the "${manifest.bin}" binary (v${manifest.version}). ` +
              `First call the "skill" tool with topic "cli" to learn the commands, options and exit codes. ` +
              `Then run the needed commands always with the --json option and handle the exit code: 0 is success, ` +
              `2 is usage error, 3 configuration, 4 credentials. Never ask the user for a credential value in chat; ` +
              `tell them to run "${manifest.bin} credentials set <name>" in their own terminal.\n\nTask: ${task}`,
          },
        },
      ],
    }),
  );

  catalog.prompts.push({ name: "optimize_page", description: "Guides the agent through measure, fix and compare for one page." });
  server.registerPrompt(
    "optimize_page",
    {
      title: "Optimize one page",
      description: "Builds the measure, fix, deploy and compare loop for one public page, recording each step in the project history.",
      argsSchema: {
        url: z.string().describe("Public URL of the page to optimize."),
        project: z.string().optional().describe("Absolute path of the site repository."),
      },
    },
    ({ url, project }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Optimize ${url} with ${manifest.bin}${project ? ` (project ${project})` : ""}. ` +
              `1. Call pagespeed_history for the page; if it has no measurement, call pagespeed_run with samples 3 and note "baseline". ` +
              `2. Call pagespeed_report and pick the failed audits with the highest weight and savings. ` +
              `3. Fix them in the site code, one group at a time, and wait for the user to deploy. ` +
              `4. Call pagespeed_run with samples 3 and a note describing the fix, then pagespeed_compare with the page URL. ` +
              `5. Report resolved and new audits and the score changes; repeat while it improves. ` +
              `Never ask for the API key in chat: tell the user to run "${manifest.bin} credentials set pagespeed.api_key" in their terminal.`,
          },
        },
      ],
    }),
  );
}
