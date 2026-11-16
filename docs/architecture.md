# Arquitetura

```text
src/
  main.ts                 entry point: decide TUI, CLI ou help
  app/
    manifest.ts           identidade do binário (name, version, author, links)
    exit-codes.ts         tabela de exit codes
    errors.ts             AppError e atalhos error.*
  cli/
    index.ts              runCli(argv): parse, options globais, envelope JSON
    registry.ts           tipos Command, OptionDefinition, Context, Result
    parser.ts             argv → command, arguments e options
    help.ts               renderização do --help a partir do registry
    opencli.ts            descrição OpenCLI a partir do registry
    format.ts             cores, tabelas e seções da saída de texto
    input.ts              leitura de segredos e confirmações
    pagespeed-options.ts  options compartilhadas (--project, --strategy, parsers)
    commands.ts           raiz da árvore de commands
    commands/             um arquivo por command
      run.ts              mede uma página e registra a mediana
      history.ts          lista páginas ou a linha do tempo de uma
      report.ts           imprime uma medição completa
      compare.ts          compara duas medições
      import.ts           importa report.json da 0.3.x
      forget.ts           apaga uma medição
      about.ts, tui.ts, config.ts, credentials.ts, mcp.ts,
      skill.ts, doctor.ts, completion.ts
  config/
    paths.ts              ~/.<bin>/ e variáveis de ambiente
    settings.ts           settings.json e SETTINGS_SCHEMA
    crypto.ts             AES-256-GCM e master key
    credentials.ts        cofre cifrado
  db/
    database.ts           abre o SQLite e aplica as migrations
    migrations/           0001-create-history.ts (pages, measurements)
    history.ts            repositório de pages e measurements
  pagespeed/
    api.ts                client HTTP do PageSpeed Insights
    key.ts                API key: variável, cofre e migração da 0.3.x
    measure.ts            mede, grava os brutos e registra a mediana
    project.ts            resolve a raiz e a pasta .pagespeedfy/
    queries.ts            consultas do histórico e import legado
    report.ts             normalização da resposta e tipos do run
    compare.ts            comparação de duas medições
    budget.ts             --fail-under e --fail-on-regression
    markdown.ts           renderização em texto
    url.ts                validação de URL, host e slug da rota
  mcp/
    server.ts             McpServer, stdio e catalog para `mcp --list`
    tools/                um registro por grupo de tools
      base.ts, config.ts, doctor.ts
      pagespeed.ts        as quatro tools do PageSpeed
    resources/            resources e templates
    prompts.ts            prompts
  tui/
    index.ts              montagem: header, tabs, content, status bar
    theme.ts              paletas night e day
    screen.ts             contrato Screen e ScreenContext
    components.ts         panel, keyValueTable, list, heading, dim
    screens/              uma aba por arquivo
  skill/
    index.ts              docs/ embutida + referência gerada do registry
docs/                     documentação do binário; entra no --skill
template/                 stubs de command, screen e tool mantidos no repositório
.agents/skills/           skills do framework Termfy, instaladas via npx skills
scripts/                  build, init e checks
tests/                    bun test
```

## Camadas

| Camada | Papel | Não conhece |
| --- | --- | --- |
| `app/` | identidade, exit codes, erros | nada do projeto |
| `config/` | pasta de dados, settings, cofre | domínio e apresentação |
| `db/` | SQLite do histórico: abertura, migrations e repositório | CLI, MCP e TUI |
| `pagespeed/` | domínio: URL, API key, medição, normalização, comparação, orçamento e projeto | apresentação |
| `cli/` | parse, commands, saída texto/JSON | TUI |
| `mcp/` | tools, resources e prompts | TUI |
| `tui/` | screens e renderização | CLI e MCP |

`src/pagespeed/` é o domínio do binário. Ele guarda a regra que precisa ser
a mesma nos três modos: qual URL é aceita, qual chave vale, como uma
resposta vira run, como a mediana é escolhida, o que conta como regressão e
onde fica o histórico. `src/db/` é a única camada com SQL das tabelas
`pages` e `measurements`.

