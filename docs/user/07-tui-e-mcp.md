# TUI e MCP

O mesmo binário atende a pessoa no terminal e o agente por stdio. A TUI lê o
histórico do projeto. O servidor MCP entrega as mesmas consultas ao agente, com
as tools do domínio e um prompt pronto.

## Abrir a TUI

Num terminal interativo, rode o binário sem argumentos:

```bash
pagespeedfy
```

O command `tui` faz o mesmo e aceita a aba inicial:

```bash
pagespeedfy tui --tab about
```

A interface tem três abas. A ordem e o nome de cada uma aparecem no topo:

| Aba | Conteúdo |
| --- | --- |
| History | Páginas medidas no projeto e linha do tempo de cada uma |
| Overview | Ambiente, caminhos, preferências e estado do cofre |
| About | Versão, executável, runtime, plataforma e créditos |

A aba inicial vem de `tui.initialTab`, com `history` como padrão:

```bash
pagespeedfy config set tui.initialTab overview
```

## Teclas da TUI

Teclas globais:

| Tecla | Ação |
| --- | --- |
| `←` e `→`, `[` e `]` | Trocar de aba |
| `Tab` | Próxima aba |
| `1` a `9` | Ir para a aba com aquele número |
| `?` | Mostrar ou esconder a ajuda |
| `q`, `Esc`, `Ctrl+C` | Sair |

Na aba History:

| Tecla | Ação |
| --- | --- |
| `↑` e `↓`, `k` e `j` | Mover a seleção |
| `Enter` | Abrir a página, depois a medição |
| `Esc` | Voltar para o nível anterior |
| `f` | Alternar o filtro da linha do tempo entre mobile, desktop e todas |
| `r` | Recarregar o histórico |

A lista de páginas mostra a última nota de mobile e de desktop. Enter abre a
linha do tempo da página, com um sparkline da Performance e a diferença entre a
primeira e a última medição. Enter numa medição abre o detalhe, com notas,
métricas, auditorias pendentes e a comparação com a anterior.

A TUI só lê. Sem histórico no projeto, ela mostra o caminho procurado e o
comando `pagespeedfy run <url>`. Fora de um terminal interativo, o command sai
com código 8.

## Subir o servidor MCP

```bash
pagespeedfy mcp
```

O servidor fala Model Context Protocol por stdio e serve até o processo
terminar. Para ver o que ele registra sem iniciar:

```bash
pagespeedfy mcp --list
```

## Tools do domínio

| Tool | O que faz | Parâmetros |
| --- | --- | --- |
| `pagespeed_run` | Mede uma página e grava no histórico | `url`, `strategy`, `categories`, `samples`, `note`, `failUnder`, `project` |
| `pagespeed_history` | Lista páginas ou a linha do tempo de uma página | `url`, `strategy`, `limit`, `project` |
| `pagespeed_report` | Devolve uma medição com as auditorias pendentes | `ref`, `strategy`, `project` |
| `pagespeed_compare` | Compara duas medições | `before`, `after`, `strategy`, `project` |

As tools herdadas do Termfy também respondem: `about`, `exit_codes`, `skill`,
`config_list`, `config_get`, `credentials_status` e `doctor`. Elas mostram
identidade, códigos de saída, documentação embutida, preferências e diagnóstico,
sem devolver o valor de nenhuma credencial.

Os resources `pagespeedfy://about`, `pagespeedfy://exit-codes`,
`pagespeedfy://skill` e `pagespeedfy://skill/{topic}` entregam o mesmo conteúdo
em JSON ou Markdown.

## O prompt `optimize_page`

O prompt monta o ciclo de medir, corrigir e comparar para uma página:

| Argumento | Uso |
| --- | --- |
| `url` | URL pública da página |
| `project` | Caminho absoluto do repositório do site |

O texto entregue ao agente pede o histórico da página, a medição de linha de
base com `samples` 3, a leitura das auditorias de maior peso, a correção em
grupos e a comparação depois do deploy. Ele também orienta o agente a nunca
pedir a API key no chat.

## O parâmetro `project`

O cliente MCP escolhe a pasta onde o servidor começa. Essa pasta raramente é
a raiz do site. Por isso as tools aceitam `project` com o caminho absoluto do
projeto. Sem ele, o servidor usa `PAGESPEEDFY_PROJECT`, a pasta ancestral com
`.pagespeedfy/` ou a pasta atual do servidor.

Exemplo de chamada:

```json
{
  "url": "https://promovaweb.com/",
  "samples": 3,
  "note": "baseline",
  "project": "/home/você/site"
}
```

Prefira o caminho absoluto. Assim o histórico cai sempre no mesmo
`<projeto>/.pagespeedfy/history.db`, independente de onde o cliente abriu o
servidor.

## Configurar no Claude Code

```bash
claude mcp add pagespeedfy -- pagespeedfy mcp
```

Confira com `claude mcp list`. A partir daí as tools aparecem na sessão e o
prompt `optimize_page` fica disponível.

## Configurar no Codex

```bash
codex mcp add pagespeedfy -- pagespeedfy mcp
```

O comando grava a entrada em `~/.codex/config.toml`. Para conferir:

```bash
codex mcp list
```

Em qualquer cliente que leia a configuração em arquivo, a entrada é esta:

```json
{
  "mcpServers": {
    "pagespeedfy": {
      "command": "pagespeedfy",
      "args": ["mcp"]
    }
  }
}
```
