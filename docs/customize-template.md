# Manutenção do projeto

O Pagespeedfy nasceu do Termfy Starter Kit, um binário Bun com TUI, CLI e
servidor MCP no mesmo executável. O código segue a divisão descrita em
[Arquitetura](architecture.md); este arquivo diz onde cada mudança entra.

| Quer | Onde |
| --- | --- |
| novo command | um arquivo em `src/cli/commands/`, registrado em `src/cli/commands.ts` |
| nova aba | uma screen em `src/tui/screens/`, registrada em `src/tui/screens/index.ts` |
| nova tool MCP | um registro em `src/mcp/tools/`, chamado em `src/mcp/server.ts` |
| nova key de configuração | `SETTINGS_SCHEMA` em `src/config/settings.ts` |
| novo exit code | `src/app/exit-codes.ts` e `src/app/errors.ts` |
| novo campo no histórico | uma migration nova em `src/db/migrations/` |
| regra de medição | `src/pagespeed/`, longe do CLI e da TUI |
| credits e links | `src/app/manifest.ts` e bloco `termfy` do `package.json` |
| cores da TUI | `src/tui/theme.ts` |

Toda option, argument, tool, resource e key nasce documentada: `description`
no registry, linha em `docs/` e, quando for conceito novo, um parágrafo.
O fechamento roda `bun run validate`. O fluxo de publicação está em
[Release](release.md).

As skills do framework [`promovaweb/termfy`](https://github.com/promovaweb/termfy)
ficam em `.agents/skills/` e são mantidas por `termfy-init`. As instruções
de desenvolvimento deste repositório estão no `AGENTS.md`.
