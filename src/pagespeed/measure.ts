/**
 * Measures one page and records the result in the project history.
 *
 * Shared by the `run` command, the `pagespeed_run` MCP tool and the TUI, so
 * a measurement means the same thing in the three modes:
 *
 * 1. validate the URL and resolve the API key (env, then vault);
 * 2. query every strategy in parallel; inside a strategy, take `samples`
 *    readings one after the other;
 * 3. save every raw response under `.pagespeedfy/reports/`;
 * 4. keep the median sample per strategy (by performance score) and store
 *    it in `history.db`, all strategies under one session id.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { classifyFsError } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import { manifest } from "../app/manifest.ts";
import { openDatabase } from "../db/database.ts";
import { recordMeasurement, type MeasurementSummary } from "../db/history.ts";
import { queryPagespeed, type Sleep, type Transport } from "./api.ts";
import { resolveApiKey } from "./key.ts";
import { ensureProjectDir, resolveProject, stamp, type ProjectPaths } from "./project.ts";
import { CATEGORIES, medianRun, normalizeRun, type Category, type Run, type Strategy } from "./report.ts";
import { pageKey, routeSlug, validateUrl } from "./url.ts";

/** Options of one measurement. */
export interface MeasureOptions {
  url: string;
  strategies: readonly Strategy[];
  categories?: readonly Category[];
  locale?: string;
  /** Readings per strategy; the median is kept. */
  samples?: number;
  maxItems?: number;
  timeoutMs?: number;
  retries?: number;
  /** Free text describing what changed before this measurement. */
  note?: string | null;
  /** Project root; resolved from the current directory when absent. */
  project?: string;
  /** Progress messages (stderr in the CLI, nothing in MCP). */
  onProgress?: (text: string) => void;
  transport?: Transport;
  sleep?: Sleep;
  now?: () => Date;
}

/** Result of one measurement. */
export interface MeasureResult {
  project: ProjectPaths;
  session: string;
  url: string;
  measurements: Array<MeasurementSummary & { run: Run }>;
}

/** Default values, also documented in docs/cli.md. */
export const DEFAULTS = { locale: "pt-BR", samples: 1, maxItems: 50, timeoutSeconds: 180, retries: 3 } as const;

/** Upper bound for `--samples`, to keep the API quota safe. */
export const MAX_SAMPLES = 9;

/**
 * Creates a folder for this run that no other run uses. Two runs in the
 * same second (or two URLs whose slugs collide) get `-2`, `-3` and so on,
 * so a raw response is never overwritten.
 */
export function reserveRunFolder(base: string, name: string): string {
  try {
    mkdirSync(base, { recursive: true });
    for (let n = 1; ; n += 1) {
      const folder = join(base, n === 1 ? name : `${name}-${n}`);
      try {
        mkdirSync(folder);
        return folder;
      } catch (e) {
        if ((e as { code?: string }).code !== "EEXIST") throw e;
      }
    }
  } catch (e) {
    throw classifyFsError(e, ExitCode.CONFIG, `Could not create a report folder under ${base}`);
  }
}

/** Measures the page and stores the median run of each strategy. */
export async function measurePage(options: MeasureOptions): Promise<MeasureResult> {
  const progress = options.onProgress ?? (() => {});
  const url = validateUrl(options.url);
  const { apiKey } = resolveApiKey(progress);
  const categories = options.categories && options.categories.length > 0 ? options.categories : CATEGORIES;
  const samples = Math.min(Math.max(1, options.samples ?? DEFAULTS.samples), MAX_SAMPLES);
  const maxItems = options.maxItems ?? DEFAULTS.maxItems;
  const now = options.now ?? (() => new Date());
  const started = now();

  const project = ensureProjectDir(resolveProject(options.project));
  const folder = reserveRunFolder(join(project.reports, url.host.replace(/:/g, "_"), routeSlug(url)), stamp(started));

  const measureStrategy = async (strategy: Strategy): Promise<Run> => {
    const runs: Run[] = [];
    for (let n = 1; n <= samples; n += 1) {
      progress(`Measuring ${strategy}${samples > 1 ? ` (${n}/${samples})` : ""}: ${url.toString()}\n`);
      const raw = await queryPagespeed(
        {
          url: url.toString(),
          apiKey,
          strategy,
          categories,
          locale: options.locale ?? DEFAULTS.locale,
          timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutSeconds * 1000,
          retries: options.retries ?? DEFAULTS.retries,
        },
        options.transport,
        options.sleep,
      );
      const file = join(folder, `${strategy}-${n}.raw.json`);
      writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      runs.push(normalizeRun(raw, strategy, relative(project.dataDir, file), maxItems));
    }
    return medianRun(runs);
  };

  const runs = await Promise.all(options.strategies.map(measureStrategy));

  const session = crypto.randomUUID();
  const measuredAt = started.toISOString();
  const key = pageKey(url);
  const db = openDatabase(project.database);
  try {
    const measurements = runs.map((run) => ({
      ...recordMeasurement(db, { url: key, host: url.host, session, measuredAt, note: options.note ?? null, toolVersion: manifest.version, run }),
      run,
    }));
    return { project, session, url: key, measurements };
  } finally {
    db.close();
  }
}
