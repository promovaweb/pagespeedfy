# Pagespeedfy

O Pagespeedfy é o CLI e a skill da Promovaweb para medir uma página no
[PageSpeed Insights](https://pagespeed.web.dev/) e corrigir o site Astro a
partir do resultado.

Ele tem duas partes:

- **CLI `pagespeedfy`**: consulta a API PageSpeed Insights v5, guarda a API
  key em `~/.pagespeedfy/credentials` e salva cada medição como JSON bruto,
  `report.json` normalizado e `report.md`.
- **Skill `pagespeedfy-otimizar-pagina`**: um agente executa o CLI, lê todos
  os relatórios da página, localiza a rota e os componentes no projeto Astro,
  mostra um plano de correções e só altera o código depois da sua
  autorização. Ao fim, roda o build e compara a medição de antes com a de
  depois.

O trabalho acontece **uma página por vez**. Cada `run` aceita uma única URL, e
a skill recusa seguir com várias páginas na mesma execução.

## Instalação rápida

1. Instale o CLI:

   ```bash
   npm install -g @promovaweb/pagespeedfy
   ```

2. Na raiz do projeto Astro, instale a skill direto do repositório
   [promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy):

   ```bash
   npx skills add https://github.com/promovaweb/pagespeedfy
   ```

   O `npx skills` lê a pasta `skills/` do repositório e instala a skill
   `pagespeedfy-otimizar-pagina` nos agentes que você escolher, como Codex e
   Claude Code.

3. Grave a API key do PageSpeed Insights:

   ```bash
   pagespeedfy auth login
   ```

Depois, peça ao agente: `Use $pagespeedfy-otimizar-pagina para otimizar
https://seusite.com/`.

## Requisitos

- Node.js 22.12 ou superior.
- Uma API key do Google Cloud com a **PageSpeed Insights API** ativada. O CLI
  não consulta a API sem chave, porque a cota anônima é compartilhada e
  costuma acabar cedo.
- Página publicada em URL pública. O PageSpeed Insights roda nos servidores do
  Google e não alcança `localhost`.

## Instalação

O CLI vem do npm e a skill vem do GitHub:

```bash
npm install -g @promovaweb/pagespeedfy
npx skills add https://github.com/promovaweb/pagespeedfy
```

Depois, `pagespeedfy --version` deve imprimir a versão instalada e
`npx skills list` deve mostrar `pagespeedfy-otimizar-pagina`. A skill fica em
`skills/pagespeedfy-otimizar-pagina/` no repositório, no formato lido pelo
`npx skills`. Para atualizar a skill, rode o mesmo `npx skills add` de novo.

## Criar a API key

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou
   escolha um projeto.
2. Em **APIs e serviços → Biblioteca**, ative a **PageSpeed Insights API**.
3. Em **APIs e serviços → Credenciais**, crie uma **chave de API**. Restrinja
   a chave à PageSpeed Insights API.
4. Grave a chave no Pagespeedfy:

   ```bash
   pagespeedfy auth login
   ```

O comando pergunta a chave sem mostrar os caracteres e grava
`~/.pagespeedfy/credentials` com permissão `0600`.

## Uso rápido

```bash
pagespeedfy run https://promovaweb.com/
```

Saída:

```text
mobile: performance 71 · accessibility 96 · best-practices 100 · seo 100 · 6 auditorias pendentes
desktop: performance 94 · accessibility 96 · best-practices 100 · seo 100 · 3 auditorias pendentes
Relatório: pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.json
Resumo: pagespeedfy-reports/promovaweb.com/home/20261105-103012/report.md
```

Depois de publicar as correções:

```bash
pagespeedfy run https://promovaweb.com/
pagespeedfy compare \
  pagespeedfy-reports/promovaweb.com/home/20261105-103012 \
  pagespeedfy-reports/promovaweb.com/home/20261106-091544
```

Adicione `pagespeedfy-reports/` ao `.gitignore` do projeto.

## Uso com a skill

No projeto Astro, peça ao agente:

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

A skill confere o CLI e a chave, mede a página e lê todos os relatórios da
rota: o `report.json`, os JSON brutos e as medições anteriores. Com isso ela
cria um plano de correções em `plano.md`, com escopo, arquivo e efeito
esperado de cada auditoria, **mostra o plano na tela e espera você autorizar**.
Só então aplica as linhas autorizadas, roda o build e entrega um relatório
com o antes e o depois.

O fluxo completo está em
[`skills/pagespeedfy-otimizar-pagina/SKILL.md`](skills/pagespeedfy-otimizar-pagina/SKILL.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Guia do usuário](docs/user/README.md) | Visão geral, instalação, API key, primeira medição, skill, relatório, referência do CLI e solução de problemas |
| [Referência do CLI](docs/user/06-referencia-cli.md) | Todos os comandos, opções, saídas, efeitos, recusas e exemplos |
| [Ler o relatório](docs/user/05-lendo-o-relatorio.md) | Estrutura da pasta de saída e de cada campo do `report.json` |
| [Arquitetura](docs/arquitetura.md) | Módulos, fluxo de dados, escolhas de projeto e testes |
| [Ebook](ebook/README.md) | Guia do usuário em PDF e EPUB (`ebook/ebook-pagespeedfy.pdf`) |
| [CHANGELOG](CHANGELOG.md) | Histórico de versões |
| [RELEASING](RELEASING.md) | Versão, GitHub Release e publicação no npm |

## Desenvolvimento

```bash
npm ci
npm run dev -- run https://exemplo.com/   # executa pelo TypeScript
npm run validar                           # typecheck, testes e build
npm run ebook                             # gera PDF e EPUB do guia
npm run ebook:verify                      # confere o ebook sem gerar
```

Os testes não usam rede: a API é simulada com fixtures em `tests/fixtures/`.

## Variáveis de ambiente

| Variável | Efeito |
| --- | --- |
| `PAGESPEEDFY_API_KEY` | Usa esta chave no lugar do arquivo de credencial |
| `PAGESPEEDFY_HOME` | Troca a pasta base `~/.pagespeedfy` (testes e automações) |

## Licença

Uso interno da Promovaweb (`UNLICENSED`).
