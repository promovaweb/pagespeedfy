/**
 * Normalizes a raw PageSpeed Insights response into a stable run.
 *
 * A run gathers, for one strategy: category scores, lab metrics, CrUX field
 * data (page and origin) and every audit that did not pass, sorted by impact
 * and carrying the detail items (URLs, selectors, HTML snippets, estimated
 * savings). The raw JSON stays on disk next to the history database, so any
 * field this normalization summarizes can still be read.
 *
 * The shapes below are stored as JSON in the history database (column
 * `measurements.run`) and returned by `--json` and the MCP tools. Changing a
 * field means bumping `FORMAT_VERSION`.
 */

/** Strategies accepted by the API. */
export const STRATEGIES = ["mobile", "desktop"] as const;
export type Strategy = (typeof STRATEGIES)[number];

/** Lighthouse categories accepted by the API, in command-line form. */
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Version of the normalized run format. Bump when a field leaves or changes type. */
export const FORMAT_VERSION = 2;

/** Minimum audit score to count as passed (0 to 1 scale). */
export const PASSING_SCORE = 0.9;

/** Lab metric ids shown in reports, with the short label used in tables. */
export const LAB_METRICS = {
  "first-contentful-paint": "FCP",
  "largest-contentful-paint": "LCP",
  "total-blocking-time": "TBT",
  "cumulative-layout-shift": "CLS",
  "speed-index": "SI",
  interactive: "TTI",
} as const;
export type LabMetricId = keyof typeof LAB_METRICS;

/** Lab metric. */
export interface LabMetric {
  title: string;
  displayValue: string | null;
  numericValue: number | null;
  score: number | null;
}

/** Chrome UX Report field metric. */
export interface FieldMetric {
  percentile: number;
  category: string;
}

/** Field data block (page or origin). */
export interface FieldData {
  overallCategory: string | null;
  metrics: Record<string, FieldMetric>;
}

/** Audit that did not pass, ready to become an action. */
export interface FailedAudit {
  id: string;
  categories: Category[];
  group: string | null;
  weight: number;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue: string | null;
  numericValue: number | null;
  metricSavings: Record<string, number>;
  detailsType: string | null;
  headings: Array<{ key: string; label: string }>;
  items: unknown[];
  totalItems: number;
  truncated: boolean;
}

/** Normalized result of one strategy. */
export interface Run {
  formatVersion: number;
  strategy: Strategy;
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  lighthouseVersion: string;
  userAgent: string;
  runWarnings: string[];
  runtimeError: string | null;
  scores: Partial<Record<Category, number | null>>;
  labMetrics: Partial<Record<LabMetricId, LabMetric>>;
  field: { page: FieldData | null; origin: FieldData | null };
  failedAudits: FailedAudit[];
  manualAudits: Array<{ id: string; category: Category; title: string }>;
  passedAuditIds: string[];
  /** Raw JSON file of the chosen sample, relative to the project data directory. */
  rawFile: string;
  /** How many samples were taken; the run is the median one. */
  samples: number;
  /** Performance score of every sample, in collection order. */
  sampleScores: Array<number | null>;
}

type Json = Record<string, unknown>;

const obj = (v: unknown): Json => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Keys with no value for fixing that only inflate the report. */
const DROPPED_KEYS = new Set(["boundingRect", "lhId", "path"]);

/**
 * Copies a detail item without Lighthouse's internal positioning keys,
 * keeping selector, snippet, URL, savings and sub-items.
 */
export function cleanItem(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanItem);
  if (value === null || typeof value !== "object") return value;
  const out: Json = {};
  for (const [key, inner] of Object.entries(value as Json)) {
    if (DROPPED_KEYS.has(key)) continue;
    out[key] = cleanItem(inner);
  }
  return out;
}

/** Maps an API category id to the local type. */
function toCategory(id: string): Category | null {
  return (CATEGORIES as readonly string[]).includes(id) ? (id as Category) : null;
}

/** Extracts `loadingExperience` or `originLoadingExperience`. */
function normalizeField(block: unknown): FieldData | null {
  const b = obj(block);
  const metrics = obj(b.metrics);
  const keys = Object.keys(metrics);
  if (keys.length === 0) return null;
  const out: Record<string, FieldMetric> = {};
  for (const key of keys) {
    const m = obj(metrics[key]);
    const percentile = num(m.percentile);
    if (percentile === null) continue;
    out[key] = { percentile, category: str(m.category) ?? "NONE" };
  }
  return { overallCategory: str(b.overall_category), metrics: out };
}

/** Sum of estimated savings, used to sort audits. */
function totalSavings(a: FailedAudit): number {
  return Object.values(a.metricSavings).reduce((t, v) => t + v, 0);
}

/**
 * Normalizes one `runPagespeed` response.
 *
 * An audit enters `failedAudits` when it belongs to a requested category,
 * has score mode `binary`, `numeric` or `metricSavings` and scores below
 * 0.9. `manual` audits go to `manualAudits`. Metrics (group `metrics`) stay
 * in `labMetrics`, outside the failed list.
 */
