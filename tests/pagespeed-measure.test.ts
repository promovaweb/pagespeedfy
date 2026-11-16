/** measurePage: one folder per run, so raw files are never overwritten. */
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_VARIABLE } from "../src/config/paths.ts";
import { measurePage } from "../src/pagespeed/measure.ts";

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures/mobile.raw.json"), "utf8"));
let dir: string;
const saved = { home: process.env[HOME_VARIABLE], key: process.env.PAGESPEEDFY_API_KEY };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pagespeedfy-measure-"));
  process.env[HOME_VARIABLE] = join(dir, "home");
  process.env.PAGESPEEDFY_API_KEY = "AIzaMEASURE";
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (saved.home === undefined) delete process.env[HOME_VARIABLE];
  else process.env[HOME_VARIABLE] = saved.home;
  if (saved.key === undefined) delete process.env.PAGESPEEDFY_API_KEY;
  else process.env.PAGESPEEDFY_API_KEY = saved.key;
});

test("two runs in the same second keep separate raw files", async () => {
  const at = () => new Date("2026-11-16T00:00:00Z");
  const answer = (score: number) => async () => {
    const body = structuredClone(fixture);
    body.lighthouseResult.categories.performance.score = score;
    return Response.json(body);
  };
  const base = { url: "https://example.com/?x=1", strategies: ["mobile"] as const, project: dir, now: at };
  const a = await measurePage({ ...base, transport: answer(0.5) });
  const b = await measurePage({ ...base, transport: answer(0.9) });
  const fileA = a.measurements[0]!.run.rawFile;
  const fileB = b.measurements[0]!.run.rawFile;
  expect(fileA).not.toBe(fileB);
  const rawA = JSON.parse(readFileSync(join(dir, ".pagespeedfy", fileA), "utf8"));
  expect(rawA.lighthouseResult.categories.performance.score).toBe(0.5);
});
