/**
 * Repository of the project history: pages and measurements.
 *
 * The only place with SQL for these tables. The `run`, `history`, `report`
 * and `compare` commands, the MCP tools and the TUI history screen call
 * these functions, so the three modes read and write the same way.
 * Functions receive the open Database, which keeps them testable with
 * `openDatabase(":memory:")`.
 */
import type { Database } from "bun:sqlite";
import { AppError } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import type { Category, Run, Strategy } from "../pagespeed/report.ts";

/** Scores of one measurement, 0 to 100, null when the category was not requested. */
export type Scores = Record<Category, number | null>;

/** Lab metric values in milliseconds (CLS is unitless). */
export interface LabValues {
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  si: number | null;
  tti: number | null;
}

/** Measurement without the full run JSON, for lists and charts. */
export interface MeasurementSummary {
  id: number;
  pageId: number;
  url: string;
  session: string;
  strategy: Strategy;
  measuredAt: string;
  note: string | null;
  samples: number;
  toolVersion: string;
  lighthouseVersion: string;
  scores: Scores;
  lab: LabValues;
  failedAudits: number;
}

/** Measurement with the full normalized run. */
export interface Measurement extends MeasurementSummary {
  run: Run;
}

/** Tracked page with its counters and the latest scores per strategy. */
export interface PageSummary {
  id: number;
  url: string;
  host: string;
  createdAt: string;
  measurements: number;
  lastMeasuredAt: string | null;
  latest: Partial<Record<Strategy, MeasurementSummary>>;
}

/** Input of `recordMeasurement`. */
export interface NewMeasurement {
  url: string;
  host: string;
  session: string;
  measuredAt: string;
  note?: string | null;
  toolVersion: string;
  run: Run;
}

interface MeasurementRow {
  id: number;
  page_id: number;
  url: string;
  session: string;
  strategy: string;
  measured_at: string;
  note: string | null;
  samples: number;
  tool_version: string;
  lighthouse_version: string;
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  si: number | null;
  tti: number | null;
  failed_audits: number;
  run?: string;
}

interface PageRow {
  id: number;
  url: string;
  host: string;
  created_at: string;
  measurements: number;
  last_measured_at: string | null;
}

const SUMMARY_COLUMNS = `m.id, m.page_id, p.url, m.session, m.strategy, m.measured_at, m.note, m.samples, m.tool_version,
  m.lighthouse_version, m.performance, m.accessibility, m.best_practices, m.seo, m.fcp, m.lcp, m.tbt, m.cls, m.si, m.tti,
  m.failed_audits`;

function toSummary(row: MeasurementRow): MeasurementSummary {
  return {
    id: row.id,
    pageId: row.page_id,
    url: row.url,
    session: row.session,
    strategy: row.strategy as Strategy,
    measuredAt: row.measured_at,
    note: row.note,
    samples: row.samples,
    toolVersion: row.tool_version,
    lighthouseVersion: row.lighthouse_version,
    scores: { performance: row.performance, accessibility: row.accessibility, "best-practices": row.best_practices, seo: row.seo },
    lab: { fcp: row.fcp, lcp: row.lcp, tbt: row.tbt, cls: row.cls, si: row.si, tti: row.tti },
    failedAudits: row.failed_audits,
  };
}

function toMeasurement(row: MeasurementRow): Measurement {
  let run: Run;
  try {
    run = JSON.parse(row.run ?? "") as Run;
  } catch {
    throw new AppError(ExitCode.CONFIG, `Measurement ${row.id} has an unreadable run in the history database.`);
  }
  return { ...toSummary(row), run };
}

/** Returns the page id for the URL, creating the page on first use. */
export function upsertPage(db: Database, url: string, host: string, now: string): number {
  db.query<never, { url: string; host: string; now: string }>("INSERT INTO pages (url, host, created_at) VALUES ($url, $host, $now) ON CONFLICT (url) DO NOTHING").run({ url, host, now });
  return db.query<{ id: number }, { url: string }>("SELECT id FROM pages WHERE url = $url").get({ url })!.id;
}

