# Visão geral

O PageSpeed Insights avalia uma página em quatro categorias: Performance,
Acessibilidade, Boas práticas e SEO. Ele roda o Lighthouse nos servidores do
Google, em um celular simulado e em um desktop simulado, e junta os dados de
usuários reais do Chrome UX Report quando a página tem tráfego suficiente.

O resultado chega como um JSON de vários megabytes. Ler esse JSON à mão para
descobrir qual componente atrasa o carregamento toma tempo. O Pagespeedfy
divide esse trabalho em duas partes.

## O CLI mede e organiza

O comando `pagespeedfy run` consulta a API para uma URL, nas duas estratégias,
e salva três coisas numa pasta datada:

- o JSON bruto de cada estratégia, sem nenhuma alteração;
- um `report.json` com as notas, as métricas, os dados de campo e só as
  auditorias reprovadas, já ordenadas por impacto;
- um `report.md` com o mesmo conteúdo em formato de leitura.

A API key fica em `~/.pagespeedfy/credentials`, fora de qualquer projeto.

## A skill planeja e corrige

A skill `pagespeedfy-otimizar-pagina` roda dentro de um agente de programação
aberto no projeto Astro. Ela executa o CLI, lê todos os relatórios da página
(o `report.json`, os JSON brutos e as medições anteriores) e segue cada item
reprovado até o arquivo de origem: a rota em `src/pages/`, o layout, o
componente, a imagem ou o script.

Com isso ela escreve um plano de correções, mostra o plano na tela e espera
você autorizar. Só depois altera o código.

Cada auditoria recebe um escopo:

| Escopo | Exemplo | O que a skill faz |
| --- | --- | --- |
| Página | Imagem de capa sem `<Image>` | Propõe a correção na rota |
| Componente | Botão do header sem nome acessível | Propõe e lista as páginas que mudam junto |
| Global | `build.inlineStylesheets` no `astro.config.mjs` | Propõe com o diff resumido |
| Fora do código | Cabeçalho de cache da CDN | Descreve o ajuste para a hospedagem |

Depois das correções autorizadas, a skill roda o build. Quando existe uma URL de preview
com as mudanças, ela mede de novo e compara.

## Uma página por vez

O Pagespeedfy trabalha com uma URL por execução. Cada relatório fica ligado a
uma rota, e a comparação de antes e depois mede o efeito das mudanças nessa
rota. Para otimizar a home e o blog, rode a skill duas vezes.

## Por que a URL precisa ser pública

O Lighthouse do PageSpeed Insights roda no Google, não na sua máquina. Ele não
alcança `localhost` nem a rede interna. Meça a produção ou um deploy de
preview. O CLI recusa URLs locais antes de gastar a cota.
