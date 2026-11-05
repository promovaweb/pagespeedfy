/**
 * Confere que a referência do CLI cobre toda a superfície implementada:
 * uma seção `## \`pagespeedfy <comando>\`` por subcomando e pelo menos cinco
 * exemplos numerados em cada uma.
 */
import { readFileSync } from "node:fs";
import type { Command } from "commander";
import { describe, expect, it } from "vitest";
import { criarPrograma } from "../src/cli.js";

const doc = readFileSync(new URL("../docs/user/06-referencia-cli.md", import.meta.url), "utf8");

/** Lista os caminhos de comandos folha, como `auth login` e `run`. */
function folhas(cmd: Command, prefixo = ""): string[] {
  return cmd.commands.flatMap((sub) => {
    const nome = `${prefixo}${sub.name()}`;
    return sub.commands.length > 0 ? folhas(sub, `${nome} `) : [nome];
  });
}

describe("docs/user/06-referencia-cli.md", () => {
  const comandos = folhas(criarPrograma());

  it("encontra os comandos implementados", () => {
    expect(comandos.sort()).toEqual(["auth login", "auth logout", "auth status", "compare", "report", "run"]);
  });

  it.each(comandos)("documenta `%s` com cinco exemplos", (comando) => {
    const inicio = doc.search(new RegExp(`^## \`pagespeedfy ${comando}(\\s[^\`]*)?\`$`, "m"));
    expect(inicio, `seção ausente para ${comando}`).toBeGreaterThanOrEqual(0);
    const resto = doc.slice(inicio + 3);
    const fim = resto.search(/^## /m);
    const secao = fim === -1 ? resto : resto.slice(0, fim);
    const exemplos = secao.match(/^# [1-9]\. /gm) ?? [];
    expect(exemplos.length).toBeGreaterThanOrEqual(5);
  });
});
