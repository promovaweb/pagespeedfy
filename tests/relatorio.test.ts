/** Normalização do resultado bruto em `report.json`. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { limparItem, normalizarExecucao } from "../src/relatorio.js";

const bruto = JSON.parse(readFileSync(new URL("./fixtures/mobile.raw.json", import.meta.url), "utf8"));

describe("normalizarExecucao", () => {
  const r = normalizarExecucao(bruto, "mobile", "mobile.raw.json", 2);

  it("converte notas para 0 a 100", () => {
    expect(r.scores).toEqual({ performance: 62, accessibility: 88, seo: 92 });
  });

  it("separa métricas de laboratório das pendências", () => {
    expect(r.labMetrics["largest-contentful-paint"]?.displayValue).toBe("4,2 s");
    expect(r.failedAudits.map((a) => a.id)).not.toContain("largest-contentful-paint");
  });

  it("lista só auditorias reprovadas, por peso e economia", () => {
    expect(r.failedAudits.map((a) => a.id)).toEqual([
      "color-contrast",
      "meta-description",
      "render-blocking-insight",
      "image-delivery-insight",
    ]);
    expect(r.passedAuditIds).toEqual(["document-title", "image-alt", "unused-javascript"]);
  });

  it("registra verificações manuais e ignora notApplicable", () => {
    expect(r.manualAudits).toEqual([{ id: "focus-traps", category: "accessibility", title: "O usuário não fica preso em uma região" }]);
    expect(r.failedAudits.find((a) => a.id === "font-display-insight")).toBeUndefined();
  });

  it("trunca itens e remove chaves internas do Lighthouse", () => {
    const img = r.failedAudits.find((a) => a.id === "image-delivery-insight")!;
    expect(img.totalItems).toBe(3);
    expect(img.items).toHaveLength(2);
    expect(img.truncated).toBe(true);
    expect(img.items[0]).toEqual({ url: "https://exemplo.com.br/cover.png", wastedBytes: 204800, node: { selector: "main > img.cover", snippet: '<img src="/cover.png">' } });
  });

  it("lê dados de campo e trata origem vazia como ausente", () => {
    expect(r.field.page?.metrics.LARGEST_CONTENTFUL_PAINT_MS).toEqual({ percentile: 3100, category: "AVERAGE" });
    expect(r.field.origin).toBeNull();
  });

  it("preserva avisos e URL final", () => {
    expect(r.runWarnings).toEqual(["A página carregou devagar."]);
    expect(r.finalUrl).toBe("https://exemplo.com.br/blog/post/");
  });
});

describe("limparItem", () => {
  it("remove boundingRect, lhId e path em qualquer nível", () => {
    expect(limparItem({ a: [{ path: "x", b: 1 }], lhId: "y" })).toEqual({ a: [{ b: 1 }] });
  });
});
