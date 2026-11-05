/** Gravação, leitura e prioridade da API key. */
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  caminhoCredenciais,
  formatoChaveValido,
  lerCredenciais,
  mascararChave,
  removerCredenciais,
  resolverChave,
  salvarCredenciais,
} from "../src/credenciais.js";

const CHAVE = "AIza" + "a".repeat(35);

describe("credenciais", () => {
  beforeEach(() => {
    process.env.PAGESPEEDFY_HOME = join(mkdtempSync(join(tmpdir(), "psf-")), ".pagespeedfy");
    delete process.env.PAGESPEEDFY_API_KEY;
  });
  afterEach(() => {
    delete process.env.PAGESPEEDFY_HOME;
    delete process.env.PAGESPEEDFY_API_KEY;
  });

  it("grava em <home>/credentials com permissões restritas", async () => {
    await salvarCredenciais(CHAVE);
    expect(caminhoCredenciais()).toBe(join(process.env.PAGESPEEDFY_HOME!, "credentials"));
    expect((await lerCredenciais())?.apiKey).toBe(CHAVE);
    if (process.platform !== "win32") {
      expect(statSync(caminhoCredenciais()).mode & 0o777).toBe(0o600);
      expect(statSync(process.env.PAGESPEEDFY_HOME!).mode & 0o777).toBe(0o700);
    }
  });

  it("preserva createdAt ao regravar", async () => {
    const primeira = await salvarCredenciais(CHAVE);
    const segunda = await salvarCredenciais(CHAVE.replace("a", "b"));
    expect(segunda.createdAt).toBe(primeira.createdAt);
  });

  it("prioriza PAGESPEEDFY_API_KEY", async () => {
    await salvarCredenciais(CHAVE);
    process.env.PAGESPEEDFY_API_KEY = "AIzaENV";
    expect(await resolverChave()).toEqual({ apiKey: "AIzaENV", origem: "env" });
  });

  it("falha com orientação sem chave", async () => {
    await expect(resolverChave()).rejects.toThrow("pagespeedfy auth login");
  });

  it("recusa arquivo corrompido", async () => {
    await salvarCredenciais(CHAVE);
    writeFileSync(caminhoCredenciais(), "{");
    await expect(lerCredenciais()).rejects.toThrow("é inválido");
  });

  it("logout remove e informa ausência", async () => {
    await salvarCredenciais(CHAVE);
    expect(await removerCredenciais()).toBe(true);
    expect(await removerCredenciais()).toBe(false);
  });

  it("valida formato e mascara", () => {
    expect(formatoChaveValido(CHAVE)).toBe(true);
    expect(formatoChaveValido("abc")).toBe(false);
    expect(mascararChave(CHAVE)).toBe("AIzaaa…aaaa");
  });
});
