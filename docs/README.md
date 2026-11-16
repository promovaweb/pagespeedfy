# Documentação do Pagespeedfy

Esta pasta é a documentação embutida no binário. Ela sai por
`{{bin}} --skill`, pela tool MCP `skill` e pela resource `{{bin}}://skill`.
Cada arquivo responde a uma pergunta de quem usa o Pagespeedfy.

## Documentação técnica

| Arquivo | Responde |
| --- | --- |
| [CLI](cli.md) | como medir, guardar e comparar uma página, com cada command, option e exit code |
| [Configuração](configuration.md) | onde ficam settings, cofre, API key e o histórico `.pagespeedfy/` do projeto |
| [Exit codes](exit-codes.md) | o que cada código significa e como tratar no shell |
| [MCP](mcp.md) | como ligar o servidor, quais tools existem e o que cada uma devolve |
| [TUI](tui.md) | abas, teclas, tema e a tela de histórico |
| [Arquitetura](architecture.md) | camadas, fluxo de `run` e quem usa o quê nos três modos |
| [Manutenção](customize-template.md) | onde cada mudança entra no código |
| [Release](release.md) | versão, changelog, tag, build e GitHub Release |

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

## Skill do agente

As instruções que o agente lê para otimizar uma página ficam em
[`skills/pagespeedfy-otimizar-pagina/`](../skills/pagespeedfy-otimizar-pagina/SKILL.md),
com as referências `leitura-relatorio.md` e `astro-correcoes.md`.

## Ebook

O PDF e o EPUB ficam em [`ebook/`](../ebook/README.md) e são gerados a partir
do guia do usuário com `bun run ebook`.
