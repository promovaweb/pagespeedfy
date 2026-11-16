/**
 * Score budgets for CI: `--fail-under performance=90,seo=95`.
 *
 * A budget lists minimum category scores. `checkBudget` reports every
 * strategy and category below its minimum; the `run` command exits with
 * BUDGET (10) when the list is not empty. A category the measurement did
 * not request counts as a failure, since nothing proves it passed.
 */
import { error } from "../app/errors.ts";
import { CATEGORIES, type Category, type Strategy } from "./report.ts";

/** Minimum score per category. */
export type Budget = Partial<Record<Category, number>>;

/** One category below its minimum. */
export interface BudgetFailure {
  strategy: Strategy;
  category: Category;
  minimum: number;
  score: number | null;
}

/**
 * Parses `category=score` pairs separated by commas. A bare number applies
 * to every category. Raises USAGE (2) on unknown categories or scores
 * outside 0 to 100.
 */
export function parseBudget(text: string): Budget {
  const budget: Budget = {};
  for (const part of text.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [left, right] = part.includes("=") ? part.split("=", 2) : [undefined, part];
    const score = Number(right);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw error.usage(`Invalid budget "${part}". Use category=score with a score from 0 to 100.`);
    }
    if (left === undefined) {
      for (const c of CATEGORIES) budget[c] = score;
      continue;
    }
    const category = left.trim() as Category;
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      throw error.usage(`Unknown category "${left}" in the budget. Use: ${CATEGORIES.join(", ")}.`);
    }
    budget[category] = score;
  }
  if (Object.keys(budget).length === 0) throw error.usage("The budget is empty. Example: --fail-under performance=90,seo=95");
  return budget;
}

/** Lists every strategy and category below the budget. */
export function checkBudget(
  budget: Budget,
  runs: ReadonlyArray<{ strategy: Strategy; scores: Partial<Record<Category, number | null>> }>,
): BudgetFailure[] {
  const failures: BudgetFailure[] = [];
  for (const run of runs) {
    for (const [category, minimum] of Object.entries(budget) as Array<[Category, number]>) {
      const score = run.scores[category] ?? null;
      if (score === null || score < minimum) failures.push({ strategy: run.strategy, category, minimum, score });
    }
  }
  return failures;
}
