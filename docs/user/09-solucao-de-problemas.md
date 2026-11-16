# Solução de problemas

## `Credential "pagespeed.api_key" not found` (código 4)

O binário procurou a chave em `PAGESPEEDFY_API_KEY` e no cofre. Não achou
nenhuma. Rode:

```bash
pagespeedfy credentials set pagespeed.api_key
```

Confira depois com `pagespeedfy credentials status`. Em CI, defina a variável
`PAGESPEEDFY_API_KEY`.

## `The API key was refused` (HTTP 403, código 4)

A API recusou a chave. Confira, no Google Cloud Console:

- se a PageSpeed Insights API está ativada no projeto da chave;
- se as restrições da chave incluem essa API;
- se a chave não foi apagada ou trocada.

Depois grave a chave de novo:

```bash
pagespeedfy credentials set pagespeed.api_key
```

## `PageSpeed Insights cannot reach <host>` (código 2)

A URL aponta para um endereço que os servidores do Google não alcançam:
`localhost`, IP privado, faixa CGNAT, rede Tailscale, `.local`, `.internal` ou
`.lan`. Publique um preview público e meça essa URL.

## `The daily API quota is exhausted` (código 5)

A cota do projeto do Google Cloud ligado à chave em uso chegou ao limite do
dia. O binário não repete a consulta, porque a resposta não muda até a
renovação. Peça mais cota no Google Cloud Console, use a chave de outro projeto
ou espere o dia seguinte no fuso do Pacífico.

## Histórico vazio no projeto errado

Se `history` diz `No history in <pasta>` ou um id não é encontrado, o binário
resolveu outro projeto. Confira o caminho impresso no erro e rode na raiz do
site, ou informe a raiz direto:

```bash
pagespeedfy history --project /home/você/site
```

A mesma opção vale para `run`, `report`, `compare`, `import` e `forget`. A
variável `PAGESPEEDFY_PROJECT` resolve para toda a sessão do shell.

## `Database schema N is newer than this binary` (código 3)

O `history.db` foi criado por uma versão mais nova do binário. Um binário
antigo não escreve por cima de um esquema mais recente. Atualize:

```bash
npm install -g @promovaweb/pagespeedfy@latest
```

Antes de migrar, o binário copia o banco para `history.db.v<versão>.bak`.
Também há `.db-wal` e `.db-shm` na pasta enquanto o banco está aberto. O
`.pagespeedfy/.gitignore` já ignora os três tipos.

## `The API refused the query (HTTP 400)` (código 5)

O Google não conseguiu carregar a página. Causas comuns:

- a URL exige login ou está atrás de autenticação básica;
- a página responde 404, 500 ou redireciona em laço;
- o firewall ou a proteção contra bots recusa as requisições do Lighthouse.

Abra a URL numa janela anônima. Se ela não carregar ali, o Google também não
consegue carregá-la.

## `the API did not answer within 180 s` (código 5)

Páginas pesadas podem passar do tempo padrão. Aumente o limite ou meça uma
estratégia por vez:

```bash
pagespeedfy run https://promovaweb.com/ --timeout 300
pagespeedfy run https://promovaweb.com/ --strategy mobile
```

## `runtimeError` preenchido no relatório

O Lighthouse rodou, mas falhou ao medir. A mensagem aparece no topo da seção da
estratégia no `report`, com códigos como `NO_FCP` (a página não pintou nada) e
`ERRORED_DOCUMENT_REQUEST`. Corrija o carregamento da página e meça de novo.

## Notas muito diferentes entre duas medições

O Lighthouse simula rede e CPU, por isso a nota de Performance varia alguns
pontos entre medições. Meça com três leituras e compare as métricas e as
auditorias:

```bash
pagespeedfy run https://promovaweb.com/ --samples 3 --note "medindo variação"
pagespeedfy compare https://promovaweb.com/
```

Uma mudança grande sem alteração no código aponta para scripts de terceiros
(anúncios, chat, analytics) ou para cache frio na CDN.

## O relatório não mostra todos os itens

O `run` guarda até 50 itens por auditoria (`--max-items`). Quando `truncated` é
`true`, os demais estão no arquivo bruto indicado por `rawFile`:

```bash
pagespeedfy --json report 12 | jq -r '.data.run.rawFile'
```

Aumente o limite quando precisar de mais itens na própria saída:

```bash
pagespeedfy run https://promovaweb.com/ --max-items 200
```

## A TUI não abre (código 8)

A TUI precisa de terminal interativo nos dois fluxos. Dentro de um pipe ou de
um script, use os commands. Para a lista de opções:

```bash
pagespeedfy --help
```

## O servidor MCP não inicia (código 9)

Confira se o cliente consegue executar `pagespeedfy` no `PATH` e se a entrada
aponta para `pagespeedfy mcp`. Teste o catálogo fora do cliente:

```bash
pagespeedfy mcp --list
```

Se o binário não for encontrado, use o caminho absoluto do executável na
configuração do cliente. Se o histórico não aparecer, passe `project` com o
caminho absoluto do site em cada tool.

## Um comando falha e o código não está na lista

Rode com `--json` para ver o envelope de erro, com `code`, `name` e `message`:

```bash
pagespeedfy --json run https://promovaweb.com/
```

O `pagespeedfy doctor` mostra o estado do ambiente, da chave e do cofre sem
alterar arquivos.
