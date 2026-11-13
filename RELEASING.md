# Publicação de versões

O Pagespeedfy é publicado desta máquina, do começo ao fim. O GitHub Actions
roda só a CI (`.github/workflows/ci.yml`), que valida o código e o ebook a
cada pull request e push na `main`. Nenhum workflow cria versão, release ou
pacote no npm.

A versão vem do `package.json` e o histórico fica no `CHANGELOG.md`. A
publicação no npm é sempre local, com a conta `contatopromovaweb`, como
manda a regra da Promovaweb para todos os pacotes.

## Passo a passo

Os exemplos usam `X.Y.Z` para a versão nova.

1. Confira que a `main` local está limpa e igual à remota:

   ```bash
   git status --short
   git fetch origin && git status -sb
   ```

2. Avance a versão no `package.json` e no `package-lock.json`:

   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```

3. Escreva a seção `## [X.Y.Z](https://github.com/promovaweb/pagespeedfy/compare/vA.B.C...vX.Y.Z) (AAAA-MM-DD)`
   no topo do `CHANGELOG.md`.
4. Quando `docs/user/` mudar, avance `ebook/VERSION` e rode `npm run ebook`
   para gerar o PDF e o EPUB novos.
5. Valide:

   ```bash
   npm run validar
   npm run ebook:verify
   npm run release:check -- vX.Y.Z
   ```

6. Empacote e instale o tarball em isolamento:

   ```bash
   mkdir -p release-assets
   npm pack --pack-destination release-assets
   npm run package:verify -- release-assets/promovaweb-pagespeedfy-X.Y.Z.tgz
   ```

7. Reúna o ebook e os checksums:

   ```bash
   cp ebook/ebook-pagespeedfy.pdf release-assets/Pagespeedfy-Guia-do-Usuario.pdf
   cp ebook/ebook-pagespeedfy.epub release-assets/Pagespeedfy-Guia-do-Usuario.epub
   (cd release-assets && sha256sum * > SHA256SUMS.txt)
   ```

8. Faça o commit, crie a tag e envie os dois juntos:

   ```bash
   git add -A
   git commit -m "chore: publica X.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push --atomic origin HEAD:main vX.Y.Z
   ```

9. Crie a GitHub Release com os anexos:

   ```bash
   gh release create vX.Y.Z -R promovaweb/pagespeedfy \
     --title "vX.Y.Z" --notes "<seção X.Y.Z do CHANGELOG>" \
     release-assets/*
   ```

10. Publique no npm o mesmo tarball anexado à release:

    ```bash
    npm whoami   # contatopromovaweb
    npm publish release-assets/promovaweb-pagespeedfy-X.Y.Z.tgz --access public
    ```

    A conta pode pedir confirmação no navegador. Quando isso acontecer, rode
    o comando num terminal interativo e conclua a confirmação.

A pasta `release-assets/` fica fora do Git (`.gitignore`).

## Conferência

```bash
gh release view vX.Y.Z -R promovaweb/pagespeedfy
npm view @promovaweb/pagespeedfy version license
```

O npm pode levar alguns minutos para mostrar a versão nova. A release só está
completa quando o npm mostra a mesma versão da tag.

Uma tag publicada não é movida nem reutilizada. Correções saem em versão nova.
A 0.1.0 ficou retida no staging de publicação do npm e não pode ser
reutilizada. Por isso a primeira versão no npm é a 0.1.1.
