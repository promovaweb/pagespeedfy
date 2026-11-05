/**
 * Lê a versão do pacote em tempo de execução, mantendo `package.json` como
 * fonte única de versão.
 */
import { readFileSync } from "node:fs";

/** Versão atual do Pagespeedfy, lida de `package.json`. */
export const VERSAO: string = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;
