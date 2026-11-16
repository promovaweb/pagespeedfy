# Contribuindo com o Pagespeedfy

Este guia é para quem desenvolve, revisa ou mantém o Pagespeedfy. Para instalar
e usar a ferramenta, leia o [README.md](README.md).

O Pagespeedfy é um binário Bun em TypeScript, criado com o starter kit do
[Termfy](https://github.com/promovaweb/termfy). O mesmo executável abre a TUI,
roda como CLI e sobe um servidor MCP por stdio. Ele traz uma skill para agentes
no formato lido pelo `npx skills`. O site que a skill corrige é um projeto
[Astro](https://github.com/withastro/astro).

## Antes de começar

Mudanças de comportamento começam por uma conversa. Use o
[Discord](https://promovaweb.com/discord) para dúvidas de uso e de direção.
Abra uma [issue](https://github.com/promovaweb/pagespeedfy/issues) por mudança.
Descreva o problema, a versão (`pagespeedfy --version`), o sistema operacional e
o passo a passo para reproduzir.

Pull requests grandes sem issue discutida antes podem ficar em revisão por mais
tempo. Correções pequenas de documentação e de texto podem ir direto para o
pull request.

## Ambiente

Requisitos:

- Bun 1.4.4 ou superior. Node.js não roda o binário.
- Git.

```bash
git clone https://github.com/promovaweb/pagespeedfy.git
cd pagespeedfy
bun install
bun run dev -- --help          # executa o CLI pelo TypeScript
bun run dev -- run https://exemplo.com/
```

Para experimentar sem gravar no seu histórico real, use um projeto temporário
e uma chave de teste:

```bash
PAGESPEEDFY_PROJECT=/tmp/pagespeedfy-dev PAGESPEEDFY_API_KEY=AIza... bun run dev -- run https://exemplo.com/
```

O cofre e as preferências ficam em `~/.pagespeedfy/`. O histórico fica no
projeto, em `.pagespeedfy/`. A variável `PAGESPEEDFY_PROJECT` aponta outra
pasta.

### Os testes não usam rede

A suíte troca a API real por um servidor local, apontado por
`PAGESPEEDFY_API_ENDPOINT`. Os fixtures da resposta ficam em `tests/fixtures/`.
Um teste de ponta a ponta sobe o servidor, mede uma página e lê o histórico,
tudo em disco temporário. Não há chamada ao Google. Por isso a suíte roda em
CI e em máquina sem chave.

## Organização do código

```text
src/
  main.ts               entrada: TUI sem argumentos, CLI com argumentos, mcp com subcomando
  app/                  erros, tabela de exit codes e identidade do binário
  config/               cofre cifrado, chave mestra, settings.json e caminhos
  pagespeed/            domínio: URL, API, medição, normalização, comparação, budget e markdown
  db/                   histórico em SQLite, com migrations em db/migrations/
  cli/                  registry e um arquivo por command em cli/commands/
  mcp/                  servidor, resources, prompts e um grupo de tools por arquivo
  tui/                  tema, telas em tui/screens/ e o registry de abas
  skill/                documentação embutida lida por --skill
docs/                   documentação embutida e aberta pelo comando skill
docs/opencli.json       descrição da árvore de comandos, gerada pelo registry
skills/                 skill pagespeedfy-otimizar-pagina e referências
ebook/                  artefatos PDF e EPUB gerados a partir de docs/user/
.ebook/                 gerador do ebook, templates, CSS e metadados
brand/                  logo, paleta, tokens e fontes da marca
scripts/                build, validações, init e geração do README do npm
tests/                  bun test, com servidor local e fixtures da API
npm/                    pacote publicado no npm: invólucro que baixa o binário da release
dist/                   binário compilado por bun run build
```

As partes que fazem o Pagespeedfy ser Pagespeedfy:

| Caminho | Responsabilidade |
| --- | --- |
| `src/pagespeed/` | medir, normalizar a resposta da API, montar o relatório, comparar e aplicar o budget |
| `src/db/` | schema do histórico, migrations e consultas de páginas, medições e auditorias |
| `src/cli/commands/` | um arquivo por command, registrado em `src/cli/commands.ts` |
| `src/mcp/tools/pagespeed.ts` | tools `pagespeed_run`, `pagespeed_history`, `pagespeed_report` e `pagespeed_compare` |
| `src/tui/screens/history.ts` | aba History: páginas, linha do tempo, filtro e detalhe |

O resto vem do Termfy e segue a estrutura do starter kit: cofre, settings,
`about`, `doctor`, `completion`, resources e prompts do MCP, tema da TUI. As
camadas e o fluxo de dados estão em
[docs/architecture.md](docs/architecture.md). O mapa de onde cada mudança entra
(command, tela, tool, key, migration, regra de medição) está em
[docs/customize-template.md](docs/customize-template.md).

## Skills e especificação

As skills que ensinam a evoluir este repositório vêm do framework
[Termfy](https://github.com/promovaweb/termfy) e ficam em `.agents/skills/`,
com links em `.claude/skills/` e origem registrada em `skills-lock.json`. O
[AGENTS.md](AGENTS.md) lista a ordem de leitura e as regras que valem para toda
mudança. Não edite `.agents/skills/termfy-*` à mão: a atualização chega por
`bun run skills:update` ou pela manutenção conduzida por `termfy-init`.

Antes de implementar um command, uma tela ou uma tool, leia a spec aberta em
`specs/` que cobre o pedido. O `CLISPEC.md` guarda a visão macro do binário e o
índice das specs. Quando nenhuma spec cobrir o pedido, escreva a spec com a
skill `termfy-spec`. Marque os itens ao concluir, atualize a superfície no
`CLISPEC.md` e mude o status para `done`.

## Fluxo de trabalho

1. Abra ou escolha uma issue que descreva o comportamento esperado.
2. Crie um branch curto a partir da `main`.
3. Faça a mudança em `src/` e acrescente o teste correspondente em `tests/`.
4. Se a mudança alterar a superfície do CLI, atualize `docs/` e rode
   `bun run opencli`. `bun run docs:check` confere que todo command, option,
   tool, resource, prompt, chave e exit code aparece na documentação.
5. Rode `bun run validate` e, quando o ebook mudar, `bun run ebook:verify`.
6. Abra o pull request com a issue relacionada e a validação executada.

## Regras do código

- Código, nomes de arquivos, comandos, mensagens do binário, commands, options,
  keys de configuração e campos do `--json` em inglês. Documentação para
  pessoas, comentários de cabeçalho e JSDoc em português do Brasil, com os
  termos técnicos em inglês.
- Todo command, option, tool e key nasce documentado: `description` no
  registry, seção em `docs/` e, quando for conceito novo, um parágrafo em prosa.
  O `--skill` imprime `docs/` inteiro mais a referência gerada do registry.
- Exit codes vêm de `src/app/exit-codes.ts`. Zero é sucesso. Não invente número
  em command: acrescente a família na tabela.
- Segredos nunca passam por argumento, log, erro, `--json` sem `--reveal`, tool
  do MCP ou frame da TUI. Leia com `getCredential()`.
- Stdout recebe dados. Stderr recebe progresso e avisos. No modo `mcp`, o
  stdout é do JSON-RPC.
- Um arquivo por command, por tela e por grupo de tools. O registro central fica
  em `src/cli/commands.ts`, `src/tui/screens/index.ts` e `src/mcp/server.ts`.
- Cores da TUI só em `src/tui/theme.ts`.
- Node e npm não entram no binário. O projeto usa Bun para rodar, testar e
  compilar. O `npx skills` é a única exceção, por ser a ferramenta oficial de
  distribuição de skills.
- Documente o código novo ou alterado com cabeçalho explicando o propósito do
  arquivo e JSDoc em funções exportadas.
- `dist/` é gerado. Não edite à mão: rode `bun run build`.

## Validar

O comando completo é:

```bash
bun run validate
```

Ele executa, nesta ordem:

1. `bun run typecheck`: `tsc --noEmit`.
2. `bun test`: suíte completa, sem rede.
3. `bun run skills:check`: confere as skills instaladas e o lock.
4. `bun run opencli:check`: confere `docs/opencli.json` contra o registry.
5. `bun run docs:check`: confere a documentação contra o código.
6. `bun run build`: compila o binário em `dist/`.

Comandos auxiliares:

```bash
bun test tests/pagespeed-e2e.test.ts    # um arquivo de teste
bun run opencli                         # regera docs/opencli.json
bun run dev -- mcp --list               # tools, resources e prompts do servidor
bun run build:all                       # binários para todas as plataformas
bun run ebook                           # gera PDF e EPUB do guia
bun run ebook:verify                    # confere o ebook sem gerar
```

A CI em `.github/workflows/ci.yml` roda `bun install --frozen-lockfile` e
`bun run validate` a cada pull request e push na `main`.

## Documentação

| Onde | O que fica |
| --- | --- |
| `README.md` | instalação e uso, publicado também na página do npm |
| `docs/` | documentação embutida, impressa por `pagespeedfy --skill` |
| `docs/user/` | guia do usuário, fonte do ebook |
| `docs/architecture.md` | camadas, fluxo de dados e testes |
| `docs/customize-template.md` | onde cada mudança entra no código |
| `docs/release.md` | publicação de versões |
| `skills/pagespeedfy-otimizar-pagina/` | instruções lidas pelo agente e referências |
| `brand/README.md` | logo, paleta e regras de uso da marca |

O manual é publicado em <https://promovaweb.com/docs/pagespeedfy/>.

### Ebook

O PDF e o EPUB saem de `docs/user/`, na ordem de `docs/user/reading-order.txt`.
O gerador fica em `.ebook/build-ebook.mjs` e usa `brand/logo/logo-light.png` e
`brand/tokens.json`. A versão em `ebook/VERSION` acompanha o `package.json`.

```bash
bun run ebook
bun run ebook:verify
```

A geração precisa de Pandoc, `xmllint`, `pdftotext`, `pdftohtml`, `pdffonts`,
`unzip` e Chromium via Playwright. O `ebook:verify` confere versão, hashes, XML
do EPUB, links internos, fontes incorporadas e a presença de cada capítulo no
PDF, sem abrir o navegador.

## Commits e pull requests

Os commits seguem Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
`build:`). Os prefixos orientam a seção da próxima versão no `CHANGELOG.md`.

Um pull request deve trazer:

- descrição do problema e do comportamento novo;
- a issue relacionada;
- os comandos de validação executados;
- captura de tela ou trecho de saída quando a mudança for visível no terminal.

Não inclua a API key, URLs privadas nem conteúdo de `.pagespeedfy/reports/` no
pull request.

## Releases

A versão vem do `package.json` e o histórico fica no `CHANGELOG.md`. A tag
`vX.Y.Z` dispara o workflow `release.yml`, que compila os binários das cinco
plataformas, gera o `SHA256SUMS` e publica a GitHub Release com as notas do
changelog. A versão da tag precisa ser igual à do `package.json` e à do
`npm/package.json`.

Depois da release, o pacote npm é publicado desta máquina a partir da pasta
`npm/`, com a conta `contatopromovaweb`. O invólucro baixa o binário da release
da mesma versão.

O passo a passo está em [RELEASING.md](RELEASING.md) e em
[docs/release.md](docs/release.md).

## Licença

Ao enviar uma contribuição, você concorda que ela entra sob a mesma licença
do projeto, a [GNU AGPL 3.0](LICENSE).
