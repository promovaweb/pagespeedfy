/** Exercises history navigation through the real TUI host with isolated project data. */
import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestRenderer } from "@opentui/core/testing";
import { openDatabase } from "../src/db/database.ts";
import { recordMeasurement } from "../src/db/history.ts";
import { HOME_VARIABLE } from "../src/config/paths.ts";
import { ensureProjectDir, resolveProject } from "../src/pagespeed/project.ts";
import { normalizeRun, type Strategy } from "../src/pagespeed/report.ts";
import { mountTui } from "../src/tui/index.ts";
import { performanceSparkline, scoreColor } from "../src/tui/screens/history.ts";
import { themes } from "../src/tui/theme.ts";

function seed(project: string, strategy: Strategy, score: number, date: string, audit: string) {
  const paths = ensureProjectDir(resolveProject(project));
  const db = openDatabase(paths.database);
  try {
    const run = normalizeRun({ lighthouseResult: {
      categories: { performance: { score: score / 100, auditRefs: [{ id: audit, weight: 1 }] }, accessibility: { score: 1 }, "best-practices": { score: 0.9 }, seo: { score: 1 } },
      audits: { [audit]: { title: audit, score: 0, scoreDisplayMode: "numeric", metricSavings: { LCP: 500 } }, "largest-contentful-paint": { numericValue: 2400 }, "total-blocking-time": { numericValue: 120 }, "cumulative-layout-shift": { numericValue: 0.02 } },
    } }, strategy, "", 20);
    recordMeasurement(db, { url: "https://example.com/", host: "example.com", session: date, measuredAt: date, note: `Score ${score}`, toolVersion: "test", run });
  } finally { db.close(); }
}

async function fixture(work: (project: string, setup: Awaited<ReturnType<typeof createTestRenderer>>, press: (key: string) => Promise<string>) => Promise<void>, theme = themes.night, width = 110, height = 30) {
  const project = mkdtempSync(join(tmpdir(), "pagespeedfy-history-"));
  const previousProject = process.env.PAGESPEEDFY_PROJECT;
  const previousHome = process.env[HOME_VARIABLE];
  process.env.PAGESPEEDFY_PROJECT = project;
  process.env[HOME_VARIABLE] = join(project, "settings");
  const setup = await createTestRenderer({ width, height, kittyKeyboard: true });
  const closed = mountTui(setup.renderer, {}, theme);
  const press = async (key: string) => { setup.mockInput.pressKey(key); await setup.renderOnce(); return setup.renderer.isDestroyed ? "" : setup.captureCharFrame(); };
  try { await setup.renderOnce(); await work(project, setup, press); }
  finally {
    setup.renderer.destroy(); await closed; await setup.dispose();
    if (previousProject === undefined) delete process.env.PAGESPEEDFY_PROJECT; else process.env.PAGESPEEDFY_PROJECT = previousProject;
    if (previousHome === undefined) delete process.env[HOME_VARIABLE]; else process.env[HOME_VARIABLE] = previousHome;
    rmSync(project, { recursive: true, force: true });
  }
}

test("sparkline and Lighthouse ranges preserve zeros, missing values and boundaries", () => {
  expect(performanceSparkline([0, 100, null, 50])).toBe("▁█·▅");
  expect(performanceSparkline([])).toBe("");
  for (const theme of Object.values(themes)) {
    expect(scoreColor(49, theme)).toBe(theme.error);
    expect(scoreColor(50, theme)).toBe(theme.warn);
    expect(scoreColor(89, theme)).toBe(theme.warn);
    expect(scoreColor(90, theme)).toBe(theme.ok);
    expect(scoreColor(null, theme)).toBe(theme.textDim);
  }
});

test("default History is empty without creating a database and help includes its keys", async () => {
  await fixture(async (project, setup, press) => {
    expect(setup.captureCharFrame()).toContain(`No history in ${project}`);
    expect(setup.captureCharFrame()).toContain("pagespeedfy run <url>");
    expect(existsSync(join(project, ".pagespeedfy"))).toBe(false);
    const help = await press("?"); expect(help).toContain("filter"); expect(help).toContain("reload");
    await press("?");
    expect(await press("2")).toContain("Environment");
    expect(await press("3")).toContain("Credits");
    expect(await press("1")).toContain("No history");
    await press("q"); expect(setup.renderer.isDestroyed).toBe(true);
  });
});

test("reload, chronological timeline, strategy filters, details and same-strategy comparison", async () => {
  await fixture(async (project, setup, press) => {
    seed(project, "mobile", 40, "2026-11-01T10:00:00Z", "old-audit");
    seed(project, "desktop", 99, "2026-11-02T10:00:00Z", "desktop-audit");
    seed(project, "mobile", 90, "2026-11-03T10:00:00Z", "new-audit");
    let frame = await press("r");
    expect(frame).toContain("3 measurements"); expect(frame).toContain("mobile: 90"); expect(frame).toContain("desktop: 99");
    frame = await press("RETURN");
    expect(frame).toContain("Filter: all"); expect(frame).toContain("+50 pts");
    expect(frame.indexOf("#1")).toBeLessThan(frame.indexOf("#2"));
    frame = await press("RETURN"); expect(frame).toContain("No earlier measurement");
    await press("ESCAPE");
    frame = await press("f"); expect(frame).toContain("Filter: mobile"); expect(frame).not.toContain("desktop-audit");
    await press("j"); frame = await press("RETURN"); expect(frame).toContain("Lab metrics");
    // Scroll until the comparison becomes visible in the detail viewport.
    for (let i = 0; i < 15; i++) frame = await press("j");
    expect(frame).toContain("Compared with #1 (mobile)");
    expect(frame).toContain("Resolved audits: old-audit"); expect(frame).toContain("New audits: new-audit");
    frame = await press("ESCAPE"); expect(frame).toContain("> #3");
    seed(project, "mobile", 95, "2026-11-04T10:00:00Z", "new-audit");
    frame = await press("r"); expect(frame).toContain("> #3"); expect(frame).toContain("+55 pts");
    frame = await press("f"); expect(frame).toContain("Filter: desktop");
    frame = await press("f"); expect(frame).toContain("Filter: all");
    frame = await press("ESCAPE"); expect(frame).toContain("4 measurements");
  });
});

for (const theme of Object.values(themes)) for (const [width, height] of [[40, 12], [80, 24], [110, 30], [160, 40]]) {
  test(`history frame ${theme.name} ${width}x${height}`, async () => {
    await fixture(async (project, setup, press) => {
      seed(project, "mobile", 0, "2026-11-01T10:00:00Z", "audit");
      expect(await press("r")).toContain("History");
      await press("RETURN");
      expect(setup.captureCharFrame()).toContain("Filter: all");
      await press("RETURN"); await press("j");
      await press("ESCAPE"); await press("ESCAPE");
      expect(setup.renderer.isDestroyed).toBe(false);
    }, theme, width, height);
  });
}

test("unreadable history offers retry and recovers", async () => {
  await fixture(async (project, setup, press) => {
    const paths = ensureProjectDir(resolveProject(project));
    writeFileSync(paths.database, "invalid sqlite");
    expect(await press("r")).toContain("Unable to load history");
    rmSync(paths.database);
    expect(await press("r")).toContain("No history");
    expect(existsSync(paths.database)).toBe(false);
  });
});
