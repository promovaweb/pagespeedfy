<p align="center">
  <a href="https://promovaweb.com/pagespeedfy/">
    <picture>
      <source type="image/svg+xml" srcset="https://raw.githubusercontent.com/promovaweb/pagespeedfy/main/brand/logo/icon.svg">
      <img alt="PageSpeedfy" src="https://raw.githubusercontent.com/promovaweb/pagespeedfy/main/brand/logo/icon.png" width="112" height="112">
    </picture>
  </a>
</p>

<h1 align="center">Pagespeedfy</h1>

<p align="center">
  Meça uma página no PageSpeed Insights e acompanhe a melhoria no histórico do projeto.
</p>

<p align="center">Um projeto da <a href="https://promovaweb.com">Promovaweb</a></p>

<p align="center">
  <a href="https://github.com/promovaweb/pagespeedfy/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/promovaweb/pagespeedfy"></a>
  <a href="https://www.npmjs.com/package/@promovaweb/pagespeedfy"><img alt="npm" src="https://img.shields.io/npm/v/@promovaweb/pagespeedfy"></a>
  <a href="https://github.com/promovaweb/pagespeedfy/blob/main/LICENSE"><img alt="Licença" src="https://img.shields.io/github/license/promovaweb/pagespeedfy"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/discord"><img alt="Discord: obter ajuda e conversar com a Comunidade" src="https://img.shields.io/badge/Discord-Obter%20ajuda%20e%20conversar%20com%20a%20Comunidade-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/pagespeedfy/">Site do PageSpeedfy</a> ·
  <a href="https://promovaweb.com/docs/pagespeedfy/">Documentação</a> ·
  <a href="https://promovaweb.com/harness/">Harness</a> ·
  <a href="https://promovaweb.com/ferramentas/">Ferramentas</a> ·
  <a href="https://promovaweb.com/discord">Discord</a> ·
  <a href="https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=pagespeedfy">Planos da Promovaweb</a> ·
  <a href="https://github.com/promovaweb/pagespeedfy/blob/main/CHANGELOG.md">Changelog</a>
</p>

## O que é

