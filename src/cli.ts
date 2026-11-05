#!/usr/bin/env node
/**
 * CLI do Pagespeedfy.
 *
 * Comandos:
 * - `auth login|status|logout`: gerencia a API key em `~/.pagespeedfy/credentials`;
 * - `run <url>`: consulta o PageSpeed Insights para uma única página e salva
 *   o resultado bruto, o `report.json` normalizado e o `report.md`;
 * - `report <caminho>`: reimprime um relatório salvo;
 * - `compare <antes> <depois>`: compara duas execuções.
 */
import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import { Command, CommanderError, InvalidArgumentError, Option } from "commander";
import { CATEGORIAS, ESTRATEGIAS, consultar, type Categoria, type Estrategia } from "./api.js";
import {
  SAIDA_PADRAO,
  criarPastaExecucao,
  gravarJson,
  lerRelatorio,
  validarUrl,
} from "./armazenamento.js";
import { comparacaoMarkdown, comparar } from "./comparar.js";
import {
  caminhoCredenciais,
  formatoChaveValido,
  lerCredenciais,
  mascararChave,
  removerCredenciais,
  resolverChave,
  salvarCredenciais,
} from "./credenciais.js";
import { CliError } from "./errors.js";
import { relatorioMarkdown } from "./markdown.js";
import { VERSAO_FORMATO, normalizarExecucao, type Relatorio } from "./relatorio.js";
import { VERSAO } from "./versao.js";

/** Converte texto em inteiro positivo para opções numéricas. */
function inteiroPositivo(valor: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new InvalidArgumentError("use um inteiro maior que zero.");
  return n;
}

/** Acumula `--category` repetido e valida cada valor. */
function acumularCategoria(valor: string, anterior: Categoria[] | undefined): Categoria[] {
  const lista = anterior ?? [];
  for (const parte of valor.split(",").map((v) => v.trim()).filter(Boolean)) {
    if (!(CATEGORIAS as readonly string[]).includes(parte)) {
      throw new InvalidArgumentError(`categoria inválida "${parte}". Use: ${CATEGORIAS.join(", ")}.`);
    }
    if (!lista.includes(parte as Categoria)) lista.push(parte as Categoria);
  }
  return lista;
}

/** Lê a chave do stdin inteiro (uso em pipe). */
async function lerStdin(): Promise<string> {
  let dados = "";
  for await (const parte of process.stdin) dados += parte;
  return dados.trim();
}

/** Pergunta a chave no terminal sem ecoar os caracteres digitados. */
async function perguntarOculto(pergunta: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const saida = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
  let mostrandoPergunta = true;
  saida._writeToOutput = (s: string) => {
    if (mostrandoPergunta) saida.output.write(s);
  };
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(resposta.trim());
    });
    mostrandoPergunta = false;
  });
}

/** Imprime JSON ou texto conforme `--json`. */
function imprimir(json: boolean, dados: unknown, texto: string): void {
  process.stdout.write(json ? `${JSON.stringify(dados, null, 2)}\n` : texto.endsWith("\n") ? texto : `${texto}\n`);
}

