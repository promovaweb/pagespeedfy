/** Montagem da consulta, repetição e mensagens de erro da API. */
import { describe, expect, it } from "vitest";
import { consultar, montarUrl, type ParametrosConsulta } from "../src/api.js";

const base: ParametrosConsulta = {
  url: "https://exemplo.com.br/",
  apiKey: "AIzaSEGREDO",
  estrategia: "mobile",
  categorias: ["performance", "best-practices"],
  locale: "pt-BR",
  timeoutMs: 1000,
  tentativas: 3,
};

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

describe("montarUrl", () => {
  it("repete category e converte para o formato da API", () => {
    const u = new URL(montarUrl(base));
    expect(u.searchParams.getAll("category")).toEqual(["PERFORMANCE", "BEST_PRACTICES"]);
    expect(u.searchParams.get("strategy")).toBe("MOBILE");
    expect(u.searchParams.get("locale")).toBe("pt-BR");
  });
});

describe("consultar", () => {
  it("repete em 500 e devolve o JSON", async () => {
    let chamadas = 0;
    const json = await consultar(base, async () => (++chamadas < 2 ? resposta(500, { error: { message: "x" } }) : resposta(200, { ok: true })), async () => {});
    expect(json).toEqual({ ok: true });
    expect(chamadas).toBe(2);
  });

  it("não repete 403 e oculta a chave", async () => {
    let chamadas = 0;
    const promessa = consultar(base, async () => {
      chamadas += 1;
      return resposta(403, { error: { message: "key AIzaSEGREDO not valid" } });
    }, async () => {});
    await expect(promessa).rejects.toThrow(/\*\*\*.*Google Cloud/);
    await expect(promessa).rejects.not.toThrow(/SEGREDO/);
    expect(chamadas).toBe(1);
  });

  it("desiste após as tentativas em 429", async () => {
    await expect(consultar(base, async () => resposta(429, { error: { message: "quota" } }), async () => {})).rejects.toThrow("após 3 tentativa");
  });

  it("não repete quando a cota diária acabou", async () => {
    let chamadas = 0;
    const p = consultar(base, async () => (chamadas++, resposta(429, { error: { message: "Quota exceeded for 'Queries per day'" } })), async () => {});
    await expect(p).rejects.toThrow("cota diária");
    expect(chamadas).toBe(1);
  });
});
