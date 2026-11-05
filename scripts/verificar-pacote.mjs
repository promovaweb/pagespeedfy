/**
 * Instala o tarball gerado por `npm pack` numa pasta temporária isolada e
 * confere que o binário `pagespeedfy` executa e imprime a versão do pacote.
 * Uso: `node scripts/verificar-pacote.mjs <arquivo.tgz>`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarball = resolve(process.argv[2] ?? "");
const versao = JSON.parse(readFileSync("package.json", "utf8")).version;
const pasta = mkdtempSync(join(tmpdir(), "pagespeedfy-pacote-"));
execFileSync("npm", ["init", "-y"], { cwd: pasta, stdio: "ignore" });
execFileSync("npm", ["install", "--no-audit", "--no-fund", tarball], { cwd: pasta, stdio: "inherit" });
const bin = join(pasta, "node_modules", ".bin", process.platform === "win32" ? "pagespeedfy.cmd" : "pagespeedfy");
const saida = execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();
if (saida !== versao) throw new Error(`pagespeedfy --version imprimiu ${saida}, esperado ${versao}.`);
const ajuda = execFileSync(bin, ["run", "--help"], { encoding: "utf8" });
if (!ajuda.includes("--strategy")) throw new Error("ajuda de run incompleta no pacote instalado.");
for (const arquivo of [".codex/skills/pagespeedfy-otimizar-pagina/SKILL.md", "ebook/ebook-pagespeedfy.pdf", "docs/user/README.md"]) {
  readFileSync(join(pasta, "node_modules", "@promovaweb", "pagespeedfy", arquivo));
}
console.log(`OK: pacote ${versao} instalado e executado em isolamento.`);
