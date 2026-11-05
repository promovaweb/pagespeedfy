/**
 * Publica o tarball no npm de modo idempotente, para que o job possa ser
 * reexecutado. Em repositório público, adiciona `--provenance`.
 * Uso: `node scripts/publicar-npm.mjs <arquivo.tgz>`; requer NODE_AUTH_TOKEN.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pacote = JSON.parse(readFileSync("package.json", "utf8"));
const tarball = resolve(process.argv[2] ?? `release-assets/promovaweb-pagespeedfy-${pacote.version}.tgz`);
const referencia = `${pacote.name}@${pacote.version}`;

/** Consulta o registry sem transformar pacote ausente em falha. */
function publicada() {
  try {
    const saida = execFileSync("npm", ["view", referencia, "version", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return JSON.parse(saida) === pacote.version;
  } catch {
    return false;
  }
}

if (publicada()) {
  console.log(`${referencia} já existe no npm; publicação ignorada.`);
  process.exit(0);
}
if (!process.env.NODE_AUTH_TOKEN) {
  throw new Error("Defina o secret NPM_TOKEN no repositório para publicar no npm.");
}
const argumentos = ["publish", tarball, "--access", "public"];
if (process.env.GITHUB_REPOSITORY_VISIBILITY === "public") argumentos.push("--provenance");
execFileSync("npm", argumentos, { stdio: "inherit" });
console.log(`${referencia} publicado no npm.`);
