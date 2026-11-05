/** Fluxo completo de `run`, `report` e `compare` com a API simulada. */
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executar } from "../src/cli.js";

const bruto = readFileSync(new URL("./fixtures/mobile.raw.json", import.meta.url), "utf8");

describe("pagespeedfy run", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PAGESPEEDFY_API_KEY;
    process.exitCode = undefined;
  });

  it("salva bruto, report.json e report.md por estratégia", async () => {
    process.env.PAGESPEEDFY_API_KEY = "AIzaTESTE";
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (u: string) => {
      urls.push(u);
      return new Response(bruto, { status: 200 });
    });
    const saida: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((s) => (saida.push(String(s)), true));
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const pasta = mkdtempSync(join(tmpdir(), "psf-run-"));
    await executar(["node", "pagespeedfy", "run", "https://exemplo.com.br/blog/post/", "-o", pasta, "--print", "path"]);

    expect(urls).toHaveLength(2);
    const caminho = saida.join("").trim();
    const dir = join(pasta, "exemplo.com.br", "blog--post");
    const execucao = readdirSync(dir)[0]!;
    expect(caminho).toBe(join(dir, execucao, "report.json"));
    expect(readdirSync(join(dir, execucao)).sort()).toEqual(["desktop.raw.json", "mobile.raw.json", "report.json", "report.md"]);
    const relatorio = JSON.parse(readFileSync(caminho, "utf8"));
    expect(relatorio.runs.map((r: { strategy: string }) => r.strategy)).toEqual(["mobile", "desktop"]);

    saida.length = 0;
    await executar(["node", "pagespeedfy", "compare", caminho, join(dir, execucao)]);
    expect(saida.join("")).toContain("Resolvidas (0)");

    saida.length = 0;
    await executar(["node", "pagespeedfy", "report", join(dir, execucao)]);
    expect(saida.join("")).toContain("render-blocking-insight");
  });

  it("recusa URL local com exit code 2", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await executar(["node", "pagespeedfy", "run", "http://localhost:4321/"]);
    expect(process.exitCode).toBe(2);
  });
});
