# Publicação de versões

A versão do Pagespeedfy sai em três partes: a tag no Git, a GitHub Release com
os binários e o pacote npm. A tag dispara o workflow `release.yml`, que compila
os binários. A publicação no npm é local, depois da release, a partir da pasta
`npm/`, com a conta `contatopromovaweb`, como manda a regra da Promovaweb para
todos os pacotes.

A versão vem do `package.json` e o histórico fica no `CHANGELOG.md`. O arquivo
`npm/package.json` carrega a mesma versão, conferida pelo workflow e pelos
testes. O `package.json` da raiz é privado: só a pasta `npm/` vai para o npm.

## Passo a passo

Os exemplos usam `X.Y.Z` para a versão nova.

1. Confira que a `main` local está limpa e igual à remota:

   ```bash
   git status --short
   git fetch origin && git status -sb
   ```

2. Avance a versão em `package.json` e em `npm/package.json`. Os dois precisam
   ficar iguais. Depois confira:

   ```bash
   jq -r .version package.json npm/package.json
   ```

3. Escreva a seção `## [X.Y.Z](https://github.com/promovaweb/pagespeedfy/compare/vA.B.C...vX.Y.Z) (AAAA-MM-DD)`
   no topo do `CHANGELOG.md`. O workflow extrai as notas daqui.

4. Regenere o README do npm a partir do README da raiz:

   ```bash
   bun run npm:readme
   ```

5. Quando `docs/user/` mudar, copie a versão para `ebook/VERSION` e gere o PDF
   e o EPUB:

   ```bash
   bun run ebook
   ```

6. Valide:

   ```bash
   bun run validate
   bun run ebook:verify
   ```

   O `validate` roda `typecheck`, `bun test`, `skills:check`, `opencli:check`,
   `docs:check` e `build`. O teste `tests/npm-wrapper.test.ts` confere a versão
   do `npm/package.json` e o README gerado.

7. Faça o commit, crie a tag e envie os dois juntos:

   ```bash
   git add -A
   git commit -m "release: pagespeedfy vX.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push --atomic origin HEAD:main vX.Y.Z
   ```

8. Acompanhe o workflow `release.yml`:

   ```bash
   gh run watch
   ```

   Ele confere que a tag, o `package.json` e o `npm/package.json` têm a mesma
   versão, roda `bun run validate`, compila `linux-x64`, `linux-arm64`,
   `darwin-x64`, `darwin-arm64` e `windows-x64`, gera o `SHA256SUMS` e publica a
   GitHub Release com as notas do changelog.

9. Confira a release antes de publicar no npm:

   ```bash
   gh release view vX.Y.Z -R promovaweb/pagespeedfy
   ```

   A release precisa ter os cinco binários e o `SHA256SUMS`. O invólucro npm
   baixa o binário daqui no primeiro uso.

10. Publique o pacote npm a partir de `npm/`:

    ```bash
    npm whoami   # contatopromovaweb
    cd npm
    npm publish --access public
    ```

    A conta pode pedir confirmação no navegador. Quando isso acontecer, rode o
    comando num terminal interativo e conclua a confirmação.

## Conferência

```bash
gh release view vX.Y.Z -R promovaweb/pagespeedfy
npm view @promovaweb/pagespeedfy version license
npx @promovaweb/pagespeedfy@X.Y.Z --version
```

O npm pode levar alguns minutos para mostrar a versão nova. A publicação só
está completa quando o npm mostra a mesma versão da tag e o comando pelo `npx`
imprime `X.Y.Z`.

Um binário baixado direto da release não passa pelo npm. Para trocar a versão,
baixe o arquivo novo e substitua o antigo.

Uma tag publicada não é movida nem reutilizada. Correções saem em versão nova.
Uma release sem o binário da plataforma quebra o invólucro npm: confira os
anexos antes do `npm publish`.

O build local está em [docs/release.md](docs/release.md).
