# Publicação de versões

O Pagespeedfy é publicado pelo GitHub Actions, no mesmo modelo do ClickUpfy:
Release Please prepara a versão e o workflow `Release` publica a GitHub
Release e o pacote `@promovaweb/pagespeedfy` no npm.

## Como uma versão nasce

1. Commits na `main` seguem Conventional Commits (`feat:`, `fix:`, `docs:`).
2. A cada push, o job `release-please` abre ou atualiza a **Release PR**, que
   avança `package.json`, `package-lock.json`, `.release-please-manifest.json`
   e escreve a seção nova do `CHANGELOG.md`.
3. Revise a Release PR. Ajuste o texto do CHANGELOG no próprio branch da PR,
   quando for preciso, antes do merge.
4. O merge cria a tag `vX.Y.Z` e a GitHub Release. Na mesma execução, o job
   `publicar`:
   - roda `npm run validar`, `npm run ebook:verify` e `npm run release:check`;
   - empacota com `npm pack` e instala o tarball em isolamento
     (`npm run package:verify`);
   - anexa o tarball, o PDF, o EPUB e `SHA256SUMS.txt` à release;
   - publica no npm com `npm run publish:npm`, com `--provenance` porque o
     repositório é público.

A publicação no npm é idempotente: se a versão já existir no registry, o passo
é ignorado e o job pode ser reexecutado.

## Segredos do repositório

| Segredo | Uso |
| --- | --- |
| `NPM_TOKEN` | Token de automação do npm com permissão de publicação no escopo `@promovaweb` |
| `RELEASE_PLEASE_TOKEN` | Opcional. Token que dispara a CI nas Release PRs; sem ele, o `GITHUB_TOKEN` é usado |

Cadastre com:

```bash
gh secret set NPM_TOKEN -R promovaweb/pagespeedfy
```

## Ebook

O ebook tem versão própria em `ebook/VERSION`. Quando `docs/user/` mudar,
avance essa versão, rode `npm run ebook` e faça o commit dos artefatos junto
com a documentação. A CI e o job de publicação rodam `npm run ebook:verify`.

## Conferência

```bash
gh release view vX.Y.Z -R promovaweb/pagespeedfy
npm view @promovaweb/pagespeedfy version
```

Uma tag publicada não é movida nem reutilizada. Correções saem em versão nova.