/** Monta o programa. Exportado para os testes de superfície. */
export function criarPrograma(): Command {
  const programa = new Command();
  programa
    .name("pagespeedfy")
    .description("Consulta o PageSpeed Insights e gera relatórios para otimizar uma página por vez.")
    .version(VERSAO)
    .option("--json", "imprime a saída em JSON")
    .showHelpAfterError()
    .exitOverride();

  const auth = programa.command("auth").description("gerencia a API key do PageSpeed Insights");

  auth
    .command("login")
    .description("grava a API key em ~/.pagespeedfy/credentials")
    .option("--stdin", "lê a chave do stdin em vez de perguntar no terminal")
    .option("--validar", "faz uma consulta de teste antes de gravar")
    .action(async (opcoes: { stdin?: boolean; validar?: boolean }) => {
      const json = Boolean(programa.opts().json);
      let chave: string;
      if (opcoes.stdin) chave = await lerStdin();
      else if (process.stdin.isTTY) chave = await perguntarOculto("API key do PageSpeed Insights: ");
      else throw new CliError("Sem terminal interativo. Use `pagespeedfy auth login --stdin` e envie a chave pelo stdin.", 2);

      if (!chave) throw new CliError("Nenhuma chave informada.", 2);
      if (!formatoChaveValido(chave)) {
        process.stderr.write("Aviso: a chave não tem o formato habitual (AIza + 35 caracteres). Ela será gravada mesmo assim.\n");
      }
      if (opcoes.validar) {
        await consultar({
          url: "https://example.com/",
          apiKey: chave,
          estrategia: "mobile",
          categorias: ["seo"],
          locale: "pt-BR",
          timeoutMs: 120_000,
          tentativas: 2,
        });
      }
      const credenciais = await salvarCredenciais(chave);
      imprimir(
        json,
        { path: caminhoCredenciais(), apiKey: mascararChave(credenciais.apiKey), validated: Boolean(opcoes.validar), updatedAt: credenciais.updatedAt },
        `Chave ${mascararChave(chave)} gravada em ${caminhoCredenciais()}${opcoes.validar ? " (consulta de teste aprovada)" : ""}.`,
      );
    });

  auth
    .command("status")
    .description("mostra qual chave será usada e de onde ela vem")
    .action(async () => {
      const json = Boolean(programa.opts().json);
      const arquivo = await lerCredenciais();
      const env = process.env.PAGESPEEDFY_API_KEY?.trim();
      const ativa = env ? "env" : arquivo ? "arquivo" : null;
      const dados = {
        path: caminhoCredenciais(),
        file: arquivo ? { apiKey: mascararChave(arquivo.apiKey), createdAt: arquivo.createdAt, updatedAt: arquivo.updatedAt } : null,
        env: env ? mascararChave(env) : null,
        active: ativa,
      };
      const linhas = [
        `Arquivo: ${caminhoCredenciais()} ${arquivo ? `(${mascararChave(arquivo.apiKey)}, atualizado em ${arquivo.updatedAt})` : "(ausente)"}`,
        `PAGESPEEDFY_API_KEY: ${env ? mascararChave(env) : "não definida"}`,
        ativa ? `Em uso: ${ativa === "env" ? "variável de ambiente" : "arquivo"}.` : "Nenhuma chave configurada. Execute `pagespeedfy auth login`.",
      ];
      imprimir(json, dados, linhas.join("\n"));
      if (!ativa) process.exitCode = 1;
    });

  auth
    .command("logout")
    .description("remove o arquivo de credencial")
    .action(async () => {
      const json = Boolean(programa.opts().json);
      const removido = await removerCredenciais();
      imprimir(json, { path: caminhoCredenciais(), removed: removido }, removido ? `Removido: ${caminhoCredenciais()}.` : "Nenhuma credencial gravada.");
    });

  programa
    .command("run")
    .description("consulta o PageSpeed Insights para UMA página e salva o relatório")
    .argument("<url>", "URL pública e completa da página")
    .addOption(new Option("-s, --strategy <estrategia>", "mobile, desktop ou all").choices(["mobile", "desktop", "all"]).default("all"))
    .option("-c, --category <categoria>", `categoria a consultar; repita ou separe por vírgula (${CATEGORIAS.join(", ")})`, acumularCategoria)
    .option("-l, --locale <locale>", "idioma dos textos das auditorias", "pt-BR")
    .option("-o, --output <pasta>", "pasta base dos relatórios", SAIDA_PADRAO)
    .option("--max-items <n>", "itens de detalhe preservados por auditoria no report.json", inteiroPositivo, 50)
    .option("--timeout <segundos>", "tempo máximo por consulta", inteiroPositivo, 180)
    .option("--retries <n>", "tentativas por estratégia em 429 e 5xx", inteiroPositivo, 3)
    .option("--print <formato>", "o que imprimir ao fim: summary, markdown ou path", "summary")
    .action(async (entrada: string, opcoes: {
      strategy: "mobile" | "desktop" | "all";
      category?: Categoria[];
      locale: string;
      output: string;
      maxItems: number;
      timeout: number;
      retries: number;
      print: string;
    }) => {
      const json = Boolean(programa.opts().json);
      if (!["summary", "markdown", "path"].includes(opcoes.print)) {
        throw new CliError("--print aceita summary, markdown ou path.", 2);
      }
      const url = validarUrl(entrada);
      const { apiKey } = await resolverChave();
      const categorias = opcoes.category && opcoes.category.length > 0 ? opcoes.category : [...CATEGORIAS];
      const estrategias: Estrategia[] = opcoes.strategy === "all" ? [...ESTRATEGIAS] : [opcoes.strategy];
      const pasta = await criarPastaExecucao(opcoes.output, url);

      const relatorio: Relatorio = {
        formatVersion: VERSAO_FORMATO,
        tool: "pagespeedfy",
        toolVersion: VERSAO,
        generatedAt: new Date().toISOString(),
        url: url.toString(),
        locale: opcoes.locale,
        categories: categorias,
        maxItems: opcoes.maxItems,
        runs: [],
      };

      for (const estrategia of estrategias) {
        process.stderr.write(`Consultando ${estrategia}: ${url.toString()}\n`);
        const bruto = await consultar({
          url: url.toString(),
          apiKey,
          estrategia,
          categorias,
          locale: opcoes.locale,
          timeoutMs: opcoes.timeout * 1000,
          tentativas: opcoes.retries,
        });
        const arquivoBruto = `${estrategia}.raw.json`;
        await gravarJson(join(pasta, arquivoBruto), bruto);
        relatorio.runs.push(normalizarExecucao(bruto, estrategia, arquivoBruto, opcoes.maxItems));
      }

      const md = relatorioMarkdown(relatorio);
      await gravarJson(join(pasta, "report.json"), relatorio);
      await writeFile(join(pasta, "report.md"), md, "utf8");

      const caminhoRelativo = relative(process.cwd(), pasta) || ".";
      if (json) {
        imprimir(true, { dir: pasta, report: join(pasta, "report.json"), markdown: join(pasta, "report.md"), runs: relatorio.runs.map((r) => ({ strategy: r.strategy, scores: r.scores, failedAudits: r.failedAudits.length })) }, "");
        return;
      }
      if (opcoes.print === "markdown") {
        process.stdout.write(md);
      } else if (opcoes.print === "path") {
        process.stdout.write(`${join(pasta, "report.json")}\n`);
      } else {
        const linhas = relatorio.runs.map((r) => {
          const notas = Object.entries(r.scores).map(([c, n]) => `${c} ${n ?? "—"}`).join(" · ");
          return `${r.strategy}: ${notas} · ${r.failedAudits.length} auditorias pendentes`;
        });
        process.stdout.write(`${linhas.join("\n")}\nRelatório: ${join(caminhoRelativo, "report.json")}\nResumo: ${join(caminhoRelativo, "report.md")}\n`);
      }
    });

  programa
    .command("report")
    .description("reimprime um relatório salvo (pasta da execução ou report.json)")
    .argument("<caminho>", "pasta da execução ou arquivo report.json")
    .action(async (caminho: string) => {
      const json = Boolean(programa.opts().json);
      const relatorio = await lerRelatorio(caminho);
      imprimir(json, relatorio, relatorioMarkdown(relatorio));
    });

  programa
    .command("compare")
    .description("compara duas execuções da mesma página")
    .argument("<antes>", "pasta ou report.json da execução anterior")
    .argument("<depois>", "pasta ou report.json da execução posterior")
    .action(async (antes: string, depois: string) => {
      const json = Boolean(programa.opts().json);
      const comparacao = comparar(await lerRelatorio(antes), await lerRelatorio(depois));
      imprimir(json, comparacao, comparacaoMarkdown(comparacao));
    });

  return programa;
}

/**
 * Executa o CLI e converte `CliError` e erros de uso do Commander em mensagem
 * e exit code.
 */
export async function executar(argv = process.argv): Promise<void> {
  try {
    await criarPrograma().parseAsync(argv);
  } catch (erro) {
    if (erro instanceof CliError) {
      process.stderr.write(`Erro: ${erro.message}\n`);
      process.exitCode = erro.codigoSaida;
      return;
    }
    // O Commander já imprimiu a mensagem. Ajuda e versão saem com 0; argumento
    // ou opção inválida saem com 2, como documenta a referência do CLI.
    if (erro instanceof CommanderError) {
      process.exitCode = ["commander.helpDisplayed", "commander.version", "commander.help"].includes(erro.code) ? 0 : 2;
      return;
    }
    throw erro;
  }
}

/** Execução direta em desenvolvimento (`npm run dev`, `node dist/cli.js`). */
const principal = process.argv[1] ?? "";
if (/cli\.(js|ts)$/.test(principal)) {
  await executar();
}
