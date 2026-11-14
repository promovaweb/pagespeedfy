# Solução de problemas

## `Nenhuma API key configurada`

O CLI não encontrou chave no arquivo nem na variável. Rode
`pagespeedfy auth login` ou defina `PAGESPEEDFY_API_KEY`.

## `A API key foi recusada`

A API devolveu HTTP 403. Confira, no Google Cloud Console:

- se a PageSpeed Insights API está ativada no projeto da chave;
- se as restrições da chave incluem essa API;
- se a chave não foi apagada ou trocada.

Depois, grave de novo com `pagespeedfy auth login --validar`.

## `A cota diária da API acabou`

A cota do projeto do Google Cloud ligado à chave em uso chegou ao limite do
dia. O CLI não repete, porque a resposta não muda até a renovação. Peça mais
cota no Google Cloud Console, use a chave de outro projeto ou espere o dia
seguinte no fuso do Pacífico.

## `A API recusou a consulta (HTTP 400)`

O Google não conseguiu carregar a página. Causas comuns:

- a URL exige login ou está atrás de autenticação básica;
- a página responde 404, 500 ou redireciona em laço;
- o firewall ou a proteção contra bots recusa as requisições do Lighthouse.

Abra a URL numa janela anônima: se ela não carregar ali, o Google também não
consegue carregá-la.

## `O PageSpeed Insights não alcança localhost`

O CLI recusa `localhost`, IPs privados e `.local`, então publique um preview e
meça a URL pública.

## `a API não respondeu em 180 s`

Páginas pesadas podem passar do tempo padrão. Aumente com
`--timeout 300` ou meça uma estratégia por vez com `-s mobile`.

## `runtimeError` preenchido no relatório

O Lighthouse rodou, mas falhou ao medir. A mensagem fica no topo da seção da
estratégia no `report.md`, com códigos como `NO_FCP` (a página não pintou
nada) e `ERRORED_DOCUMENT_REQUEST`. Corrija o carregamento da página e meça de
novo.

## Notas muito diferentes entre duas medições

O Lighthouse simula rede e CPU, por isso a nota de Performance varia alguns
pontos entre medições. Rode duas ou três medições e compare as métricas. Uma
mudança grande sem alteração no código aponta para scripts de terceiros
(anúncios, chat, analytics) ou para cache frio na CDN.

## O relatório não mostra todos os itens

O `report.json` guarda até 50 itens por auditoria (`--max-items`). Quando
`truncated` é `true`, os demais estão no `mobile.raw.json` ou
`desktop.raw.json` da mesma pasta.
