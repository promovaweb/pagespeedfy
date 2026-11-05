/**
 * Caminhos e gravação dos arquivos de uma execução.
 *
 * Estrutura: `<saida>/<host>/<slug-da-rota>/<AAAAMMDD-HHMMSS>/` com
 * `mobile.raw.json`, `desktop.raw.json`, `report.json` e `report.md`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CliError } from "./errors.js";
import type { Relatorio } from "./relatorio.js";

/** Pasta padrão dos relatórios, relativa ao diretório atual. */
export const SAIDA_PADRAO = ".pagespeedfy/reports";

/**
 * Valida a URL informada: absoluta, http ou https e acessível pela internet.
 * O PageSpeed Insights roda nos servidores do Google e não alcança
 * `localhost`, IPs privados nem domínios `.local`.
 */
export function validarUrl(entrada: string): URL {
  let url: URL;
  try {
    url = new URL(entrada);
  } catch {
    throw new CliError(`URL inválida: ${entrada}. Informe a URL completa, com https://.`, 2);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new CliError(`Protocolo não suportado: ${url.protocol}. Use http ou https.`, 2);
  }
  const host = url.hostname;
  const privado =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]";
  if (privado) {
    throw new CliError(
      `O PageSpeed Insights não alcança ${host}. Publique a página (preview ou produção) e informe a URL pública.`,
      2,
    );
  }
  return url;
}

/** Converte o caminho da URL em nome de pasta estável (`/` vira `home`). */
export function slugRota(url: URL): string {
  const partes = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  const base = partes.length === 0 ? "home" : partes.join("--");
  const consulta = url.search ? `--q-${url.search.slice(1)}` : "";
  return `${base}${consulta}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);
}

/** Carimbo de data local no formato `AAAAMMDD-HHMMSS`. */
export function carimbo(data = new Date()): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}${d(data.getMonth() + 1)}${d(data.getDate())}-${d(data.getHours())}${d(data.getMinutes())}${d(data.getSeconds())}`;
}

/** Cria e devolve a pasta absoluta da execução. */
export async function criarPastaExecucao(saida: string, url: URL, data = new Date()): Promise<string> {
  const pasta = resolve(saida, url.host.replace(/:/g, "_"), slugRota(url), carimbo(data));
  await mkdir(pasta, { recursive: true });
  return pasta;
}

/** Grava um JSON formatado. */
export async function gravarJson(caminho: string, dados: unknown): Promise<void> {
  await writeFile(caminho, `${JSON.stringify(dados, null, 2)}\n`, "utf8");
}

/**
 * Lê um `report.json`. Aceita o caminho do arquivo ou da pasta da execução.
 */
export async function lerRelatorio(caminho: string): Promise<Relatorio> {
  const candidatos = caminho.endsWith(".json") ? [caminho] : [join(caminho, "report.json"), caminho];
  for (const candidato of candidatos) {
    let conteudo: string;
    try {
      conteudo = await readFile(candidato, "utf8");
    } catch {
      continue;
    }
    const dados = JSON.parse(conteudo) as Partial<Relatorio>;
    if (dados.tool !== "pagespeedfy" || !Array.isArray(dados.runs)) {
      throw new CliError(`${candidato} não é um report.json do Pagespeedfy.`);
    }
    return dados as Relatorio;
  }
  throw new CliError(`Relatório não encontrado em ${caminho}.`);
}
