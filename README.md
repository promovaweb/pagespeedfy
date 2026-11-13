<p align="center">
  <a href="https://github.com/promovaweb/pagespeedfy">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/promovaweb/pagespeedfy/main/brand/logo/logo-dark.png">
      <img alt="Pagespeedfy" src="https://raw.githubusercontent.com/promovaweb/pagespeedfy/main/brand/logo/logo-light.png" width="360">
    </picture>
  </a>
</p>

<h1 align="center">Pagespeedfy</h1>

<p align="center">
  Meça uma página no PageSpeed Insights e corrija o site Astro a partir do relatório.
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
  <a href="https://promovaweb.com/docs/pagespeedfy/">Documentação</a> ·
  <a href="https://promovaweb.com/discord">Discord</a> ·
  <a href="https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=pagespeedfy">Planos da Promovaweb</a> ·
  <a href="https://github.com/promovaweb/pagespeedfy/blob/main/CHANGELOG.md">Changelog</a>
</p>

## O que é

O Pagespeedfy mede uma página publicada no
[PageSpeed Insights](https://pagespeed.web.dev/) e transforma o resultado em
correções no código de um site Astro. Ele tem duas partes:

| Parte | Como usar | Para quê |
| --- | --- | --- |
| **CLI `pagespeedfy`** | `pagespeedfy run <url>` | consultar a API PageSpeed Insights v5, guardar a API key e salvar cada medição em JSON bruto, `report.json` e `report.md` |
| **Skill `pagespeedfy-otimizar-pagina`** | prompt para o agente | ler os relatórios da rota, montar um plano de correções e aplicar as mudanças aprovadas no projeto Astro |

A skill localiza a rota e os componentes no projeto, mostra o plano e só altera
o código depois da sua autorização. Ao fim, roda o build e compara a medição de
antes com a de depois.

O trabalho acontece **uma página por vez**. Cada `run` aceita uma única URL. A
skill recusa seguir com várias páginas na mesma execução.

## Instalação

Requisitos:

- Node.js 22.12 ou superior.
- Uma API key do Google Cloud com a **PageSpeed Insights API** ativada.
- Página publicada em URL pública. O PageSpeed Insights roda nos servidores do
  Google e não alcança `localhost`.

Instale o CLI pelo npm e a skill na raiz do projeto Astro:

```bash
npm install -g @promovaweb/pagespeedfy
npx skills add https://github.com/promovaweb/pagespeedfy
```

O `npx skills` lê a pasta `skills/` do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy), instala a
skill `pagespeedfy-otimizar-pagina` nos agentes escolhidos e registra a origem
no `skills-lock.json` do projeto.

Para rodar sem instalar:

```bash
npx @promovaweb/pagespeedfy --version
```

Confira a instalação:

```bash
pagespeedfy --version
npx skills list
```

Para atualizar o CLI:

```bash
npm install -g @promovaweb/pagespeedfy@latest
```

Para atualizar a skill, rode o mesmo `npx skills add` na raiz do projeto.

## Primeiros passos

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou
   escolha um projeto.
2. Em **APIs e serviços → Biblioteca**, ative a **PageSpeed Insights API**.
3. Em **APIs e serviços → Credenciais**, crie uma **chave de API** e restrinja
   a chave à PageSpeed Insights API.
4. Grave a chave no Pagespeedfy:

   ```bash
   pagespeedfy auth login
   ```

O comando pergunta a chave sem mostrar os caracteres e grava
`~/.pagespeedfy/credentials` com permissão `0600`. Para validar a chave com uma
consulta real antes de gravar, use `pagespeedfy auth login --validar`. Em
automação, envie a chave pelo stdin:

```bash
op read "op://Promovaweb/PageSpeed/credential" | pagespeedfy auth login --stdin
```

## Uso

### Medir uma página

```bash
pagespeedfy run https://promovaweb.com/
```

O CLI consulta mobile e desktop nas quatro categorias. Cada consulta leva de 20
a 90 segundos. A saída traz as notas, as auditorias pendentes e os caminhos do
relatório:

```text
mobile: performance 71 · accessibility 96 · best-practices 100 · seo 100 · 6 auditorias pendentes
desktop: performance 94 · accessibility 96 · best-practices 100 · seo 100 · 3 auditorias pendentes
Relatório: pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.json
Resumo: pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.md
```

Durante o ajuste, meça só a estratégia e a categoria de interesse:

```bash
pagespeedfy run https://promovaweb.com/ -s mobile -c performance
```

### Ler um relatório salvo

```bash
pagespeedfy report pagespeedfy-reports/promovaweb.com/home/20261105-103012
```

O comando aceita a pasta da execução ou o arquivo `report.json`.

### Comparar antes e depois

```bash
pagespeedfy run https://promovaweb.com/
pagespeedfy compare \
  pagespeedfy-reports/promovaweb.com/home/20261105-103012 \
  pagespeedfy-reports/promovaweb.com/home/20261106-091544
```

A comparação mostra a diferença de notas e métricas e lista as auditorias
resolvidas, as novas e as que continuam.

### Saída para scripts

`--json` vem antes do comando e imprime a saída em JSON:

```bash
pagespeedfy --json auth status | jq -r .active
pagespeedfy run https://promovaweb.com/ --print path
```

`--print` aceita `summary`, `markdown` e `path`. Os códigos de saída são `0`
para sucesso, `1` para falha de operação e `2` para uso incorreto.

Adicione `pagespeedfy-reports/` ao `.gitignore` do projeto. Os relatórios trazem
URLs e trechos de HTML que não pertencem ao repositório.

## Uso com agentes

Com a skill instalada, peça ao agente no projeto Astro:

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

A skill confere o CLI e a chave, mede a página e lê todos os relatórios da rota:
o `report.json`, os JSON brutos e as medições anteriores. Com isso ela cria um
plano de correções em `plano.md`, com escopo, arquivo e efeito esperado de cada
auditoria, mostra o plano na tela e espera a autorização. Só então aplica as
linhas aprovadas, roda o build e entrega o relatório com o antes e o depois.

A skill nunca pede a API key no chat, nunca grava a chave em arquivo do projeto
e nunca altera o código sem autorização.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Manual publicado](https://promovaweb.com/docs/pagespeedfy/) | Guia do usuário em HTML |
| [Guia do usuário](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/README.md) | Visão geral, instalação, API key, primeira medição, skill, relatório e solução de problemas |
| [Referência do CLI](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/06-referencia-cli.md) | Todos os comandos, opções, saídas, efeitos, recusas e exemplos |
| [Ler o relatório](https://github.com/promovaweb/pagespeedfy/blob/main/docs/user/05-lendo-o-relatorio.md) | Estrutura da pasta de saída e de cada campo do `report.json` |
| [Ebook](https://github.com/promovaweb/pagespeedfy/blob/main/ebook/README.md) | Guia do usuário em PDF e EPUB |
| [Changelog](https://github.com/promovaweb/pagespeedfy/blob/main/CHANGELOG.md) | Histórico de versões |

A ajuda embutida também serve de referência:

```bash
pagespeedfy --help
pagespeedfy run --help
```

## Feito com

| Projeto | Para quê |
| --- | --- |
| [Node.js](https://github.com/nodejs/node) | runtime do CLI |
| [Commander](https://github.com/tj/commander.js) | definição dos comandos e opções |
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