O Pagespeedfy mede uma página publicada no
[PageSpeed Insights](https://pagespeed.web.dev/) e guarda cada medição no
histórico do seu projeto. O mesmo binário abre três modos:

| Modo | Como abrir | Para quê |
| --- | --- | --- |
| **TUI** | `pagespeedfy` | navegar pelo histórico do projeto no terminal |
| **CLI** | `pagespeedfy run <url>` | medir, ler, comparar e usar em CI |
| **Servidor MCP** | `pagespeedfy mcp` | entregar as medições para um agente de programação |

O histórico é um banco SQLite em `<projeto>/.pagespeedfy/history.db`. Ele fica
na pasta do site e pode ser versionado para o time acompanhar a evolução de
cada página ao longo dos deploys. As respostas brutas da API ficam em
`.pagespeedfy/reports/`, fora do Git.

Cada execução mede **uma página**, em mobile e desktop, nas quatro categorias
do Lighthouse. Com `--samples` você repete a leitura e grava a mediana, o que
reduz a variação natural do PageSpeed.

A skill `pagespeedfy-otimizar-pagina` lê o histórico, monta um plano de
correções e só altera o projeto Astro depois da sua autorização.

## Instalação

Requisitos:

- Uma API key do Google Cloud com a **PageSpeed Insights API** ativada.
- Página publicada em URL pública. O PageSpeed Insights roda nos servidores do
  Google e não alcança `localhost`.

Instale pelo npm:

```bash
npm install -g @promovaweb/pagespeedfy
```

O npm só é necessário para instalar, com Node.js 18.17 ou superior. O pacote é
um invólucro que baixa o binário da GitHub Release da mesma versão no primeiro
uso, confere o SHA-256 e guarda em `~/.pagespeedfy/bin/v<versão>/`. O binário
roda sozinho, sem Node.js.

Também dá para baixar o binário direto da
[página de releases](https://github.com/promovaweb/pagespeedfy/releases). Os
alvos publicados são `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64` e
`windows-x64`.

Confira a instalação:

```bash
pagespeedfy --version
```

Para atualizar:

```bash
npm install -g @promovaweb/pagespeedfy@latest
```

Quem baixou o binário troca o arquivo pela versão nova da release.

### Instalar a skill no projeto Astro

Na raiz do projeto:

```bash
npx skills add promovaweb/pagespeedfy
```

O comando lê a pasta `skills/` do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy), instala a
skill `pagespeedfy-otimizar-pagina` nos agentes escolhidos e registra a origem
no `skills-lock.json` do projeto.

## Primeiros passos

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou
   escolha um projeto.
2. Em **APIs e serviços → Biblioteca**, ative a **PageSpeed Insights API**.
3. Em **APIs e serviços → Credenciais**, crie uma **chave de API** e restrinja
   a chave à PageSpeed Insights API.
4. Grave a chave no cofre do Pagespeedfy:

   ```bash
   pagespeedfy credentials set pagespeed.api_key
   ```

   O comando pergunta a chave sem ecoar os caracteres. Em automação, envie pelo
   stdin:

   ```bash
   op read "op://Promovaweb/PageSpeed/credential" | pagespeedfy credentials set pagespeed.api_key --stdin
   ```

   A chave fica cifrada com AES-256-GCM em `~/.pagespeedfy/credentials.json`.
   A chave mestra mora em `~/.pagespeedfy/master.key`, com permissão `0600`, ou
   na variável `PAGESPEEDFY_MASTER_KEY`. A variável `PAGESPEEDFY_API_KEY` tem
   prioridade sobre o cofre. Para ver o estado, rode
   `pagespeedfy credentials status`.

5. Na raiz do site, faça a primeira medição e marque a linha de base:

   ```bash
   pagespeedfy run https://promovaweb.com/ --note "baseline"
   ```

O comando cria `.pagespeedfy/` na raiz do projeto, grava a medição e imprime a
nota de cada estratégia.

## Uso

### Medir uma página

```bash
pagespeedfy run https://promovaweb.com/
```

O comando consulta mobile e desktop em paralelo. A saída traz as notas, as
métricas de laboratório, a quantidade de auditorias reprovadas e o caminho do
histórico:

```text
mobile  #12  perf 71 · a11y 96 · bp 100 · seo 100  LCP 3.4 s · TBT 380 ms · CLS 0.020 · 6 failed audits
desktop #13  perf 94 · a11y 96 · bp 100 · seo 100  LCP 1.1 s · TBT 40 ms · CLS 0.010 · 3 failed audits
History: /home/você/site/.pagespeedfy/history.db
Details: pagespeedfy report 12 · Timeline: pagespeedfy history https://promovaweb.com/
```

Cada consulta leva de 20 a 90 segundos por estratégia. Para medir só uma
estratégia ou uma categoria durante o ajuste, use `--strategy` e `--category`:

```bash
pagespeedfy run https://promovaweb.com/ --strategy mobile --category performance
```

As notas de laboratório variam entre execuções. Para conclusões, repita a
leitura com `--samples` e grave a mediana:

```bash
pagespeedfy run https://promovaweb.com/ --samples 3 --note "capa em AVIF"
```

`--samples` aceita de 1 a 9 leituras por estratégia. O histórico guarda a
medição com a mediana pela nota de performance.

### Ver o histórico

Sem URL, o comando lista as páginas do projeto com a última nota de mobile e
desktop:

```bash
pagespeedfy history
```

Com URL, mostra a linha do tempo da página, da mais antiga para a mais nova,
com as notas, LCP, TBT, CLS, as auditorias pendentes e a nota de cada medição:

```bash
pagespeedfy history https://promovaweb.com/
```

`--strategy` filtra a estratégia. `--limit` define quantas medições aparecem.

### Ler uma medição

`report` aceita o id da medição ou a URL (a última medição, em mobile por
padrão):

```bash
pagespeedfy report https://promovaweb.com/
pagespeedfy report 12 --strategy desktop
```

A saída traz as notas, as métricas de laboratório, os dados de campo do CrUX e
cada auditoria pendente, ordenada por impacto, com seletor, URL e economia
estimada.

### Comparar antes e depois

Com uma URL, o comando compara as duas últimas medições da página:

```bash
pagespeedfy compare https://promovaweb.com/
```

Com dois ids, compara na ordem informada:

```bash
pagespeedfy compare 12 13
```

A comparação mostra a diferença de notas e de métricas, as auditorias
resolvidas, as novas e as que continuam. `--fail-on-regression` faz o comando
sair com código `10` quando uma nota caiu ou quando surgiu auditoria nova.

### Usar no CI

`--fail-under` define a nota mínima por categoria e sai com código `10` quando
alguma fica abaixo:

```bash
pagespeedfy run https://promovaweb.com/ --fail-under performance=90,seo=95
```

Um número sozinho vale para todas as categorias:

```bash
pagespeedfy run https://promovaweb.com/ --fail-under 90
```

O código `10` também vale para a regressão detectada por
`pagespeedfy compare --fail-on-regression`. Assim o passo do CI falha sem
script extra.

### Abrir a TUI

Sem argumentos, num terminal interativo, o Pagespeedfy abre a interface:

```bash
pagespeedfy
```

As abas são **History** (padrão), Overview e About. History lista as páginas
medidas no projeto do diretório atual. Enter abre a linha do tempo, com a
sparkline da performance e a diferença entre a primeira e a última medição.
Enter numa medição abre o detalhe com notas, métricas, auditorias pendentes e a
comparação com a anterior.

| Tecla | Ação |
| --- | --- |
| `f` | alterna o filtro mobile, desktop ou todas |
| `Enter` | abre a linha do tempo ou o detalhe de uma medição |
| `Esc` | volta um nível |
| `r` | recarrega o histórico |
| `?` | mostra a ajuda |
| `q` | sai |

A TUI só lê o histórico. Sem histórico no projeto, ela mostra o caminho e o
comando para medir a primeira página.

### Saída para scripts

`--json` vem antes do comando e devolve o envelope `{ ok, command, data }` ou
`{ ok, command, error }`:

```bash
pagespeedfy --json history | jq -r .ok
pagespeedfy --json report 12 | jq '.data.run.scores'
```

Os dados vão para o stdout e o progresso para o stderr. Os códigos de saída
são:

| Código | Significado |
| --- | --- |
| `0` | sucesso |
| `1` | falha genérica |
| `2` | uso incorreto |
| `3` | configuração |
| `4` | credencial |
| `5` | rede ou API |
| `6` | não encontrado |
| `7` | permissão |
| `8` | sem terminal interativo |
| `9` | servidor MCP |
| `10` | nota abaixo do `--fail-under` ou regressão |
| `130` | interrompido |

### O que fica em `.pagespeedfy/`

O binário cria a pasta na raiz do projeto:

```text
.pagespeedfy/
├── .gitignore
├── history.db
└── reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/<estratégia>-<n>.raw.json
```

| Caminho | Conteúdo | Versionar |
| --- | --- | --- |
| `history.db` | páginas, medições e auditorias em SQLite | sim, para o time compartilhar o histórico |
| `reports/` | resposta completa da API para cada leitura | não, fica fora do Git |
| `.gitignore` | ignora `reports/` e os arquivos temporários do SQLite (`*.db-wal`, `*.db-shm`, `*.bak`) | sim |

O `.gitignore` já vem escrito pelo binário. Não é preciso editar o `.gitignore`
do projeto.

A raiz usada é a pasta com `.pagespeedfy/` mais próxima, ou a mais próxima com
`.git` ou `package.json`. Na prática, rode o comando na raiz do site. Para
apontar outra pasta, use `--project <pasta>` ou a variável
`PAGESPEEDFY_PROJECT`.

## Uso com agentes

O servidor MCP entrega as mesmas medições do CLI para o agente, sem passar pelo
shell. As tools do domínio são `pagespeed_run`, `pagespeed_history`,
`pagespeed_report` e `pagespeed_compare`. O prompt `optimize_page` conduz o
agente por medir, corrigir e comparar uma página.

No Claude Code:

```bash
claude mcp add pagespeedfy -- pagespeedfy mcp
```

No Codex:

```bash
codex mcp add pagespeedfy -- pagespeedfy mcp
```

O cliente escolhe a pasta onde o servidor roda. Passe `project` com o caminho
absoluto do site nas tools para o histórico cair no lugar certo.

Com a skill instalada, peça ao agente no projeto Astro:

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

A skill confere o binário e a chave, mede a página, lê a medição com
`pagespeedfy report <url> --json`, segue cada auditoria até o arquivo de origem
e monta um plano. Só depois da sua autorização ela altera o código, roda o
build e confirma com:

```bash
pagespeedfy run https://promovaweb.com/blog/ --samples 3 --note "correções do plano"
pagespeedfy compare https://promovaweb.com/blog/
```

A skill nunca pede a API key no chat, nunca grava a chave em arquivo do projeto
e nunca altera o código sem autorização. O trabalho é **uma página por vez**.
Componentes compartilhados podem mudar outras páginas. O relatório final
lista quais.

## Atualizar da 0.3.x

A 0.3.5 era um CLI em Node.js com a pasta `pagespeedfy-reports/`. A 1.0 é um
binário com histórico no projeto.

- A chave gravada em `~/.pagespeedfy/credentials` migra sozinha para o cofre
  cifrado no primeiro uso. O arquivo antigo é apagado.
- Os comandos `auth login`, `auth status` e `auth logout` saíram. Use
  `credentials set pagespeed.api_key`, `credentials status` e
  `credentials remove pagespeed.api_key`.
- A pasta `pagespeedfy-reports/` e os arquivos `report.json` e `report.md`
  saíram. As respostas brutas ficam em `.pagespeedfy/reports/` e o histórico
  em `.pagespeedfy/history.db`.
- Para trazer as medições antigas para o histórico, rode na raiz do site:

  ```bash
  pagespeedfy import pagespeedfy-reports
  ```

  O comando procura os `report.json` de forma recursiva. Rodar duas vezes não
  duplica nada.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Manual publicado](https://promovaweb.com/docs/pagespeedfy/) | Guia do usuário em HTML |
| [Guia do usuário](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/README.md) | Instalação, API key, primeira medição, skill e solução de problemas |
| [Referência do CLI](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/08-referencia-cli.md) | Comandos, opções, saídas e exemplos |
| [Histórico e comparação](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/06-historico-e-comparacao.md) | Páginas, linha do tempo e diferença entre medições |
| [TUI e MCP](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/07-tui-e-mcp.md) | Abas, teclas e configuração do servidor nos agentes |
| [Ebook](https://github.com/promovaweb/pagespeedfy/blob/main/ebook/README.md) | Guia do usuário em PDF e EPUB |
| [Changelog](https://github.com/promovaweb/pagespeedfy/blob/main/CHANGELOG.md) | Histórico de versões |

A documentação também vai embutida no binário:

```bash
pagespeedfy --help
pagespeedfy run --help
pagespeedfy --skill
```

## Feito com

| Projeto | Para quê |
| --- | --- |
| [Bun](https://github.com/oven-sh/bun) | runtime e compilação do binário |
| [Termfy](https://github.com/promovaweb/termfy) | starter kit com TUI, CLI e MCP no mesmo executável |
| [OpenTUI](https://github.com/sst/opentui) | interface do terminal |
| [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) | servidor MCP |
| [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) | medição das páginas |
| [Astro](https://github.com/withastro/astro) | sites que a skill corrige |

## Comunidade e suporte

- **Discord:** [obter ajuda e conversar com a Comunidade](https://promovaweb.com/discord).
- **Bugs e pedidos:** abra uma [issue](https://github.com/promovaweb/pagespeedfy/issues)
  com a versão, o sistema operacional e o passo a passo para reproduzir.
- **Novidades:** acompanhe o [CHANGELOG](https://github.com/promovaweb/pagespeedfy/blob/main/CHANGELOG.md)
  e as [releases](https://github.com/promovaweb/pagespeedfy/releases).

## Contribuir

Este README cobre o uso. Para ambiente de desenvolvimento, organização do
código, validação e releases, leia o
[CONTRIBUTING.md](https://github.com/promovaweb/pagespeedfy/blob/main/CONTRIBUTING.md).

## Promovaweb

O Pagespeedfy é mantido pela [Promovaweb](https://promovaweb.com), comunidade de
co-working digital onde profissionais aprendem a construir, automatizar e
gerir negócios de tecnologia e IA com aulas ao vivo, Co-works e revisão de
projetos reais.

Quer usar o Pagespeedfy em projetos de verdade, com acompanhamento? Conheça os
[planos da Promovaweb](https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=pagespeedfy).

## Licença

Distribuído sob a
[GNU AGPL 3.0](https://github.com/promovaweb/pagespeedfy/blob/main/LICENSE).
A licença não concede o uso do nome e do logo do Pagespeedfy nem da marca
Promovaweb (AGPL 3.0, seção 7, item e).
