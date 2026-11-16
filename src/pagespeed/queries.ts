/**
 * History queries shared by the CLI, the MCP tools and the TUI.
 *
 * A measurement reference is either a numeric id (`42`) or a page URL,
 * which means "the latest measurement of that page" for the given strategy.
 * `importLegacyReports` brings the `report.json` folders written by
 * Pagespeedfy 0.3.x into the history, so the timeline starts before the
 * upgrade.
 */
import type { Database } from "bun:sqlite";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { AppError, error } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import { openDatabase } from "../db/database.ts";
import { findPage, getMeasurement, hasMeasurementAt, listMeasurements, previousMeasurement, recordMeasurement, type Measurement } from "../db/history.ts";
import { compareMeasurements, type Comparison } from "./compare.ts";
import { ensureProjectDir, resolveProject, type ProjectPaths } from "./project.ts";
import { FORMAT_VERSION, STRATEGIES, type Run, type Strategy } from "./report.ts";
import { pageKey } from "./url.ts";

/**
 * Opens the history of the project and runs `work` with it, closing the
 * database afterwards. With `create: false`, a project without
 * `.pagespeedfy/history.db` raises NOT_FOUND instead of creating it.
 */
export function withHistory<T>(project: string | undefined, work: (db: Database, paths: ProjectPaths) => T, { create = false } = {}): T {
  const paths = resolveProject(project);
  if (!create) {
    try {
      statSync(paths.database);
    } catch {
      throw new AppError(ExitCode.NOT_FOUND, `No history in ${paths.root}. Measure a page first with: pagespeedfy run <url>`, { project: paths.root });
    }
  } else {
    ensureProjectDir(paths);
  }
  const db = openDatabase(paths.database);
  try {
    return work(db, paths);
  } finally {
    db.close();
  }
}

/** Normalizes a URL typed by the user to the page key stored in the history. */
export function normalizePageUrl(text: string): string {
  try {
    return pageKey(new URL(text));
  } catch {
    throw error.usage(`Invalid URL: ${text}. Give the full URL, with https://, or a measurement id.`);
  }
}

/** Returns the page id for a URL or raises NOT_FOUND. */
export function requirePage(db: Database, url: string): number {
  const page = findPage(db, normalizePageUrl(url));
  if (!page) throw new AppError(ExitCode.NOT_FOUND, `${url} has no measurements in this project.`);
  return page.id;
}

/** Resolves an id or URL to one measurement. URLs take the latest of `strategy`. */
export function findMeasurement(db: Database, ref: string, strategy: Strategy = "mobile"): Measurement {
  if (/^\d+$/.test(ref)) return getMeasurement(db, Number(ref));
  const pageId = requirePage(db, ref);
  const [latest] = listMeasurements(db, { pageId, strategy, limit: 1 });
  if (!latest) throw new AppError(ExitCode.NOT_FOUND, `${ref} has no ${strategy} measurement.`);
  return getMeasurement(db, latest.id);
}

/**
 * Resolves the pair for `compare`:
 * - two ids: those two measurements, in the given order;
 * - one URL: the two latest measurements of that page and strategy;
 * - one id: that measurement and the previous one of the same page and strategy.
 */
export function comparePair(db: Database, first: string, second: string | undefined, strategy: Strategy = "mobile"): Comparison {
  if (second !== undefined) return compareMeasurements(findMeasurement(db, first, strategy), findMeasurement(db, second, strategy));
  if (/^\d+$/.test(first)) {
    const after = getMeasurement(db, Number(first));
    const earlier = previousMeasurement(db, after);
    if (!earlier) throw new AppError(ExitCode.NOT_FOUND, `Measurement ${first} has no earlier ${after.strategy} measurement to compare with.`);
    return compareMeasurements(getMeasurement(db, earlier.id), after);
  }
  const pageId = requirePage(db, first);
  const [latest, previous] = listMeasurements(db, { pageId, strategy, limit: 2 });
  if (!latest || !previous) throw new AppError(ExitCode.NOT_FOUND, `${first} needs at least two ${strategy} measurements to compare.`);
  return compareMeasurements(getMeasurement(db, previous.id), getMeasurement(db, latest.id));
}

