# Contribuindo com o Pagespeedfy

Este guia é para quem desenvolve, revisa ou mantém o Pagespeedfy. Para instalar
e usar a ferramenta, leia o [README.md](README.md).

O Pagespeedfy é um pacote Node.js em TypeScript, com o
[Commander](https://github.com/tj/commander.js) como única dependência de
execução. Ele traz uma skill para agentes no formato lido pelo `npx skills`. O
site que a skill corrige é um projeto
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

- Node.js 22.12 ou superior.
- Git.

```bash
git clone https://github.com/promovaweb/pagespeedfy.git
cd pagespeedfy
npm ci
npm run dev -- --help          # executa o CLI pelo TypeScript
npm run dev -- run https://exemplo.com/
```

Os testes não usam rede: a API é simulada com fixtures em `tests/fixtures/`.
Para não usar a sua chave real em experimentos, aponte a pasta base para um
diretório temporário:

```bash
PAGESPEEDFY_HOME=/tmp/pagespeedfy-dev npm run dev -- auth status
```

Também é possível trocar a chave por uma variável de ambiente:

```bash
PAGESPEEDFY_API_KEY=AIza... npm run dev -- auth status
```

## Organização do código

```text
bin/                    entrada publicada no npm; chama executar() do build
src/                    código TypeScript
  cli.ts                comandos, opções, impressão e códigos de saída
  credenciais.ts        leitura, gravação atômica, remoção e resolução da API key
  api.ts                URL, chamada ao runPagespeed, repetição e tradução de erros
  relatorio.ts          tipos e normalização da resposta bruta em report.json
  markdown.ts           renderização do report.md
  comparar.ts           comparação de dois relatórios
  armazenamento.ts      validação de URL, nomes de pasta e arquivos
  errors.ts             CliError convertido em mensagem e exit code
  versao.ts             versão lida do package.json em tempo de execução
docs/                   guia do usuário e documentação técnica
docs/user/              fonte do ebook, em oito capítulos
skills/                 skill pagespeedfy-otimizar-pagina e referências
ebook/                  build.json e artefatos PDF e EPUB
.ebook/                 script, templates e CSS do ebook
brand/                  logo, paleta, tokens e fontes da marca
scripts/                validar-release e verificar-pacote
tests/                  vitest, com fixtures da API
dist/                   build do TypeScript, gerado por npm run build
```

A arquitetura completa, o fluxo de `run` e as escolhas de projeto estão em
[docs/arquitetura.md](docs/arquitetura.md).

## Fluxo de trabalho

1. Abra ou escolha uma issue que descreva o comportamento esperado.
2. Crie um branch curto a partir da `main`.
3. Faça a mudança em `src/` e acrescente o teste correspondente em `tests/`.
4. Se a mudança alterar a superfície do CLI, atualize
   `docs/user/06-referencia-cli.md`. O teste `tests/docs.test.ts` confere que
   cada subcomando tem seção e pelo menos cinco exemplos.
5. Ao publicar uma versão, sincronize `ebook/VERSION` com `package.json` e
   rode `npm run ebook`.
6. Rode `npm run validar` e, quando o ebook mudar, `npm run ebook:verify`.
7. Abra o pull request com a issue relacionada e a validação executada.

## Regras do código

- Código, comentários, documentação e mensagens de saída em português do
  Brasil. Termos técnicos em inglês permanecem em inglês.
- Nomes de comandos, opções e campos entre crases nos textos.
- Documente o comportamento não óbvio em JSDoc curto. O projeto usa
  comentários de cabeçalho nos módulos e nas funções exportadas.
- Erros de operação usam `CliError`, com mensagem e código de saída. Erros de
  uso do Commander saem com código `2`. Ajuda e versão saem com `0`.
- A API key nunca aparece em argumento de comando, log ou mensagem. Use
  `mascararChave` em qualquer saída que mostre a chave.
- A saída de dados vai para o stdout. O progresso e os avisos vão para o
  stderr.
- `dist/`, `node_modules/` e `pagespeedfy-reports/` são gerados. Não edite
  `dist/` à mão: rode `npm run build`.
- Preserve o formato do `report.json`. Os testes de
  `tests/relatorio.test.ts` cobrem os campos e a compatibilidade.

## Validar

O comando completo é:

```bash
npm run validar
```

Ele executa, nesta ordem:

1. `npm run typecheck`: `tsc` sobre `src/` e sobre os testes.
2. `npm test`: `vitest run`, sem rede.
3. `npm run build`: `tsc` de build para `dist/`.

Comandos auxiliares:

```bash
npm run test:watch                      # testes em modo watch
npx vitest run tests/cli.test.ts        # um arquivo de teste
npm run ebook                           # gera PDF e EPUB do guia
npm run ebook:verify                    # confere o ebook sem gerar
npm run release:check -- vX.Y.Z         # confere versão, tag e changelog
npm pack                                # gera o tarball do pacote
npm run package:verify -- <tgz>         # instala o tarball em isolamento
```

A CI em `.github/workflows/ci.yml` roda `npm ci`, `npm run validar` e
`npm run ebook:verify` a cada pull request e push na `main`.

## Documentação

| Onde | O que fica |
| --- | --- |
| `README.md` | instalação e uso, publicado também na página do npm |
| `docs/user/` | guia do usuário, fonte do ebook |
| `docs/user/06-referencia-cli.md` | referência completa de cada comando |
| `docs/arquitetura.md` | módulos, fluxo de dados e testes |
| `skills/pagespeedfy-otimizar-pagina/` | instruções lidas pelo agente e referências |
| `RELEASING.md` | publicação de versões |
| `brand/README.md` | logo, paleta e regras de uso da marca |

O manual é publicado em
<https://promovaweb.com/docs/pagespeedfy/>. Quando `docs/user/` mudar, avance
`ebook/VERSION`, rode `npm run ebook` e faça o commit dos artefatos junto com a
documentação.

O gerador Node.js em `.ebook/build-ebook.mjs` usa diretamente
`brand/logo/logo-light.png` e `brand/tokens.json`. O PDF e a capa do EPUB
compartilham o template `.ebook/template.html`; os estilos ficam em
`.ebook/pdf.css` e `.ebook/epub.css`. A versão em `ebook/VERSION` deve ser
igual à de `package.json`.

Para gerar, instale Pandoc, xmllint, poppler-utils e unzip, rode `npm ci` e
`npx playwright install chromium`. O PDF é renderizado pelo Chromium via
Playwright em Node.js. O sumário permanece navegável, sem números de página.
A conferência `npm run ebook:verify` valida hashes das fontes e artefatos,
aliases, XML, links internos, seções e fontes incorporadas, sem abrir o navegador.

## Commits e pull requests

Os commits seguem Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
`build:`). Os prefixos orientam a seção da próxima versão no `CHANGELOG.md`.

Um pull request deve trazer:

- descrição do problema e do comportamento novo;
- a issue relacionada;
- os comandos de validação executados;
- captura de tela ou trecho de saída quando a mudança for visível no terminal.

Não inclua a API key, URLs privadas nem conteúdo de `pagespeedfy-reports/` no
pull request.

## Releases

A versão vem do `package.json` e o histórico fica no `CHANGELOG.md`. A
publicação é manual e sai desta máquina: bump, validação, tag, GitHub Release
com o tarball, o PDF, o EPUB e o `SHA256SUMS.txt`, e `npm publish` local do
mesmo tarball. Nenhum workflow publica no npm.

O passo a passo está em [RELEASING.md](RELEASING.md).

## Licença

Ao enviar uma contribuição, você concorda que ela entra sob a mesma licença
do projeto, a [GNU AGPL 3.0](LICENSE).
