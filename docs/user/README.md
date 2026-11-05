# Pagespeedfy: guia do usuário

O Pagespeedfy mede uma página no PageSpeed Insights e transforma o resultado
em correções no código de um site Astro. Você informa a URL. O CLI consulta a
API do Google e guarda um relatório completo. A skill lê esse relatório,
encontra os arquivos responsáveis e aplica as mudanças.

Este guia acompanha o percurso inteiro, da criação da API key à comparação
entre a medição de antes e a de depois.

## Instalação rápida

```bash
npm install -g @promovaweb/pagespeedfy
npx skills add https://github.com/promovaweb/pagespeedfy
pagespeedfy auth login
```

O primeiro comando instala o CLI. O segundo, rodado na raiz do projeto Astro,
instala a skill a partir do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy). O terceiro
grava a API key. Os detalhes estão em [Instalação](01-instalacao.md).

## Comece aqui

1. [Entenda como as peças se encaixam](00-visao-geral.md).
2. [Instale o CLI pelo npm e a skill pelo `npx skills add`](01-instalacao.md).
3. [Crie e grave a API key](02-api-key-e-credencial.md).
4. [Faça a primeira medição](03-primeira-medicao.md).
5. [Peça ao agente para otimizar a página](04-otimizando-com-a-skill.md).

## Consulte pela tarefa

- **Entender um campo do relatório:** [Ler o relatório](05-lendo-o-relatorio.md).
- **Conferir uma opção do terminal:** [Referência do CLI](06-referencia-cli.md).
- **Resolver um erro:** [Solução de problemas](07-solucao-de-problemas.md).
