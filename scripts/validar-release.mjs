/**
 * Confere a coerência da release: tag (opcional) igual a `v<package.json>` e
 * seção correspondente no CHANGELOG. Uso: `node scripts/validar-release.mjs [vX.Y.Z]`.
 */
import { readFileSync } from "node:fs";

const versao = JSON.parse(readFileSync("package.json", "utf8")).version;
const erros = [];
const tag = process.argv[2];
if (tag && tag !== `v${versao}`) erros.push(`tag ${tag} diverge de package.json (v${versao}).`);
const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!new RegExp(`^## \\[${versao.replace(/\./g, "\\.")}\\]`, "m").test(changelog)) {
  erros.push(`CHANGELOG.md não tem a seção ${versao}.`);
}
if (erros.length) {
  console.error(erros.map((e) => `Erro: ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: release v${versao} coerente.`);
