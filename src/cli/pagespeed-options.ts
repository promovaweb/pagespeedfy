/**
 * Option definitions and parsers shared by the PageSpeed commands.
 *
 * `--project` and `--strategy` appear in several commands with the same
 * meaning, so their definitions live here and every command reuses them.
 */
import { error } from "../app/errors.ts";
import { CATEGORIES, STRATEGIES, type Category, type Strategy } from "../pagespeed/report.ts";
import { color } from "./format.ts";
import type { OptionDefinition, Options } from "./registry.ts";

/** Colors a 0–100 score with the Lighthouse bands (0–49, 50–89, 90–100). */
export function band(score: number | null | undefined): string {
  if (score === null || score === undefined) return color.dim("—");
  const text = String(score);
  return score >= 90 ? color.ok(text) : score >= 50 ? color.warn(text) : color.error(text);
}

/** `--project <dir>`: project root that holds `.pagespeedfy/`. */
export const PROJECT_OPTION: OptionDefinition = {
  name: "--project",
  aliases: ["-p"],
  argument: { name: "dir" },
  description:
    "Project root that holds .pagespeedfy/ (history.db and raw reports). Default: PAGESPEEDFY_PROJECT, then the nearest folder with .pagespeedfy/, .git or package.json.",
};

/** `--strategy` for commands that read one strategy from the history. */
export const READ_STRATEGY_OPTION: OptionDefinition = {
  name: "--strategy",
  aliases: ["-s"],
  argument: { name: "strategy", values: STRATEGIES },
  description: "Strategy used when a URL stands for its latest measurement.",
  default: "mobile",
};

/** Reads a positive integer option, with a default and an upper bound. */
export function intOption(options: Options, key: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const raw = options[key];
  if (raw === undefined || raw === true) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > max) {
    throw error.usage(`--${key} must be an integer from 1 to ${max === Number.MAX_SAFE_INTEGER ? "∞" : max}.`);
  }
  return n;
}

/** Reads a string option or returns undefined. */
export function stringOption(options: Options, key: string): string | undefined {
  const raw = options[key];
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}

/** Parses `--category a,b` into unique categories. Absent means all. */
export function parseCategories(raw: string | undefined): Category[] {
  if (!raw) return [...CATEGORIES];
  const list: Category[] = [];
  for (const part of raw.split(",").map((p) => p.trim()).filter(Boolean)) {
    if (!(CATEGORIES as readonly string[]).includes(part)) {
      throw error.usage(`Invalid category "${part}". Use: ${CATEGORIES.join(", ")}.`);
    }
    if (!list.includes(part as Category)) list.push(part as Category);
  }
  return list.length > 0 ? list : [...CATEGORIES];
}

/** Expands `--strategy mobile|desktop|all`. */
export function parseStrategies(raw: string | undefined): Strategy[] {
  if (!raw || raw === "all") return [...STRATEGIES];
  return [raw as Strategy];
}

/** Reads the single strategy of read commands. */
export function readStrategy(options: Options): Strategy {
  return (stringOption(options, "strategy") as Strategy | undefined) ?? "mobile";
}
