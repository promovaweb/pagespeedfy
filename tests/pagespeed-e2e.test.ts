/**
 * End-to-end runs of the PageSpeed commands and MCP tools in subprocesses,
 * against a local Bun.serve that stands in for the PageSpeed Insights API.
 * Each request answers with the fixture and the next performance score of
 * `scores`, so medians and comparisons are predictable.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HOME_VARIABLE } from "../src/config/paths.ts";

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures/mobile.raw.json"), "utf8"));
const repo = join(import.meta.dir, "..");
const PAGE = "https://example.com/";

let scores: number[] = [];
let lastKeyHeader: string | null = null;
let lastUrl = "";
let server: ReturnType<typeof Bun.serve>;
let home: string;
let project: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(request) {
      lastKeyHeader = request.headers.get("x-goog-api-key");
      lastUrl = request.url;
      const body = structuredClone(fixture);
      body.lighthouseResult.categories.performance.score = (scores.shift() ?? 50) / 100;
      return Response.json(body);
    },
  });
  home = mkdtempSync(join(tmpdir(), "pagespeedfy-e2e-home-"));
  project = mkdtempSync(join(tmpdir(), "pagespeedfy-e2e-project-"));
});
afterAll(() => {
  server.stop(true);
  rmSync(home, { recursive: true, force: true });
  rmSync(project, { recursive: true, force: true });
});

function env(extra: Record<string, string | undefined> = {}): Record<string, string> {
  const base: Record<string, string | undefined> = {
    ...process.env,
    [HOME_VARIABLE]: home,
    NO_COLOR: "1",
    PAGESPEEDFY_API_ENDPOINT: `http://127.0.0.1:${server.port}/runPagespeed`,
    PAGESPEEDFY_API_KEY: "AIzaE2E",
    PAGESPEEDFY_PROJECT: project,
    ...extra,
  };
  return Object.fromEntries(Object.entries(base).filter((e): e is [string, string] => e[1] !== undefined));
}

async function cli(args: string[], extra?: Record<string, string | undefined>) {
  const proc = Bun.spawn(["bun", "run", "src/main.ts", ...args], { cwd: repo, env: env(extra), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { code: await proc.exited, stdout, stderr };
}

describe("cli", () => {
  test("run records the median of the samples in the project history", async () => {
    scores = [40, 70, 55];
    const r = await cli(["run", PAGE, "--strategy", "mobile", "--samples", "3", "--note", "baseline", "--json"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout).data;
    expect(data.measurements[0].scores.performance).toBe(55);
    expect(data.measurements[0].sampleScores).toEqual([40, 70, 55]);
    expect(lastKeyHeader).toBe("AIzaE2E");
    expect(lastUrl).not.toContain("AIzaE2E");
    expect(existsSync(join(project, ".pagespeedfy", "history.db"))).toBe(true);
    expect(readFileSync(join(project, ".pagespeedfy", ".gitignore"), "utf8")).toContain("reports/");
  });

  test("history, report and compare read what run stored", async () => {
    scores = [30];
    const second = await cli(["run", PAGE, "--strategy", "mobile", "--note", "new hero video"]);
    expect(second.code).toBe(0);
    expect(second.stderr).toContain("Measuring mobile");

    const timeline = await cli(["history", PAGE]);
    expect(timeline.stdout.indexOf("baseline")).toBeLessThan(timeline.stdout.indexOf("new hero video"));

    const pages = await cli(["history", "--json"]);
    expect(JSON.parse(pages.stdout).data.pages[0].measurements).toBe(2);

    const report = await cli(["report", PAGE]);
    expect(report.stdout).toContain("Failed audits");

    const compare = await cli(["compare", PAGE, "--fail-on-regression"]);
    expect(compare.code).toBe(10);
    expect(compare.stdout).toContain("-25");
  });

  test("budgets, private URLs and a missing key map to their exit codes", async () => {
    scores = [62];
    expect((await cli(["run", PAGE, "--strategy", "mobile", "--fail-under", "performance=90"])).code).toBe(10);
    expect((await cli(["run", "http://localhost:4321/"])).code).toBe(2);
    expect((await cli(["run", PAGE], { PAGESPEEDFY_API_KEY: undefined })).code).toBe(4);
    expect((await cli(["history"], { PAGESPEEDFY_PROJECT: join(project, "empty") })).code).toBe(6);
  });
});

describe("mcp", () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(new StdioClientTransport({ command: "bun", args: ["run", "src/main.ts", "mcp"], cwd: repo, env: env({ PAGESPEEDFY_PROJECT: undefined }), stderr: "pipe" }));
  });
  afterAll(() => client.close());

  test("lists the pagespeed tools and the optimize_page prompt", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(["pagespeed_run", "pagespeed_history", "pagespeed_report", "pagespeed_compare"]));
    const prompt = await client.getPrompt({ name: "optimize_page", arguments: { url: PAGE } });
    expect((prompt.messages[0]?.content as { text: string }).text).toContain("pagespeed_compare");
  });

  test("runs and reads the history of the given project", async () => {
    scores = [91, 93];
    const ran = await client.callTool({ name: "pagespeed_run", arguments: { url: PAGE, project, note: "from mcp", failUnder: "performance=90" } });
    expect(ran.isError).toBeFalsy();
    const data = ran.structuredContent as { measurements: Array<{ strategy: string }>; budget: { passed: boolean } };
    expect(data.measurements.map((m) => m.strategy).sort()).toEqual(["desktop", "mobile"]);
    expect(data.budget.passed).toBe(true);

    const history = await client.callTool({ name: "pagespeed_history", arguments: { url: PAGE, project, strategy: "mobile" } });
    expect((history.content as Array<{ text: string }>)[0]?.text).toContain("from mcp");

    const compare = await client.callTool({ name: "pagespeed_compare", arguments: { before: PAGE, project } });
    expect((compare.structuredContent as { comparison: { regression: boolean } }).comparison.regression).toBe(false);
  });

  test("expected failures come back as isError with the exit-code name", async () => {
    const r = await client.callTool({ name: "pagespeed_report", arguments: { ref: PAGE, project: join(project, "nope") } });
    expect(r.isError).toBe(true);
    expect((r.structuredContent as { error: { name: string } }).error.name).toBe("NOT_FOUND");
  });
});
