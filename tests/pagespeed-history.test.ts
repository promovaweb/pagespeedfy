/** History repository and queries on an in-memory database, plus the 0.3.x import. */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../src/app/errors.ts";
import { ExitCode } from "../src/app/exit-codes.ts";
import { openDatabase } from "../src/db/database.ts";
import { getMeasurement, listMeasurements, listPages, recordMeasurement, removeMeasurement } from "../src/db/history.ts";
import { migrations } from "../src/db/migrations/index.ts";
import { comparePair, findMeasurement, importLegacyReports, withHistory } from "../src/pagespeed/queries.ts";
import { normalizeRun, type Run, type Strategy } from "../src/pagespeed/report.ts";

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures/mobile.raw.json"), "utf8"));
const URL_A = "https://example.com/";

function run(strategy: Strategy, performance: number, failed = 4): Run {
  const base = normalizeRun(fixture, strategy, "f", 50);
  return { ...base, scores: { ...base.scores, performance }, failedAudits: base.failedAudits.slice(0, failed) };
}

function record(db: Database, r: Run, measuredAt: string, note: string | null = null) {
  return recordMeasurement(db, { url: URL_A, host: "example.com", session: measuredAt, measuredAt, note, toolVersion: "test", run: r });
}

let db: Database;
beforeEach(() => {
  db = openDatabase(":memory:");
});
afterEach(() => db.close());

describe("history repository", () => {
  test("migrations create the schema from scratch", () => {
    const version = (db.query("PRAGMA user_version").get() as { user_version: number }).user_version;
    expect(version).toBe(migrations.length);
  });

  test("records measurements and lists pages with the latest score per strategy", () => {
    record(db, run("mobile", 40), "2026-11-01T10:00:00.000Z", "baseline");
    record(db, run("desktop", 80), "2026-11-01T10:00:00.000Z", "baseline");
    record(db, run("mobile", 65), "2026-11-02T10:00:00.000Z", "lazy images");
    const [page] = listPages(db);
    expect(page?.measurements).toBe(3);
    expect(page?.latest.mobile?.scores.performance).toBe(65);
    expect(page?.latest.desktop?.scores.performance).toBe(80);
    const mobile = listMeasurements(db, { pageId: page!.id, strategy: "mobile" });
    expect(mobile.map((m) => m.note)).toEqual(["lazy images", "baseline"]);
    expect(getMeasurement(db, mobile[0]!.id).run.scores.performance).toBe(65);
  });

  test("missing measurements raise NOT_FOUND", () => {
    expect(() => getMeasurement(db, 99)).toThrow(AppError);
    expect(() => findMeasurement(db, "https://nowhere.example/")).toThrow(/no measurements/);
  });

  test("compare resolves by URL, by id and by pair, and flags regressions", () => {
    const first = record(db, run("mobile", 70, 2), "2026-11-01T10:00:00.000Z");
    const second = record(db, run("mobile", 60, 4), "2026-11-02T10:00:00.000Z");
    const byUrl = comparePair(db, URL_A, undefined, "mobile");
    expect(byUrl.before.id).toBe(first.id);
    expect(byUrl.after.id).toBe(second.id);
    expect(byUrl.scores.performance?.delta).toBe(-10);
    expect(byUrl.newAudits.length).toBe(2);
    expect(byUrl.regression).toBe(true);
    expect(comparePair(db, String(second.id), undefined).before.id).toBe(first.id);
    const reverse = comparePair(db, String(second.id), String(first.id));
    expect(reverse.resolvedAudits.length).toBe(2);
    expect(reverse.regression).toBe(false);
    expect(() => comparePair(db, String(first.id), undefined)).toThrow(/no earlier/);
  });

  test("compare by id finds the previous measurement beyond the list window", () => {
    const first = record(db, run("mobile", 40), "2026-01-01T00:00:00.000Z");
    const second = record(db, run("mobile", 41), "2026-01-01T00:00:01.000Z");
    const insert = db.transaction(() => {
      for (let i = 2; i < 1003; i += 1) record(db, run("mobile", 50), new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString());
    });
    insert();
    expect(comparePair(db, String(second.id), undefined).before.id).toBe(first.id);
  });

  test("forget removes the measurement and the empty page", () => {
    const m = record(db, run("mobile", 50), "2026-11-01T10:00:00.000Z");
    removeMeasurement(db, m.id);
    expect(listPages(db)).toEqual([]);
    expect(() => removeMeasurement(db, m.id)).toThrow(AppError);
  });

  test("a database newer than the binary is refused with CONFIG", () => {
    db.run(`PRAGMA user_version = ${migrations.length + 1}`);
    const dir = mkdtempSync(join(tmpdir(), "pagespeedfy-newer-"));
    try {
      const file = join(dir, "history.db");
      db.run(`VACUUM INTO '${file}'`);
      let code: number | undefined;
      try {
        openDatabase(file).close();
      } catch (e) {
        code = (e as AppError).code;
      }
      expect(code).toBe(ExitCode.CONFIG);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("project history files", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pagespeedfy-project-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("withHistory does not create the database for read commands", () => {
    expect(() => withHistory(dir, () => 1)).toThrow(/No history/);
    expect(() => readFileSync(join(dir, ".pagespeedfy", "history.db"))).toThrow();
  });

  test("imports 0.3.x report.json folders once", () => {
    const folder = join(dir, "pagespeedfy-reports", "example.com", "home", "20261105-103012");
    mkdirSync(folder, { recursive: true });
    const legacy = normalizeRun(fixture, "mobile", "mobile.raw.json", 50);
    const { formatVersion, samples, sampleScores, ...oldRun } = legacy;
    void formatVersion, samples, sampleScores;
    writeFileSync(join(folder, "report.json"), JSON.stringify({ formatVersion: 1, tool: "pagespeedfy", toolVersion: "0.3.5", generatedAt: "2026-11-05T13:30:12.000Z", url: URL_A, runs: [oldRun] }));
    writeFileSync(join(dir, "pagespeedfy-reports", "broken.json"), "{");
    writeFileSync(join(dir, "pagespeedfy-reports", "example.com", "report.json"), "not json");
    mkdirSync(join(dir, "pagespeedfy-reports", "bad-url"), { recursive: true });
    writeFileSync(join(dir, "pagespeedfy-reports", "bad-url", "report.json"), JSON.stringify({ tool: "pagespeedfy", url: "invalid-url", runs: [] }));
    mkdirSync(join(dir, "pagespeedfy-reports", "null"), { recursive: true });
    writeFileSync(join(dir, "pagespeedfy-reports", "null", "report.json"), "null");
    mkdirSync(join(dir, "pagespeedfy-reports", "bad-run"), { recursive: true });
    writeFileSync(join(dir, "pagespeedfy-reports", "bad-run", "report.json"), JSON.stringify({ tool: "pagespeedfy", url: URL_A, runs: [{ strategy: "tablet" }] }));

    const first = importLegacyReports(join(dir, "pagespeedfy-reports"), dir);
    expect(first.imported).toBe(1);
    expect(first.failed.length).toBe(4);
    const again = importLegacyReports(join(dir, "pagespeedfy-reports"), dir);
    expect(again).toMatchObject({ imported: 0, skipped: 1 });
    withHistory(dir, (h) => {
      const [m] = listMeasurements(h);
      expect(m?.toolVersion).toBe("0.3.5");
      expect(m?.note).toContain("Imported from");
    });
  });
});