/** Legacy `report.json` shape written by Pagespeedfy 0.3.x. */
interface LegacyReport {
  tool?: string;
  toolVersion?: string;
  generatedAt?: string;
  url?: string;
  runs?: unknown[];
}

/** Finds every `report.json` under a folder (or the file itself). */
function findReports(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  const found: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) found.push(...findReports(full));
    else if (entry.name === "report.json") found.push(full);
  }
  return found.sort();
}

/**
 * Checks one legacy run and fills the fields 0.3.x may lack. Returns
 * undefined when the run cannot become a measurement.
 */
function legacyRun(value: unknown): Run | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const r = value as Partial<Run>;
  if (!(STRATEGIES as readonly unknown[]).includes(r.strategy)) return undefined;
  if (r.scores === null || typeof r.scores !== "object" || !Array.isArray(r.failedAudits)) return undefined;
  return {
    formatVersion: FORMAT_VERSION,
    strategy: r.strategy as Strategy,
    requestedUrl: typeof r.requestedUrl === "string" ? r.requestedUrl : "",
    finalUrl: typeof r.finalUrl === "string" ? r.finalUrl : "",
    fetchTime: typeof r.fetchTime === "string" ? r.fetchTime : "",
    lighthouseVersion: typeof r.lighthouseVersion === "string" ? r.lighthouseVersion : "",
    userAgent: typeof r.userAgent === "string" ? r.userAgent : "",
    runWarnings: Array.isArray(r.runWarnings) ? r.runWarnings : [],
    runtimeError: typeof r.runtimeError === "string" ? r.runtimeError : null,
    scores: r.scores,
    labMetrics: r.labMetrics && typeof r.labMetrics === "object" ? r.labMetrics : {},
    field: r.field && typeof r.field === "object" ? r.field : { page: null, origin: null },
    failedAudits: r.failedAudits,
    manualAudits: Array.isArray(r.manualAudits) ? r.manualAudits : [],
    passedAuditIds: Array.isArray(r.passedAuditIds) ? r.passedAuditIds : [],
    rawFile: typeof r.rawFile === "string" ? r.rawFile : "",
    samples: 1,
    sampleScores: [r.scores.performance ?? null],
  };
}

/**
 * Imports Pagespeedfy 0.3.x reports found under `source` into the project
 * history. Reports already imported (same URL, strategy and time) are
 * skipped. A file with unreadable JSON, a bad URL or an invalid run goes to
 * `failed` and the others continue; each file is imported in one
 * transaction, so a file is never half imported.
 */
export function importLegacyReports(source: string, project?: string): { imported: number; skipped: number; failed: string[]; project: string } {
  const root = resolve(source);
  let files: string[];
  try {
    files = findReports(root);
  } catch {
    throw new AppError(ExitCode.NOT_FOUND, `Nothing to import at ${source}.`);
  }
  return withHistory(
    project,
    (db, paths) => {
      let imported = 0;
      let skipped = 0;
      const failed: string[] = [];
      for (const file of files) {
        let report: LegacyReport;
        let url: URL;
        let runs: Run[];
        try {
          report = JSON.parse(readFileSync(file, "utf8")) as LegacyReport;
          if (report === null || typeof report !== "object" || report.tool !== "pagespeedfy" || typeof report.url !== "string" || !Array.isArray(report.runs)) {
            throw new Error("not a Pagespeedfy report");
          }
          url = new URL(report.url);
          runs = report.runs.map(legacyRun).filter((r): r is Run => r !== undefined);
          if (runs.length !== report.runs.length) throw new Error("invalid run");
        } catch {
          failed.push(file);
          continue;
        }
        const key = pageKey(url);
        const session = crypto.randomUUID();
        const counts = db.transaction(() => {
          let added = 0;
          let seen = 0;
          for (const run of runs) {
            const measuredAt = typeof report.generatedAt === "string" ? report.generatedAt : run.fetchTime;
            if (hasMeasurementAt(db, key, run.strategy, measuredAt)) {
              seen += 1;
              continue;
            }
            recordMeasurement(db, { url: key, host: url.host, session, measuredAt, note: `Imported from ${file}`, toolVersion: report.toolVersion ?? "0.3", run });
            added += 1;
          }
          return { added, seen };
        })();
        imported += counts.added;
        skipped += counts.seen;
      }
      return { imported, skipped, failed, project: paths.root };
    },
    { create: true },
  );
}
