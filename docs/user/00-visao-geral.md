# Visão geral

O PageSpeed Insights avalia uma página em quatro categorias: Performance,
Acessibilidade, Boas práticas e SEO. Ele roda o Lighthouse nos servidores do
Google, em um celular simulado e em um desktop simulado. Depois junta os dados
de usuários reais do Chrome UX Report quando a página tem tráfego suficiente.

O resultado chega como um JSON de vários megabytes. Ler esse JSON à mão para
descobrir qual componente atrasa o carregamento toma tempo. O Pagespeedfy
organiza esse trabalho em três modos no mesmo executável e numa skill.

| Modo | Como abre | Para que serve |
| --- | --- | --- |
| CLI | `pagespeedfy run <url>` | Medir uma página e gravar a medição no histórico |
| TUI | `pagespeedfy`, sem argumentos | Ler o histórico do projeto pelo terminal |
| MCP | `pagespeedfy mcp` | Entregar as medições a um agente por stdio |

## O CLI mede e grava no histórico

O comando `pagespeedfy run` consulta a API para uma URL, mede mobile e desktop
em paralelo e grava dois tipos de arquivo dentro do projeto:

- o JSON bruto de cada leitura, sem nenhuma alteração;
- a medição normalizada no histórico SQLite, com as notas, as métricas, os
  dados de campo, as auditorias reprovadas ordenadas por impacto e as
  verificações manuais.

```text
<projeto>/.pagespeedfy/
├── history.db
├── .gitignore
└── reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/
    ├── mobile-1.raw.json
    └── desktop-1.raw.json
```

A API key fica no cofre cifrado em `~/.pagespeedfy/`, fora de qualquer
projeto. O histórico fica no projeto do site, porque ele pertence à página que
está sendo otimizada.

## A TUI lê o histórico

`pagespeedfy` sem argumentos, num terminal interativo, abre a interface com as
abas History, Overview e About. A aba History lista as páginas medidas no
projeto do diretório atual. Enter abre a linha do tempo da página, Enter de
novo abre o detalhe de uma medição. A TUI só lê o histórico, não mede.

## O servidor MCP entrega o histórico ao agente

`pagespeedfy mcp` sobe um servidor Model Context Protocol via stdio. Um agente
configurado nele chama as tools `pagespeed_run`, `pagespeed_history`,
`pagespeed_report` e `pagespeed_compare` no lugar de digitar comandos. O
prompt `optimize_page` conduz o ciclo de medir, corrigir e comparar uma página.

## A skill planeja e corrige

A skill `pagespeedfy-otimizar-pagina` roda dentro de um agente de programação
aberto no projeto Astro. Ela executa o CLI, lê a medição completa e segue cada
auditoria reprovada até o arquivo de origem: a rota em `src/pages/`, o layout,
o componente, a imagem ou o script.

Com isso ela escreve um plano de correções, mostra o plano na tela e espera
você autorizar. Só depois altera o código.

Cada auditoria recebe um escopo:

| Escopo | Exemplo | O que a skill faz |
| --- | --- | --- |
| Página | Imagem de capa sem `<Image>` | Propõe a correção na rota |
| Componente | Botão do header sem nome acessível | Propõe e lista as páginas que mudam junto |
| Global | `build.inlineStylesheets` no `astro.config.mjs` | Propõe com o resumo da alteração |
| Fora do código | Cabeçalho de cache da CDN | Descreve o ajuste para a hospedagem |

Depois das correções autorizadas, a skill roda o build. Quando existe uma URL
de preview com as mudanças, ela mede de novo e compara com a medição anterior.

## O histórico fica no projeto

O Pagespeedfy procura a raiz do projeto nesta ordem:

1. a opção `--project <pasta>`;
2. a variável `PAGESPEEDFY_PROJECT`;
3. a pasta ancestral mais próxima que já tem `.pagespeedfy/`, pulando a home;
4. a pasta ancestral mais próxima com `.git` ou `package.json`;
5. o diretório atual.

Na prática, rode os comandos na raiz do site. Toda medição daquele projeto
entra no mesmo `history.db`. O time pode compartilhar o arquivo pelo Git.

## Uma página por vez

O Pagespeedfy trabalha com uma URL por execução, com cada medição ligada a uma
rota. Assim, a comparação de antes e depois mede o efeito das mudanças nessa
rota. Para otimizar a home e o blog, rode a skill uma vez para cada página.

## Por que a URL precisa ser pública

O Lighthouse do PageSpeed Insights roda nos servidores do Google e não alcança
`localhost` nem a rede interna. O CLI recusa URLs locais antes de gastar a
cota. Meça a produção ou um deploy de preview público.
