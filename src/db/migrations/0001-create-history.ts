/**
 * First schema of the project history: tracked pages and their
 * measurements.
 *
 * One `run` invocation writes one measurement per strategy; all of them
 * share the same `session`. Scores and lab metrics get their own columns so
 * the history can be listed and charted without parsing JSON; the full
 * normalized run (failed audits, field data, samples) stays in `run`.
 *
 * A released migration is never edited: later changes are new files.
 */
import type { Migration } from "./index.ts";

export const createHistory: Migration = {
  version: 1,
  name: "create_history",
  up: `
    CREATE TABLE pages (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      host TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE measurements (
      id INTEGER PRIMARY KEY,
      page_id INTEGER NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
      session TEXT NOT NULL,
      strategy TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      note TEXT,
      samples INTEGER NOT NULL,
      tool_version TEXT NOT NULL,
      lighthouse_version TEXT NOT NULL,
      performance INTEGER,
      accessibility INTEGER,
      best_practices INTEGER,
      seo INTEGER,
      fcp REAL,
      lcp REAL,
      tbt REAL,
      cls REAL,
      si REAL,
      tti REAL,
      failed_audits INTEGER NOT NULL,
      run TEXT NOT NULL
    ) STRICT;

    CREATE INDEX measurements_page_strategy ON measurements (page_id, strategy, measured_at);
    CREATE INDEX measurements_session ON measurements (session);
  `,
};
