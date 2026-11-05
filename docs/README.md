# Documentação do Pagespeedfy

A documentação tem dois percursos.

## Guia do usuário

Fonte do ebook, em [`docs/user/`](user/README.md), na ordem de
[`reading-order.txt`](user/reading-order.txt):

1. [Visão geral](user/00-visao-geral.md)
2. [Instalação](user/01-instalacao.md)
3. [API key e credencial](user/02-api-key-e-credencial.md)
4. [Primeira medição](user/03-primeira-medicao.md)
5. [Otimizar uma página com a skill](user/04-otimizando-com-a-skill.md)
6. [Ler o relatório](user/05-lendo-o-relatorio.md)
7. [Referência do CLI](user/06-referencia-cli.md)
8. [Solução de problemas](user/07-solucao-de-problemas.md)

## Documentação técnica

- [Arquitetura](arquitetura.md): módulos, fluxo de dados, escolhas de projeto
  e testes.
- [Skill](../.codex/skills/pagespeedfy-otimizar-pagina/SKILL.md): instruções
  lidas pelo agente, com as referências `leitura-relatorio.md` e
  `astro-correcoes.md`.

## Ebook

O PDF e o EPUB ficam em [`ebook/`](../ebook/README.md) e são gerados a partir
do guia do usuário com `npm run ebook`.