/** Stores one measurement and returns its summary. */
export function recordMeasurement(db: Database, input: NewMeasurement): MeasurementSummary {
  const { run } = input;
  const lab = run.labMetrics;
  const value = (id: keyof typeof lab) => lab[id]?.numericValue ?? null;
  const id = db.transaction(() => {
    const pageId = upsertPage(db, input.url, input.host, input.measuredAt);
    const row = db
      .query<{ id: number }, Record<string, string | number | null>>(
        `INSERT INTO measurements (page_id, session, strategy, measured_at, note, samples, tool_version, lighthouse_version,
          performance, accessibility, best_practices, seo, fcp, lcp, tbt, cls, si, tti, failed_audits, run)
        VALUES ($pageId, $session, $strategy, $measuredAt, $note, $samples, $toolVersion, $lighthouseVersion,
          $performance, $accessibility, $bestPractices, $seo, $fcp, $lcp, $tbt, $cls, $si, $tti, $failedAudits, $run)
        RETURNING id`,
      )
      .get({
        pageId,
        session: input.session,
        strategy: run.strategy,
        measuredAt: input.measuredAt,
        note: input.note ?? null,
        samples: run.samples,
        toolVersion: input.toolVersion,
        lighthouseVersion: run.lighthouseVersion,
        performance: run.scores.performance ?? null,
        accessibility: run.scores.accessibility ?? null,
        bestPractices: run.scores["best-practices"] ?? null,
        seo: run.scores.seo ?? null,
        fcp: value("first-contentful-paint"),
        lcp: value("largest-contentful-paint"),
        tbt: value("total-blocking-time"),
        cls: value("cumulative-layout-shift"),
        si: value("speed-index"),
        tti: value("interactive"),
        failedAudits: run.failedAudits.length,
        run: JSON.stringify(run),
      })!;
    return row.id;
  })();
  return getMeasurementSummary(db, id);
}

/** Returns one measurement summary or raises NOT_FOUND. */
export function getMeasurementSummary(db: Database, id: number): MeasurementSummary {
  const row = db.query<MeasurementRow, { id: number }>(`SELECT ${SUMMARY_COLUMNS} FROM measurements m JOIN pages p ON p.id = m.page_id WHERE m.id = $id`).get({ id });
  if (!row) throw new AppError(ExitCode.NOT_FOUND, `Measurement ${id} not found in the history.`);
  return toSummary(row);
}

/** Returns one measurement with its full run or raises NOT_FOUND. */
export function getMeasurement(db: Database, id: number): Measurement {
  const row = db
    .query<MeasurementRow, { id: number }>(`SELECT ${SUMMARY_COLUMNS}, m.run FROM measurements m JOIN pages p ON p.id = m.page_id WHERE m.id = $id`)
    .get({ id });
  if (!row) throw new AppError(ExitCode.NOT_FOUND, `Measurement ${id} not found in the history.`);
  return toMeasurement(row);
}

/** Finds a page by exact URL; returns undefined when it was never measured. */
export function findPage(db: Database, url: string): { id: number; url: string } | undefined {
  return db.query<{ id: number; url: string }, { url: string }>("SELECT id, url FROM pages WHERE url = $url").get({ url }) ?? undefined;
}

