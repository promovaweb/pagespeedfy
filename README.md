# Pagespeedfy

O Pagespeedfy é o CLI e a skill da Promovaweb para medir uma página no
[PageSpeed Insights](https://pagespeed.web.dev/) e corrigir o site Astro a
partir do resultado.

Ele tem duas partes:

- **CLI `pagespeedfy`**: consulta a API PageSpeed Insights v5, guarda a API
  key em `~/.pagespeedfy/credentials` e salva cada medição como JSON bruto,
  `report.json` normalizado e `report.md`.
- **Skill `pagespeedfy-otimizar-pagina`**: um agente executa o CLI, lê o
  relatório inteiro, localiza a rota e os componentes no projeto Astro, aplica
  as correções, roda o build e compara a medição de antes com a de depois.

O trabalho acontece **uma página por vez**. Cada `run` aceita uma única URL, e
a skill recusa seguir com várias páginas na mesma execução.

## Requisitos

- Node.js 22.12 ou superior.
- Uma API key do Google Cloud com a **PageSpeed Insights API** ativada. Sem
  chave, a API usa uma cota anônima compartilhada que costuma acabar cedo.
- Página publicada em URL pública. O PageSpeed Insights roda nos servidores do
  Google e não alcança `localhost`.

## Instalação

```bash
npm install -g @promovaweb/pagespeedfy
```

Depois, `pagespeedfy --version` deve imprimir a versão instalada.

Para instalar a skill em um projeto Astro, copie
`$(npm root -g)/@promovaweb/pagespeedfy/.codex/skills/pagespeedfy-otimizar-pagina/` para a pasta de skills do agente
usado no projeto (`.codex/skills/`, `.claude/skills/` ou `.agents/skills/`).

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
Relatório: .pagespeedfy/reports/promovaweb.com/home/20261105-103012/report.json
Resumo: .pagespeedfy/reports/promovaweb.com/home/20261105-103012/report.md
```

Depois de publicar as correções:

```bash
pagespeedfy run https://promovaweb.com/
pagespeedfy compare \
  .pagespeedfy/reports/promovaweb.com/home/20261105-103012 \
  .pagespeedfy/reports/promovaweb.com/home/20261106-091544
```

Adicione `.pagespeedfy/` ao `.gitignore` do projeto.

## Uso com a skill

No projeto Astro, peça ao agente:

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

A skill confere o CLI e a chave, mede a página, lê o `report.json` completo e
classifica cada auditoria em quatro escopos: Página, Componente, Global e Fora
do código. Ela aplica as correções de Página e Componente, pede confirmação
para mudanças globais e descreve o que depende da hospedagem. Ao fim, roda o
build e entrega um relatório com o antes e o depois.

O fluxo completo está em
[`.codex/skills/pagespeedfy-otimizar-pagina/SKILL.md`](.codex/skills/pagespeedfy-otimizar-pagina/SKILL.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Guia do usuário](docs/user/README.md) | Visão geral, instalação, API key, primeira medição, skill, relatório, referência do CLI e solução de problemas |
| [Referência do CLI](docs/user/06-referencia-cli.md) | Todos os comandos, opções, saídas, efeitos, recusas e exemplos |
| [Ler o relatório](docs/user/05-lendo-o-relatorio.md) | Estrutura da pasta de saída e de cada campo do `report.json` |
| [Arquitetura](docs/arquitetura.md) | Módulos, fluxo de dados, escolhas de projeto e testes |
| [Ebook](ebook/README.md) | Guia do usuário em PDF e EPUB (`ebook/ebook-pagespeedfy.pdf`) |
| [CHANGELOG](CHANGELOG.md) | Histórico de versões |
| [RELEASING](RELEASING.md) | Como compilar e publicar uma versão desta máquina |

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