export function normalizeRun(raw: Json, strategy: Strategy, rawFile: string, maxItems: number): Run {
  const lh = obj(raw.lighthouseResult);
  const audits = obj(lh.audits);
  const categories = obj(lh.categories);

  const scores: Partial<Record<Category, number | null>> = {};
  const refs = new Map<string, { categories: Category[]; group: string | null; weight: number }>();

  for (const [categoryId, value] of Object.entries(categories)) {
    const category = toCategory(categoryId);
    if (!category) continue;
    const c = obj(value);
    const score = num(c.score);
    scores[category] = score === null ? null : Math.round(score * 100);
    for (const ref of Array.isArray(c.auditRefs) ? c.auditRefs : []) {
      const r = obj(ref);
      const id = str(r.id);
      if (!id) continue;
      const current = refs.get(id) ?? { categories: [], group: str(r.group), weight: 0 };
      if (!current.categories.includes(category)) current.categories.push(category);
      current.weight = Math.max(current.weight, num(r.weight) ?? 0);
      refs.set(id, current);
    }
  }

  const labMetrics: Partial<Record<LabMetricId, LabMetric>> = {};
  for (const id of Object.keys(LAB_METRICS) as LabMetricId[]) {
    const a = obj(audits[id]);
    if (Object.keys(a).length === 0) continue;
    labMetrics[id] = {
      title: str(a.title) ?? id,
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      score: num(a.score),
    };
  }

  const failed: FailedAudit[] = [];
  const manual: Run["manualAudits"] = [];
  const passed: string[] = [];

  for (const [id, ref] of refs) {
    if (ref.group === "metrics") continue;
    const a = obj(audits[id]);
    if (Object.keys(a).length === 0) continue;
    const mode = str(a.scoreDisplayMode) ?? "";
    const score = num(a.score);

    if (mode === "manual") {
      manual.push({ id, category: ref.categories[0]!, title: str(a.title) ?? id });
      continue;
    }
    if (!["binary", "numeric", "metricSavings"].includes(mode)) continue;
    if (score !== null && score >= PASSING_SCORE) {
      passed.push(id);
      continue;
    }

    const details = obj(a.details);
    const items = Array.isArray(details.items) ? details.items : [];
    const headings = Array.isArray(details.headings) ? details.headings : [];
    const savings: Record<string, number> = {};
    for (const [metric, value] of Object.entries(obj(a.metricSavings))) {
      const n = num(value);
      if (n !== null && n > 0) savings[metric] = n;
    }

    failed.push({
      id,
      categories: ref.categories,
      group: ref.group,
      weight: ref.weight,
      title: str(a.title) ?? id,
      description: str(a.description) ?? "",
      score,
      scoreDisplayMode: mode,
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      metricSavings: savings,
      detailsType: str(details.type),
      headings: headings
        .map((h) => {
          const o = obj(h);
          const key = str(o.key);
          const label = str(o.label) ?? str(o.text) ?? key;
          return key ? { key, label: label ?? key } : null;
        })
        .filter((h): h is { key: string; label: string } => h !== null),
      items: items.slice(0, maxItems).map(cleanItem),
      totalItems: items.length,
      truncated: items.length > maxItems,
    });
  }

  failed.sort(
    (a, b) =>
      b.weight - a.weight || totalSavings(b) - totalSavings(a) || (a.score ?? 0) - (b.score ?? 0) || a.id.localeCompare(b.id),
  );

  const environment = obj(lh.environment);
  const runtimeError = obj(lh.runtimeError);

  return {
    formatVersion: FORMAT_VERSION,
    strategy,
    requestedUrl: str(lh.requestedUrl) ?? str(raw.id) ?? "",
    finalUrl: str(lh.finalDisplayedUrl) ?? str(lh.finalUrl) ?? "",
    fetchTime: str(lh.fetchTime) ?? "",
    lighthouseVersion: str(lh.lighthouseVersion) ?? "",
    userAgent: str(environment.networkUserAgent) ?? "",
    runWarnings: Array.isArray(lh.runWarnings) ? lh.runWarnings.filter((w): w is string => typeof w === "string") : [],
    runtimeError: str(runtimeError.message),
    scores,
    labMetrics,
    field: { page: normalizeField(raw.loadingExperience), origin: normalizeField(raw.originLoadingExperience) },
    failedAudits: failed,
    manualAudits: manual.sort((a, b) => a.id.localeCompare(b.id)),
    passedAuditIds: passed.sort(),
    rawFile,
    samples: 1,
    sampleScores: [scores.performance ?? null],
  };
}

/**
 * Picks the median sample by performance score, so one noisy PageSpeed run
 * does not move the history. Samples without a performance score sort last.
 * With an even count, the lower middle sample wins (the more conservative
 * reading). Returns the chosen run with `samples` and `sampleScores` filled.
 */
export function medianRun(samples: readonly Run[]): Run {
  if (samples.length === 0) throw new Error("medianRun needs at least one sample.");
  const sampleScores = samples.map((s) => s.scores.performance ?? null);
  const ordered = [...samples].sort((a, b) => (a.scores.performance ?? -1) - (b.scores.performance ?? -1));
  const withScore = ordered.filter((s) => s.scores.performance !== null && s.scores.performance !== undefined);
  const pool = withScore.length > 0 ? withScore : ordered;
  const chosen = pool[Math.floor((pool.length - 1) / 2)]!;
  return { ...chosen, samples: samples.length, sampleScores };
}