`src/pagespeed/project.ts` decide a raiz do projeto, e o histórico mora em
`<projeto>/.pagespeedfy/`. `src/config/paths.ts` continua cuidando de
`~/.pagespeedfy/`, onde ficam settings.json e o cofre. São duas pastas com
papéis diferentes: uma é do site, a outra é do aplicativo.

## Quem usa o quê

| Modo | Entrada | Domínio e banco |
| --- | --- | --- |
| CLI | `cli/commands/run.ts`, `history.ts`, `report.ts`, `compare.ts`, `import.ts`, `forget.ts` | `pagespeed/measure.ts`, `pagespeed/queries.ts`, `db/history.ts` |
| MCP | `mcp/tools/pagespeed.ts` | as mesmas funções de `pagespeed/` e `db/` |
| TUI | `tui/screens/history.ts` | `db/history.ts` e `pagespeed/queries.ts`, só leitura |

Os commands e as tools não repetem regra: eles leem options, chamam o
domínio e formatam o resultado. É por isso que `run` e `pagespeed_run`
gravam do mesmo jeito e que `compare` e `pagespeed_compare` calculam a
mesma coisa.

## Fluxo de `run`

1. `url.ts` valida a URL e recusa endereço local.
2. `project.ts` resolve a raiz e cria `.pagespeedfy/` com o `.gitignore`.
3. `key.ts` resolve a API key: variável, migração da 0.3.x, cofre.
4. `api.ts` consulta cada estratégia em paralelo; dentro da estratégia, as
   leituras de `--samples` rodam em sequência.
5. Cada resposta bruta é gravada em
   `.pagespeedfy/reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/`.
6. `report.ts` normaliza e escolhe a mediana por performance.
7. `db/history.ts` grava uma linha por estratégia, com o mesmo `session`.
8. O command confere o `--fail-under` e decide entre exit code 0 e 10.

## Fluxo de execução

1. `main.ts` lê `argv`. Sem argumentos e com TTY, chama `runCli(["tui"])`.
   Sem TTY, imprime o help e sai com 2. Com argumentos, passa adiante.
2. `parser.ts` caminha pela árvore do registry, separa options e arguments e
   valida contra as definições. Falhas viram `AppError(2)`.
3. `index.ts` trata `--version`, `--opencli`, `--skill` e `--help`. Depois
   chama `run(ctx)` do command.
4. O command devolve `{ data, text, code? }`. `index.ts` imprime texto ou o
   envelope JSON e devolve o exit code.
5. `main.ts` encerra o processo com esse code.

`mcp` e `tui` são commands como os demais; eles só não devolvem antes de o
transporte ou o renderer fechar.

## Regras de dependência

- `app/` não importa de nenhuma outra camada.
- `config/` importa só de `app/`.
- `db/` importa de `app/` e os tipos de `pagespeed/report.ts`; não abre
  conexão sozinho, recebe o `Database` de quem chama.
- `pagespeed/` importa de `app/`, `config/` e `db/`.
- `cli/`, `mcp/` e `tui/` importam de `app/`, `config/`, `db/` e
  `pagespeed/`. `mcp/` e `tui/` podem reutilizar funções de coleta, nunca o
  contrário de `cli/`.
- `skill/` importa de `cli/registry.ts` para gerar a referência.

## Idioma do código

Todo o código é em inglês: nomes de arquivos, identificadores, comentários,
mensagens do binário, commands, options, keys e campos do `--json`. A
documentação em `docs/`, o `README.md`, o `AGENTS.md` e as skills são em
português do Brasil com os termos técnicos em inglês.

## Build

`bun run build` compila `src/main.ts` em `dist/<bin>` para a plataforma atual
com `bun build --compile`. `bun run build:all` gera linux-x64, linux-arm64,
darwin-x64, darwin-arm64 e windows-x64. O OpenTUI embute a biblioteca nativa
no executável; o `docs/` entra como texto; o `package.json` entra como JSON.
