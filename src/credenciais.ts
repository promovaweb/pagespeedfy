/**
 * Persistência da API key do PageSpeed Insights.
 *
 * A credencial fica em `~/.pagespeedfy/credentials`, em JSON, com a pasta em
 * 0700 e o arquivo em 0600. A variável `PAGESPEEDFY_HOME` troca a pasta base
 * (usada pelos testes) e `PAGESPEEDFY_API_KEY` tem prioridade sobre o arquivo.
 */
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CliError } from "./errors.js";

/** Conteúdo gravado em `~/.pagespeedfy/credentials`. */
export interface Credenciais {
  version: 1;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

/** Origem da chave efetivamente usada numa execução. */
export type OrigemChave = "env" | "arquivo";

/** Pasta base do Pagespeedfy, por padrão `~/.pagespeedfy`. */
export function pastaBase(): string {
  return process.env.PAGESPEEDFY_HOME ?? join(homedir(), ".pagespeedfy");
}

/** Caminho do arquivo de credencial. */
export function caminhoCredenciais(): string {
  return join(pastaBase(), "credentials");
}

/**
 * Confere o formato aceito pelo Google para API keys: 39 caracteres que
 * começam com `AIza`. A validação real acontece na primeira chamada à API.
 */
export function formatoChaveValido(chave: string): boolean {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(chave);
}

/** Mascara a chave para exibição, preservando prefixo e últimos dígitos. */
export function mascararChave(chave: string): string {
  if (chave.length <= 10) return "****";
  return `${chave.slice(0, 6)}…${chave.slice(-4)}`;
}

/**
 * Lê o arquivo de credencial. Retorna `null` quando ele não existe e falha
 * com mensagem clara quando o JSON está corrompido.
 */
export async function lerCredenciais(): Promise<Credenciais | null> {
  const caminho = caminhoCredenciais();
  let conteudo: string;
  try {
    conteudo = await readFile(caminho, "utf8");
  } catch (erro) {
    if (erro instanceof Error && "code" in erro && erro.code === "ENOENT") {
      return null;
    }
    throw erro;
  }

  try {
    const dados = JSON.parse(conteudo.replace(/^﻿/, "")) as Partial<Credenciais>;
    if (typeof dados.apiKey !== "string" || dados.apiKey.length === 0) {
      throw new Error("campo apiKey ausente");
    }
    return {
      version: 1,
      apiKey: dados.apiKey,
      createdAt: dados.createdAt ?? "",
      updatedAt: dados.updatedAt ?? "",
    };
  } catch (erro) {
    throw new CliError(
      `O arquivo ${caminho} é inválido (${(erro as Error).message}). Execute \`pagespeedfy auth login\` para gravá-lo de novo.`,
      1,
      { cause: erro },
    );
  }
}

/**
 * Grava a chave de forma atômica (arquivo temporário seguido de `rename`) e
 * aplica as permissões restritas em sistemas POSIX.
 */
export async function salvarCredenciais(apiKey: string): Promise<Credenciais> {
  const existente = await lerCredenciais().catch(() => null);
  const agora = new Date().toISOString();
  const credenciais: Credenciais = {
    version: 1,
    apiKey,
    createdAt: existente?.createdAt || agora,
    updatedAt: agora,
  };

  const pasta = pastaBase();
  const caminho = caminhoCredenciais();
  const temporario = `${caminho}.${process.pid}.tmp`;
  await mkdir(pasta, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await chmod(pasta, 0o700);
  try {
    await writeFile(temporario, `${JSON.stringify(credenciais, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporario, caminho);
  } catch (erro) {
    await rm(temporario, { force: true });
    throw erro;
  }
  if (process.platform !== "win32") await chmod(caminho, 0o600);
  return credenciais;
}

/** Remove o arquivo de credencial. Retorna `false` se ele não existia. */
export async function removerCredenciais(): Promise<boolean> {
  const existente = await lerCredenciais().catch(() => true);
  if (existente === null) return false;
  await rm(caminhoCredenciais(), { force: true });
  return true;
}

/**
 * Resolve a chave usada nas consultas: `PAGESPEEDFY_API_KEY` primeiro,
 * depois o arquivo. Falha com orientação quando nenhuma das duas existe.
 */
export async function resolverChave(): Promise<{ apiKey: string; origem: OrigemChave }> {
  const env = process.env.PAGESPEEDFY_API_KEY?.trim();
  if (env) return { apiKey: env, origem: "env" };
  const credenciais = await lerCredenciais();
  if (credenciais) return { apiKey: credenciais.apiKey, origem: "arquivo" };
  throw new CliError(
    "Nenhuma API key configurada. Execute `pagespeedfy auth login` ou defina PAGESPEEDFY_API_KEY.",
  );
}
