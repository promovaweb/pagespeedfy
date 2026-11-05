# Changelog

Todas as mudanças relevantes do Pagespeedfy são registradas neste arquivo. O
projeto segue versionamento semântico e usa commits convencionais para preparar
as próximas versões com o Release Please.

## [0.2.1](https://github.com/promovaweb/pagespeedfy/compare/v0.2.0...v0.2.1) (2026-11-05)

### Correções

- Opção ou argumento inválido, como `--timeout 0` ou `--strategy tablet`, passa a sair com código 2, como a referência documenta. Ajuda e versão saem com 0.
- Duas execuções da mesma página no mesmo segundo deixam de reaproveitar a pasta: a segunda recebe o sufixo `-2`.
- A skill só confere o `.gitignore` antes do plano; a inclusão de `pagespeedfy-reports/` entra no plano e espera a autorização como as demais mudanças.

### Documentação

- README do npm e guia do usuário com instalação rápida em três passos: CLI pelo npm, skill pelo `npx skills add https://github.com/promovaweb/pagespeedfy` e `pagespeedfy auth login`.
- Revisão geral: campos que podem ser `null` no `report.json`, cota diária ligada à chave, publicação manual em `RELEASING.md` e exemplos de versão atualizados. Ebook na edição 0.2.1.

## [0.2.0](https://github.com/promovaweb/pagespeedfy/compare/v0.1.1...v0.2.0) (2026-11-05)

### Funcionalidades

- Move a skill `pagespeedfy-otimizar-pagina` de `.codex/skills/` para `skills/`, o layout lido pelo `npx skills`. A instalação passa a ser `npx skills add https://github.com/promovaweb/pagespeedfy`.

### Documentação

- Atualiza README, guia do usuário e ebook (edição 0.2.0) com a instalação da skill pelo `npx skills add`.

## [0.1.1](https://github.com/promovaweb/pagespeedfy/compare/v0.1.0...v0.1.1) (2026-11-05)

### Build

- Primeira versão disponível no npm. A 0.1.0 ficou retida no staging de publicação do npm e não pode ser reutilizada; o conteúdo do pacote é o mesmo da 0.1.0.

## [0.1.0](https://github.com/promovaweb/pagespeedfy/releases/tag/v0.1.0) (2026-11-05)

### Funcionalidades

- Adiciona `pagespeedfy auth login`, `auth status` e `auth logout`, com a API key em `~/.pagespeedfy/credentials` (pasta `0700`, arquivo `0600`) e prioridade para `PAGESPEEDFY_API_KEY`.
- Adiciona `pagespeedfy run <url>`, que consulta a API PageSpeed Insights v5 para uma página em mobile e desktop e salva JSON bruto, `report.json` normalizado e `report.md` na pasta visível `pagespeedfy-reports/`.
- Adiciona `pagespeedfy report` e `pagespeedfy compare` para reler e comparar execuções.
- Adiciona a skill `pagespeedfy-otimizar-pagina`, que lê todos os relatórios da rota, grava e exibe um plano de correções em `plano.md` e só altera o projeto Astro depois da autorização da pessoa.

### Documentação

- Adiciona o guia do usuário em `docs/user/` (oito capítulos), a documentação de arquitetura e o ebook em PDF e EPUB gerado por `npm run ebook`.

### Build

- Publica no npm como `@promovaweb/pagespeedfy`. A versão 0.1.0 sai desta máquina; as próximas saem pelo Release Please e pelo workflow `Release`.
