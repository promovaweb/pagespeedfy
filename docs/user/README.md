# Pagespeedfy: guia do usuário

O Pagespeedfy mede uma página no PageSpeed Insights e transforma o resultado
em correções no código de um site Astro. Você informa a URL. O binário consulta
a API do Google e grava a medição no histórico do projeto. A skill lê o
histórico, encontra os arquivos responsáveis e aplica as mudanças.

O mesmo executável tem três modos: o CLI mede e consulta, a TUI lê o histórico
no terminal e o servidor MCP entrega as mesmas operações ao agente.

Este guia acompanha o percurso inteiro, da criação da API key à comparação
entre a medição de antes e a de depois.

## Instalação rápida

```bash
npm install -g @promovaweb/pagespeedfy
npx skills add https://github.com/promovaweb/pagespeedfy
pagespeedfy credentials set pagespeed.api_key
```

O primeiro comando instala o binário pelo npm. O segundo, rodado na raiz do
projeto Astro, instala a skill a partir do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy). O terceiro
grava a API key no cofre cifrado. Os detalhes estão em
[Instalação](01-instalacao.md).

Para abrir a interface do terminal, rode `pagespeedfy` sem argumentos. Para
medir direto:

```bash
pagespeedfy run https://promovaweb.com/ --note "baseline"
```

## Comece aqui

1. [Entenda como as peças se encaixam](00-visao-geral.md).
2. [Instale o binário e a skill](01-instalacao.md).
3. [Crie e grave a API key](02-api-key-e-credencial.md).
4. [Faça a primeira medição](03-primeira-medicao.md).
5. [Peça ao agente para otimizar a página](04-otimizando-com-a-skill.md).

## Consulte pela tarefa

- **Entender um campo do relatório:**
  [Ler o relatório](05-lendo-o-relatorio.md).
- **Ver a linha do tempo e comparar medições:**
  [Histórico e comparação](06-historico-e-comparacao.md).
- **Usar a TUI ou configurar o agente por MCP:**
  [TUI e MCP](07-tui-e-mcp.md).
- **Conferir um command ou uma opção:**
  [Referência do CLI](08-referencia-cli.md).
- **Resolver um erro:** [Solução de problemas](09-solucao-de-problemas.md).

## Links

- Repositório: <https://github.com/promovaweb/pagespeedfy>
- Termfy: <https://github.com/promovaweb/termfy>
- Documentação no site: <https://promovaweb.com/docs/pagespeedfy/>
- Discord: <https://promovaweb.com/discord>
- Planos: <https://promovaweb.com/planos>
- Licença AGPL 3.0.
