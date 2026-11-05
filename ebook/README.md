# Ebook do Pagespeedfy

O PDF e o EPUB são gerados a partir de `docs/user/`, na ordem declarada em
`docs/user/reading-order.txt`.

## Arquivos vigentes

- `ebook-pagespeedfy.pdf`
- `ebook-pagespeedfy.epub`

Os arquivos com `v<versão>` preservam a edição ligada à release. `build.json`
registra as fontes e os hashes dos artefatos.
`ebook/VERSION` guarda a versão do ebook, independente da versão do pacote.

## Gerar e conferir

```bash
npm run ebook
npm run ebook:verify
```

O ambiente de geração requer Pandoc, WeasyPrint, ImageMagick, `xmllint`,
`pdftotext`, `pdftohtml`, `pdffonts` e `unzip`. Inter e Manrope vêm das
dependências fixadas no pacote e são incorporadas aos artefatos.

`npm run ebook:verify` confere versão, hashes, XML do EPUB, links internos,
fontes incorporadas e a presença de cada capítulo no PDF. Rode
`npm run ebook` sempre que um arquivo de `docs/user/` mudar.