/** Lists tracked pages, most recently measured first, with the latest scores per strategy. */
export function listPages(db: Database): PageSummary[] {
  const rows = db
    .query<PageRow, Record<string, never>>(
      `SELECT p.id, p.url, p.host, p.created_at, COUNT(m.id) AS measurements, MAX(m.measured_at) AS last_measured_at
       FROM pages p LEFT JOIN measurements m ON m.page_id = p.id
       GROUP BY p.id ORDER BY last_measured_at DESC, p.id DESC`,
    )
    .all({});
  const latest = db.query<MeasurementRow, { pageId: number; strategy: string }>(
    `SELECT ${SUMMARY_COLUMNS} FROM measurements m JOIN pages p ON p.id = m.page_id
     WHERE m.page_id = $pageId AND m.strategy = $strategy ORDER BY m.measured_at DESC, m.id DESC LIMIT 1`,
  );
  return rows.map((row) => {
    const byStrategy: PageSummary["latest"] = {};
    for (const strategy of ["mobile", "desktop"] as const) {
      const m = latest.get({ pageId: row.id, strategy });
      if (m) byStrategy[strategy] = toSummary(m);
    }
    return {
      id: row.id,
      url: row.url,
      host: row.host,
      createdAt: row.created_at,
      measurements: row.measurements,
      lastMeasuredAt: row.last_measured_at,
      latest: byStrategy,
    };
  });
}

/**
 * Lists measurements newest first. Filters by page and strategy when
 * given; `limit` caps the result.
 */
export function listMeasurements(db: Database, filter: { pageId?: number; strategy?: Strategy; limit?: number } = {}): MeasurementSummary[] {
  return db
    .query<MeasurementRow, { pageId: number | null; strategy: string | null; limit: number }>(
      `SELECT ${SUMMARY_COLUMNS} FROM measurements m JOIN pages p ON p.id = m.page_id
       WHERE ($pageId IS NULL OR m.page_id = $pageId) AND ($strategy IS NULL OR m.strategy = $strategy)
       ORDER BY m.measured_at DESC, m.id DESC LIMIT $limit`,
    )
    .all({ pageId: filter.pageId ?? null, strategy: filter.strategy ?? null, limit: filter.limit ?? 1000 })
    .map(toSummary);
}

/**
 * Returns the measurement taken just before `m` for the same page and
 * strategy (by time, then id), or undefined when `m` is the first one.
 */
export function previousMeasurement(db: Database, m: Pick<MeasurementSummary, "id" | "pageId" | "strategy" | "measuredAt">): MeasurementSummary | undefined {
  const row = db
    .query<MeasurementRow, { pageId: number; strategy: string; measuredAt: string; id: number }>(
      `SELECT ${SUMMARY_COLUMNS} FROM measurements m JOIN pages p ON p.id = m.page_id
       WHERE m.page_id = $pageId AND m.strategy = $strategy
         AND (m.measured_at < $measuredAt OR (m.measured_at = $measuredAt AND m.id < $id))
       ORDER BY m.measured_at DESC, m.id DESC LIMIT 1`,
    )
    .get({ pageId: m.pageId, strategy: m.strategy, measuredAt: m.measuredAt, id: m.id });
  return row ? toSummary(row) : undefined;
}

/** Tells whether the page already has a measurement of `strategy` taken at `measuredAt`. */
export function hasMeasurementAt(db: Database, url: string, strategy: Strategy, measuredAt: string): boolean {
  return Boolean(
    db
      .query<{ found: number }, { url: string; strategy: string; measuredAt: string }>(
        `SELECT 1 AS found FROM measurements m JOIN pages p ON p.id = m.page_id
         WHERE p.url = $url AND m.strategy = $strategy AND m.measured_at = $measuredAt LIMIT 1`,
      )
      .get({ url, strategy, measuredAt }),
  );
}

/** Removes one measurement or raises NOT_FOUND. Pages without measurements are removed too. */
export function removeMeasurement(db: Database, id: number): void {
  db.transaction(() => {
    const { changes } = db.query<never, { id: number }>("DELETE FROM measurements WHERE id = $id").run({ id });
    if (changes === 0) throw new AppError(ExitCode.NOT_FOUND, `Measurement ${id} not found in the history.`);
    db.run("DELETE FROM pages WHERE id NOT IN (SELECT DISTINCT page_id FROM measurements)");
  })();
}
