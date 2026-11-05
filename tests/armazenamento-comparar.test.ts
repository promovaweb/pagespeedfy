/** Caminhos de saída, validação de URL e comparação de relatórios. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carimbo, slugRota, validarUrl } from "../src/armazenamento.js";
import { comparar } from "../src/comparar.js";
import { normalizarExecucao, type Relatorio } from "../src/relatorio.js";

describe("validarUrl e slugRota", () => {
  it("aceita URL pública", () => {
    expect(validarUrl("https://exemplo.com.br/a").host).toBe("exemplo.com.br");
  });
  it.each(["http://localhost:4321/", "http://192.168.0.2/", "https://site.local/", "ftp://x.com/", "exemplo.com"])("recusa %s", (u) => {
    expect(() => validarUrl(u)).toThrow();
  });
  it("gera slug estável", () => {
    expect(slugRota(new URL("https://x.com/"))).toBe("home");
    expect(slugRota(new URL("https://x.com/blog/ação/"))).toBe("blog--acao");
    expect(carimbo(new Date(2026, 10, 5, 9, 3, 7))).toBe("20261105-090307");
  });
});

describe("comparar", () => {
  const bruto = JSON.parse(readFileSync(new URL("./fixtures/mobile.raw.json", import.meta.url), "utf8"));
  const rel = (b: unknown): Relatorio => ({
    formatVersion: 1, tool: "pagespeedfy", toolVersion: "0", generatedAt: "t", url: "https://exemplo.com.br/blog/post/",
    locale: "pt-BR", categories: ["performance"], maxItems: 50, runs: [normalizarExecucao(b as Record<string, unknown>, "mobile", "m", 50)],
  });

  it("aponta resolvidas, novas e diferenças", () => {
    const depoisBruto = structuredClone(bruto);
    depoisBruto.lighthouseResult.categories.performance.score = 0.81;
    depoisBruto.lighthouseResult.audits["color-contrast"].score = 1;
    depoisBruto.lighthouseResult.audits["image-alt"].score = 0;
    depoisBruto.lighthouseResult.audits["largest-contentful-paint"].numericValue = 2500;
    const c = comparar(rel(bruto), rel(depoisBruto));
    const m = c.strategies[0]!;
    expect(m.scores.performance).toEqual({ before: 62, after: 81, delta: 19 });
    expect(m.labMetrics["largest-contentful-paint"]?.delta).toBe(-1700);
    expect(m.resolvedAudits).toEqual(["color-contrast"]);
    expect(m.newAudits).toEqual(["image-alt"]);
    expect(c.sameUrl).toBe(true);
  });
});
