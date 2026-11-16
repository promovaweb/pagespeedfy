# TUI

A interface de terminal abre com `{{bin}}` sem argumentos ou com
`{{bin}} tui`. Ela exige stdin e stdout em um TTY; fora disso o processo
encerra com exit code 8.

## Abas

| Aba | Conteúdo |
| --- | --- |
| History (`history`) | Histórico do projeto: páginas, linha do tempo, métricas, auditorias e comparação entre medições. |
| Overview | Environment (binary, runtime, platform, terminal, data directory), estado de settings.json e do cofre, settings em vigor e next steps. |
| About | Binary, project, license, credits e standards seguidos. |

A aba inicial vem de `tui.initialTab` em settings.json ou de `--tab`.

## Teclas

| Tecla | Ação |
| --- | --- |
| `←` `→` `[` `]` | aba anterior ou seguinte |
| `Tab` | próxima aba |
| `1` … `9` | ir para a aba de mesmo número |
| `?` | mostrar ou esconder o help de teclas |
| `q` `Esc` `Ctrl+C` | sair |

Cada screen pode declarar teclas próprias em `keys` e tratá-las em `onKey`.
Elas aparecem na barra inferior antes das teclas globais.

## Tema

Duas paletas em `src/tui/theme.ts`: `night` (padrão) e `day`. A escolha vem
de `tui.theme`. As cores têm nomes de papel (`accent`, `textDim`, `border`),
não de matiz, para que uma troca de paleta não exija tocar nas screens.

Princípios do visual, no estilo modern unix:

- bordas arredondadas com título na própria borda;
- rótulos apagados à esquerda e valores em cor plena à direita;
- uma cor de accent para o que está ativo, uma secundária para links e
  origens externas; verde, âmbar e vermelho só para estado;
- barra de status com teclas em blocos invertidos;
- sem espaços vazios entre painéis vizinhos; padding interno de uma célula;
- nada pisca, nada rola sozinho.

## Como criar uma screen

1. Copie `template/screen/example.ts` para `src/tui/screens/<id>.ts`.
2. Preencha `id`, `title`, `description` e `mount(ctx)`. Use os componentes
   de `src/tui/components.ts` (`panel`, `keyValueTable`, `list`, `heading`,
   `dim`) e as cores de `ctx.theme`.
3. Se a screen precisar de atualização periódica, inicie o timer em
   `onEnter` e limpe em `onLeave`.
4. Registre em `src/tui/screens/index.ts`. A ordem da lista é a ordem das abas.
   O stub exporta a factory `createExampleScreen()`: registre o `Screen` que
   ela devolve, para que seleção e renderables fiquem por instância.
5. Se o `id` for uma opção válida de aba inicial, acrescente-o em
   `tui.initialTab` (`src/config/settings.ts`) e em `--tab`
   (`src/cli/commands/tui.ts`).

A TUI roda sobre o OpenTUI (`@opentui/core`). Use `BoxRenderable`,
`TextRenderable`, `TabSelectRenderable`, `ScrollBoxRenderable` e os demais
renderables do pacote. Sempre devolva o terminal com `renderer.destroy()`;
`mountTui()` já cuida disso para `q`, `Esc` e `Ctrl+C`.

## Testar sem terminal

`tests/tui.test.ts` monta a interface com `createTestRenderer` de
`@opentui/core/testing`, pressiona teclas com `mockInput.pressKey` e confere
o frame com `captureCharFrame`. `mountTui` aceita qualquer renderer;
`startTui` cria o renderer real.

## Lista com seleção

`listPanel(renderer, theme, { title, items, onSelect })` monta uma lista
com `ScrollBoxRenderable`. O item atual recebe `theme.surfaceHigh` no fundo
e `theme.accent` no texto. A rolagem acompanha o item selecionado.

| Retorno | Uso |
| --- | --- |
| `box` | Adicione ao layout; `handleKeyPress` trata up/down, j/k e Enter. |
| `move(delta)` | Move o destaque sem chamar `onSelect`; respeita os limites. |
| `selected()` | Retorna o índice atual, ou -1 para lista vazia. |
| `select(index)` | Destaca o índice e chama `onSelect(index)`. |

Na screen, trate up/k com `move(-1)`, down/j com `move(1)` e Enter com
`select(selected())` dentro de `onKey`. A tecla `r` pode voltar ao primeiro
item com `move(-selected())`. Declare essas teclas em `keys` para aparecerem
na barra inferior. O exemplo completo está em `template/screen/example.ts`.
Não encaminhe a mesma tecla pelo foco de `box` e por `onKey` simultaneamente.

## Histórico do projeto

`history` (History) é a primeira aba e a aba inicial padrão. Ao abrir a
TUI, o projeto é resolvido a partir do diretório atual ou de
`PAGESPEEDFY_PROJECT`. A tela consulta o histórico local, sem chamar a API
nem registrar medições.

A lista mostra URL, quantidade de medições, data da última e performance
mais recente de mobile e desktop. As faixas do Lighthouse usam vermelho
(0–49), âmbar (50–89) e verde (90–100); valores ausentes aparecem como `—`.

| Tecla em History | Ação |
| --- | --- |
| `↑` / `↓` ou `k` / `j` | selecionar página ou medição; rolar o detalhe |
| `Enter` | abrir a linha do tempo da página ou o detalhe da medição |
| `Esc` | voltar do detalhe à linha do tempo ou à lista; na lista, sair |
| `f` | na linha do tempo, alternar todas, mobile e desktop |
| `r` | recarregar do banco, preservando a seleção quando ainda existir |

A linha do tempo vai da medição mais antiga à mais recente. Cada item traz
estratégia, data, quatro notas (P, A, BP e SEO), LCP, TBT, CLS, quantidade de
auditorias pendentes e a anotação da pessoa. As sparklines `▁▂▃▄▅▆▇█`
usam escala fixa de 0 a 100, com `·` para notas ausentes. Mobile e desktop
têm séries separadas, cada uma com a diferença entre a primeira e a última
nota em pontos; uma série sem extremos disponíveis mostra `—`.

O detalhe apresenta notas, métricas de laboratório, auditorias pendentes na
ordem de impacto do relatório e economias estimadas. A comparação usa a
medição anterior da mesma página e estratégia e lista alterações das notas,
auditorias resolvidas e novas. A primeira medição informa que não há anterior.

Sem `.pagespeedfy/history.db`, a tela mostra o caminho do projeto e
`pagespeedfy run <url>`. Abrir a TUI não cria esse banco. Um banco sem páginas
mostra a mesma orientação. Falhas de leitura oferecem nova tentativa com `r`.

A sparkline limita a janela às últimas 48 medições por estratégia (menos em
terminais estreitos) e informa `last N/total` quando há recorte. A diferença
em pontos continua calculada sobre a primeira e a última medição do filtro.
