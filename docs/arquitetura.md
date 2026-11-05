# Arquitetura

O Pagespeedfy é um pacote Node.js em TypeScript, com `commander` como única
dependência de execução. O `fetch` nativo do Node.js faz as chamadas HTTP.

## Módulos

| Arquivo | Responsabilidade |
| --- | --- |
| `bin/pagespeedfy.js` | Entrada publicada no npm; chama `executar()` do build |
| `src/cli.ts` | Definição dos comandos, leitura de opções, impressão e códigos de saída |
| `src/credenciais.ts` | Leitura, gravação atômica, remoção e resolução da API key |
| `src/api.ts` | Montagem da URL, chamada a `runPagespeed`, repetição e tradução de erros |
| `src/relatorio.ts` | Tipos e normalização da resposta bruta em `report.json` |
| `src/markdown.ts` | Renderização do `report.md` |
| `src/comparar.ts` | Comparação de dois relatórios |
| `src/armazenamento.ts` | Validação de URL, nomes de pasta e leitura e gravação de arquivos |
| `src/errors.ts` | `CliError`, convertido em mensagem e exit code |
| `src/versao.ts` | Versão lida de `package.json` |

## Fluxo de `run`

```text
URL ──► validarUrl ──► resolverChave ──► criarPastaExecucao
                                              │
          para cada estratégia (mobile, desktop, em sequência)
                                              │
              consultar (fetch + repetição) ──► <estratégia>.raw.json
                                              │
                       normalizarExecucao ──► runs[]
                                              │
                report.json  ◄────────────────┤
                report.md    ◄── relatorioMarkdown
```

As estratégias rodam em sequência para respeitar o limite de consultas por
minuto da API e para que uma falha no mobile não gaste a consulta do desktop.

## Escolhas de projeto

- **Uma URL por execução.** O CLI aceita um único argumento posicional e a
  skill trabalha uma página por vez. Isso mantém cada relatório ligado a uma
  rota do projeto e torna a comparação antes e depois direta.
- **JSON bruto preservado.** A normalização resume, e o bruto garante que
  nenhum dado da API se perca para a skill.
- **Credencial fora do projeto.** A chave fica em `~/.pagespeedfy/`, longe do
  repositório do site. A pasta usa `0700` e o arquivo `0600`.
- **Chave fora de argumentos.** `auth login` lê do terminal sem eco ou do
  stdin, para a chave não ficar no histórico do shell nem na lista de
  processos.
- **Recusa de URLs locais.** O PageSpeed Insights não alcança a máquina local.
  O CLI recusa antes de gastar cota.
- **Repetição seletiva.** 429 por minuto e 5xx são temporários e voltam a ser
  tentados. Cota diária esgotada, 400 e 403 não mudam com nova tentativa.

## Testes

`npm run validar` executa:

1. `tsc` sobre `src/` e sobre os testes.
2. `vitest run`, sem rede. A API é simulada com `tests/fixtures/mobile.raw.json`.
3. `tsc` de build para `dist/`.

| Teste | Cobertura |
| --- | --- |
| `tests/credenciais.test.ts` | Caminho, permissões, `createdAt`, prioridade da variável, arquivo corrompido, logout |
| `tests/api.test.ts` | Parâmetros da URL, repetição em 500, 403 sem repetição e com chave oculta, 429 por minuto e cota diária |
| `tests/relatorio.test.ts` | Notas, métricas, ordem, manuais, `notApplicable`, truncamento, limpeza de itens e CrUX |
| `tests/armazenamento-comparar.test.ts` | URLs aceitas e recusadas, slug, carimbo e comparação |
| `tests/cli.test.ts` | Fluxo `run` → `compare` → `report` com arquivos reais em pasta temporária |
| `tests/docs.test.ts` | Todo subcomando implementado tem seção e cinco exemplos em `docs/user/06-referencia-cli.md` |
