/**
 * Compares two measurements of the same page and strategy: score and lab
 * metric deltas, plus audits resolved, introduced or still failing.
 *
 * A regression is any category score that dropped, or a new failing audit.
 * `compare --fail-on-regression` turns it into exit code BUDGET (10).
 */
import type { Measurement } from "../db/history.ts";
import { LAB_METRICS, type Category, type LabMetricId } from "./report.ts";

/** Numeric difference of one indicator. */
export interface Delta {
  before: number | null;
  after: number | null;
  delta: number | null;
}

/** Side of a comparison. */
export interface ComparisonSide {
  id: number;
  measuredAt: string;
  note: string | null;
  samples: number;
}

/** Result of `compare`. */
export interface Comparison {
  url: string;
  strategy: string;
  sameUrl: boolean;
  sameStrategy: boolean;
  before: ComparisonSide;
  after: ComparisonSide;
  scores: Partial<Record<Category, Delta>>;
  labMetrics: Partial<Record<LabMetricId, Delta>>;
  resolvedAudits: string[];
  newAudits: string[];
  remainingAudits: string[];
  regression: boolean;
}

const delta = (a: number | null | undefined, b: number | null | undefined): Delta => ({
  before: a ?? null,
  after: b ?? null,
  delta: a === null || a === undefined || b === null || b === undefined ? null : Number((b - a).toFixed(4)),
});

const side = (m: Measurement): ComparisonSide => ({ id: m.id, measuredAt: m.measuredAt, note: m.note, samples: m.samples });

/** Compares `before` with `after`. */
export function compareMeasurements(before: Measurement, after: Measurement): Comparison {
  const scores: Comparison["scores"] = {};
  for (const c of new Set([...Object.keys(before.run.scores), ...Object.keys(after.run.scores)]) as Set<Category>) {
    scores[c] = delta(before.run.scores[c], after.run.scores[c]);
  }
  const labMetrics: Comparison["labMetrics"] = {};
  for (const id of Object.keys(LAB_METRICS) as LabMetricId[]) {
    if (!before.run.labMetrics[id] && !after.run.labMetrics[id]) continue;
    labMetrics[id] = delta(before.run.labMetrics[id]?.numericValue, after.run.labMetrics[id]?.numericValue);
  }
  const idsBefore = new Set(before.run.failedAudits.map((a) => a.id));
  const idsAfter = new Set(after.run.failedAudits.map((a) => a.id));
  const resolvedAudits = [...idsBefore].filter((id) => !idsAfter.has(id)).sort();
  const newAudits = [...idsAfter].filter((id) => !idsBefore.has(id)).sort();
  const remainingAudits = [...idsBefore].filter((id) => idsAfter.has(id)).sort();
  const regression = Object.values(scores).some((d) => d !== undefined && d.delta !== null && d.delta < 0) || newAudits.length > 0;
  return {
    url: after.url,
    strategy: after.strategy,
    sameUrl: before.url === after.url,
    sameStrategy: before.strategy === after.strategy,
    before: side(before),
    after: side(after),
    scores,
    labMetrics,
    resolvedAudits,
    newAudits,
    remainingAudits,
    regression,
  };
}
