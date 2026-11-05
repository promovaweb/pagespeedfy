/**
 * Cliente da API PageSpeed Insights v5 (`runPagespeed`).
 *
 * Documentação oficial:
 * https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed
 */
import { CliError } from "./errors.js";

/** Endpoint público da API v5. */
export const ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Estratégias aceitas pela API. */
export const ESTRATEGIAS = ["mobile", "desktop"] as const;
export type Estrategia = (typeof ESTRATEGIAS)[number];

/** Categorias do Lighthouse aceitas pela API, no formato da linha de comando. */
export const CATEGORIAS = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/** Parâmetros de uma consulta. */
export interface ParametrosConsulta {
  url: string;
  apiKey: string;
  estrategia: Estrategia;
  categorias: readonly Categoria[];
  locale: string;
  timeoutMs: number;
  tentativas: number;
}

/** Função de transporte; substituída nos testes para não usar rede. */
export type Transporte = (url: string, init: RequestInit) => Promise<Response>;

/** Monta a URL da consulta com parâmetros repetidos para cada categoria. */
export function montarUrl(p: Omit<ParametrosConsulta, "timeoutMs" | "tentativas">): string {
  const busca = new URLSearchParams();
  busca.set("url", p.url);
  busca.set("key", p.apiKey);
  busca.set("strategy", p.estrategia.toUpperCase());
  busca.set("locale", p.locale);
  for (const categoria of p.categorias) {
    busca.append("category", categoria.replace("-", "_").toUpperCase());
  }
  return `${ENDPOINT}?${busca.toString()}`;
}

/** Remove a chave de mensagens e URLs antes de exibir ou registrar. */
export function ocultarChave(texto: string, apiKey: string): string {
  return apiKey ? texto.split(apiKey).join("***") : texto;
}

/** Status HTTP que justificam nova tentativa. */
function deveRepetir(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Executa `runPagespeed` e devolve o JSON bruto da API.
 *
 * Repete em 429 e 5xx com espera crescente (2 s, 4 s, ...), exceto quando a
 * cota diária acabou, pois repetir não muda o resultado. Erros 400 e 403
 * viram mensagens em português com a causa provável.
 */
export async function consultar(
  p: ParametrosConsulta,
  transporte: Transporte = fetch,
  esperar: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Record<string, unknown>> {
  const url = montarUrl(p);
  let ultimoErro = "";

  for (let tentativa = 1; tentativa <= p.tentativas; tentativa += 1) {
    let resposta: Response;
    try {
      resposta = await transporte(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(p.timeoutMs),
      });
    } catch (erro) {
      const nome = (erro as Error).name;
      ultimoErro =
        nome === "TimeoutError"
          ? `a API não respondeu em ${Math.round(p.timeoutMs / 1000)} s`
          : ocultarChave((erro as Error).message, p.apiKey);
      if (tentativa < p.tentativas) await esperar(2000 * tentativa);
      continue;
    }

    const corpo = await resposta.text();
    if (resposta.ok) {
      try {
        return JSON.parse(corpo) as Record<string, unknown>;
      } catch {
        throw new CliError("A API devolveu uma resposta que não é JSON.");
      }
    }

    const mensagemApi = extrairMensagem(corpo);
    ultimoErro = `HTTP ${resposta.status}: ${ocultarChave(mensagemApi, p.apiKey)}`;
    if (resposta.status === 429 && /per day/i.test(mensagemApi)) {
      throw new CliError(
        `A cota diária da API acabou (${ultimoErro}). Use uma API key própria com \`pagespeedfy auth login\` ou aguarde a renovação da cota.`,
      );
    }
    if (!deveRepetir(resposta.status)) {
      throw new CliError(traduzirErro(resposta.status, ultimoErro));
    }
    if (tentativa < p.tentativas) await esperar(2000 * tentativa);
  }

  throw new CliError(
    `A consulta ${p.estrategia} falhou após ${p.tentativas} tentativa(s): ${ultimoErro}`,
  );
}

/** Lê `error.message` do corpo de erro padrão das APIs do Google. */
function extrairMensagem(corpo: string): string {
  try {
    const json = JSON.parse(corpo) as { error?: { message?: string } };
    return json.error?.message ?? corpo.slice(0, 300);
  } catch {
    return corpo.slice(0, 300);
  }
}

/** Acrescenta a causa provável às falhas definitivas mais comuns. */
function traduzirErro(status: number, detalhe: string): string {
  if (status === 400) {
    return `A API recusou a consulta (${detalhe}). Confira se a URL é pública, responde com HTTP 200 e não exige login.`;
  }
  if (status === 403) {
    return `A API key foi recusada (${detalhe}). Confira se a PageSpeed Insights API está ativada no projeto do Google Cloud e se a chave não tem restrição incompatível.`;
  }
  return `A API recusou a consulta (${detalhe}).`;
}
