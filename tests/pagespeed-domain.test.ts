/** Domain rules: normalization, median, URL checks, budgets, API client and key resolution. */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../src/app/errors.ts";
import { ExitCode } from "../src/app/exit-codes.ts";
import { HOME_VARIABLE, MASTER_KEY_VARIABLE } from "../src/config/paths.ts";
import { getCredential, setCredential } from "../src/config/credentials.ts";
import { buildUrl, queryPagespeed } from "../src/pagespeed/api.ts";
import { checkBudget, parseBudget } from "../src/pagespeed/budget.ts";
import { API_KEY_CREDENTIAL, API_KEY_VARIABLE, legacyCredentialPath, resolveApiKey } from "../src/pagespeed/key.ts";
import { findProjectRoot } from "../src/pagespeed/project.ts";
import { medianRun, normalizeRun, type Run } from "../src/pagespeed/report.ts";
import { isPrivateHost, pageKey, routeSlug, validateUrl } from "../src/pagespeed/url.ts";

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures/mobile.raw.json"), "utf8"));

function codeOf(fn: () => unknown): number | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : -1;
  }
  return undefined;
}

describe("normalizeRun", () => {
  test("extracts scores, lab metrics and failed audits sorted by weight", () => {
    const run = normalizeRun(fixture, "mobile", "reports/x/mobile-1.raw.json", 50);
    expect(run.scores.performance).toBe(62);
    expect(run.labMetrics["largest-contentful-paint"]?.numericValue).toBeGreaterThan(0);
    expect(run.failedAudits.length).toBe(4);
    const weights = run.failedAudits.map((a) => a.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
    expect(run.samples).toBe(1);
  });

  test("truncates detail items to maxItems", () => {
    const run = normalizeRun(fixture, "mobile", "f", 1);
    for (const a of run.failedAudits) expect(a.items.length).toBeLessThanOrEqual(1);
  });
});

describe("medianRun", () => {
  const base = normalizeRun(fixture, "mobile", "f", 50);
  const withScore = (performance: number | null): Run => ({ ...base, scores: { ...base.scores, performance } });

  test("keeps the middle sample and records every score", () => {
    const run = medianRun([withScore(70), withScore(40), withScore(55)]);
    expect(run.scores.performance).toBe(55);
    expect(run.samples).toBe(3);
    expect(run.sampleScores).toEqual([70, 40, 55]);
  });

  test("picks the lower middle with an even count and skips null scores", () => {
    expect(medianRun([withScore(80), withScore(60), withScore(70), withScore(90)]).scores.performance).toBe(70);
    expect(medianRun([withScore(null), withScore(50)]).scores.performance).toBe(50);
  });
});

describe("urls", () => {
  test("refuses hosts PageSpeed Insights cannot reach", () => {
    for (const host of ["localhost", "app.local", "10.0.0.2", "172.20.1.1", "192.168.1.5", "169.254.0.1", "100.100.1.1", "0.0.0.0", "[::1]", "fd12::1", "fe80::1", "api.internal"]) {
      expect(isPrivateHost(host)).toBe(true);
    }
    for (const host of ["promovaweb.com", "8.8.8.8", "100.200.1.1", "site.ts.net"]) expect(isPrivateHost(host)).toBe(false);
  });

  test("validateUrl raises USAGE", () => {
    expect(codeOf(() => validateUrl("not a url"))).toBe(ExitCode.USAGE);
    expect(codeOf(() => validateUrl("ftp://example.com/"))).toBe(ExitCode.USAGE);
    expect(codeOf(() => validateUrl("http://localhost:4321/"))).toBe(ExitCode.USAGE);
    expect(validateUrl("https://example.com/a").hostname).toBe("example.com");
  });

  test("pageKey drops the fragment and keeps the query", () => {
    expect(pageKey(new URL("https://example.com/a?x=1#top"))).toBe("https://example.com/a?x=1");
  });
});

describe("budget", () => {
  test("parses pairs and bare numbers", () => {
    expect(parseBudget("performance=90, seo=95")).toEqual({ performance: 90, seo: 95 });
    expect(Object.keys(parseBudget("80"))).toHaveLength(4);
    expect(codeOf(() => parseBudget("speed=90"))).toBe(ExitCode.USAGE);
    expect(codeOf(() => parseBudget("performance=120"))).toBe(ExitCode.USAGE);
  });

  test("reports categories below the minimum, missing ones included", () => {
    const failures = checkBudget({ performance: 90, seo: 90 }, [{ strategy: "mobile", scores: { performance: 62 } }]);
    expect(failures.map((f) => f.category)).toEqual(["performance", "seo"]);
  });
});

describe("api client", () => {
  test("sends the key in a header, never in the URL", async () => {
    let seen: { url: string; key: string | null } | undefined;
    await queryPagespeed(
      { url: "https://example.com/", apiKey: "AIzaSECRET", strategy: "mobile", categories: ["seo"], locale: "pt-BR", timeoutMs: 1000, retries: 1 },
      async (url, init) => {
        seen = { url, key: new Headers(init.headers).get("x-goog-api-key") };
        return new Response("{}", { status: 200 });
      },
    );
    expect(seen?.url).not.toContain("AIzaSECRET");
    expect(seen?.key).toBe("AIzaSECRET");
    expect(buildUrl({ url: "https://e.com/", strategy: "desktop", categories: ["best-practices"], locale: "en" })).toContain("category=BEST_PRACTICES");
  });

  test("retries 5xx, stops on the daily quota and maps 403 to CREDENTIALS", async () => {
    let calls = 0;
    const flaky = async () => (++calls < 2 ? new Response("{}", { status: 503 }) : new Response('{"ok":1}', { status: 200 }));
    const params = { url: "https://e.com/", apiKey: "k", strategy: "mobile" as const, categories: [], locale: "en", timeoutMs: 1000, retries: 3 };
    expect(await queryPagespeed(params, flaky, async () => {})).toEqual({ ok: 1 });

    const quota = async () => new Response(JSON.stringify({ error: { message: "Quota exceeded per day" } }), { status: 429 });
    await expect(queryPagespeed(params, quota, async () => {})).rejects.toMatchObject({ code: ExitCode.NETWORK_OR_API });

    const refused = async () => new Response(JSON.stringify({ error: { message: "API key not valid k" } }), { status: 403 });
    const e = await queryPagespeed(params, refused, async () => {}).catch((x) => x as AppError);
    expect(e.code).toBe(ExitCode.CREDENTIALS);
    expect(e.message).not.toMatch(/ k\b/);
  });
});

describe("api key", () => {
  let dir: string;
  const saved = { home: process.env[HOME_VARIABLE], key: process.env[API_KEY_VARIABLE], master: process.env[MASTER_KEY_VARIABLE] };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pagespeedfy-key-"));
    process.env[HOME_VARIABLE] = dir;
    delete process.env[API_KEY_VARIABLE];
    delete process.env[MASTER_KEY_VARIABLE];
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const [name, value] of [[HOME_VARIABLE, saved.home], [API_KEY_VARIABLE, saved.key], [MASTER_KEY_VARIABLE, saved.master]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test("the variable wins over the vault", () => {
    process.env[API_KEY_VARIABLE] = "AIzaFROMENV";
    expect(resolveApiKey()).toEqual({ apiKey: "AIzaFROMENV", source: "env" });
  });

  test("a missing key raises CREDENTIALS", () => {
    expect(codeOf(() => resolveApiKey())).toBe(ExitCode.CREDENTIALS);
  });

  test("a key already in the vault is never replaced by the 0.3.x key", () => {
    setCredential(API_KEY_CREDENTIAL, "AIzaNEW");
    writeFileSync(legacyCredentialPath(), JSON.stringify({ apiKey: "AIzaOLD" }));
    expect(resolveApiKey().apiKey).toBe("AIzaNEW");
    expect(existsSync(legacyCredentialPath())).toBe(true);
  });

  test("moves the 0.3.x key into the encrypted vault and deletes the old file", () => {
    writeFileSync(legacyCredentialPath(), JSON.stringify({ apiKey: "AIzaLEGACY" }));
    const notes: string[] = [];
    expect(resolveApiKey((t) => notes.push(t))).toEqual({ apiKey: "AIzaLEGACY", source: "vault" });
    expect(existsSync(legacyCredentialPath())).toBe(false);
    expect(getCredential(API_KEY_CREDENTIAL)).toBe("AIzaLEGACY");
    expect(readFileSync(join(dir, "credentials.json"), "utf8")).not.toContain("AIzaLEGACY");
    expect(notes.join("")).not.toContain("AIzaLEGACY");
  });
});

describe("project root", () => {
  test("prefers an ancestor with .pagespeedfy/ and skips the home folder", () => {
    const base = mkdtempSync(join(tmpdir(), "pagespeedfy-root-"));
    try {
      const site = join(base, "site");
      const deep = join(site, "src", "pages");
      Bun.spawnSync(["mkdir", "-p", deep, join(site, ".pagespeedfy"), join(base, ".pagespeedfy")]);
      expect(findProjectRoot(undefined, deep, base)).toBe(site);
      rmSync(join(site, ".pagespeedfy"), { recursive: true });
      writeFileSync(join(site, "package.json"), "{}");
      // base is "home": its .pagespeedfy is the app data folder, not a project.
      expect(findProjectRoot(undefined, deep, base)).toBe(site);
      expect(findProjectRoot("../other", deep, base)).toBe(join(site, "src", "other"));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("review fixes", () => {
  test("variants of private hosts are refused, public names that look like IPs are not", () => {
    for (const url of ["https://localhost./", "https://[::ffff:127.0.0.1]/", "https://[::ffff:10.0.0.1]/", "https://intranet/"]) {
      expect(codeOf(() => validateUrl(url))).toBe(ExitCode.USAGE);
    }
    expect(validateUrl("https://10.example.com/").hostname).toBe("10.example.com");
    expect(validateUrl("https://[::ffff:8.8.8.8]/").protocol).toBe("https:");
  });

  test("a path that is not valid UTF-8 still gets a slug", () => {
    expect(routeSlug(new URL("https://example.com/%FF"))).toBe("-FF");
    expect(routeSlug(new URL("https://example.com/a%"))).toBe("a-");
  });

  test("an echoed key is removed from successful responses", async () => {
    const raw = await queryPagespeed(
      { url: "https://e.com/", apiKey: "AIzaECHOED", strategy: "mobile", categories: [], locale: "en", timeoutMs: 1000, retries: 1 },
      async () => Response.json({ lighthouseResult: { runWarnings: ["key AIzaECHOED leaked"], audits: { AIzaECHOED: { title: "x AIzaECHOED" } } } }),
    );
    expect(JSON.stringify(raw)).not.toContain("AIzaECHOED");
  });
});
