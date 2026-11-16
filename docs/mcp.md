# MCP

`{{bin}} mcp` transforma o processo em um servidor Model Context Protocol
sobre stdio. Nada mais é escrito em stdout; diagnósticos vão para stderr.

## Configuração no cliente

```json
{
  "mcpServers": {
    "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] }
  }
}
```

Para o Claude Code: `claude mcp add {{bin}} -- {{bin}} mcp`.
Para desenvolvimento, sem compilar: `"command": "bun", "args": ["run", "src/main.ts", "mcp"]`.

## Tools do PageSpeed

As quatro tools usam o mesmo domínio do CLI: o histórico em
`<projeto>/.pagespeedfy/`, a mesma API key e a mesma resolução de projeto.
`pagespeed_run` grava e chama a API; as outras três só leem o histórico
local. Em todas, o parâmetro `project` equivale a `--project` e recebe o
caminho absoluto da raiz do site; sem ele, vale o diretório do servidor e
os pais dele.

### `pagespeed_run`

Mede uma página e registra a medição no histórico. Consulta mobile e desktop
em paralelo e guarda a leitura mediana por performance.

| Parâmetro | Tipo | Default | Efeito |
| --- | --- | --- | --- |
| `url` | string, obrigatório | nenhum | URL pública completa, com `http://` ou `https://`. |
| `strategy` | `mobile`, `desktop` ou `all` | `all` | Estratégia medida. |
| `categories` | lista de `performance`, `accessibility`, `best-practices`, `seo` | todas | Categorias pedidas à API. |
| `samples` | inteiro de 1 a 9 | `1` | Leituras por estratégia. |
| `note` | string de até 500 caracteres | nenhum | O que mudou antes da medição, guardado na linha do tempo. |
| `failUnder` | string | nenhum | Notas mínimas no formato do `--fail-under`, por exemplo `performance=90,seo=95`. Não muda o exit code; o resultado vai em `budget`. |
| `project` | string | diretório do servidor | Raiz do projeto que contém `.pagespeedfy/`. |

Devolve um objeto com `url`, `project`, `session`, `measurements` e
`budget`. Cada medição traz `id`, `strategy`, `measuredAt`, `note`,
`samples`, `scores`, `lab`, `failedAudits`, `sampleScores` e
`topFailedAudits`, as cinco auditorias de maior impacto com `id`, `title` e
`metricSavings`. `budget` é `null` sem `failUnder`; com a option, traz
`minimums`, `failures` e `passed`. O texto de `content` traz o resumo em
Markdown seguido do JSON.

### `pagespeed_history`

Lê o histórico do projeto. Sem `url`, lista as páginas acompanhadas; com
`url`, devolve as medições daquela página, com as mais recentes no JSON e a
linha do tempo cronológica no Markdown.

| Parâmetro | Tipo | Default | Efeito |
| --- | --- | --- | --- |
| `url` | string | nenhum | Página cuja linha do tempo mostrar. |
| `strategy` | `mobile` ou `desktop` | as duas | Estratégia da linha do tempo. |
| `limit` | inteiro de 1 a 500 | `50` | Quantidade máxima de medições recentes. |
| `project` | string | diretório do servidor | Raiz do projeto. |

Sem `url`, devolve `project` e `pages`, cada uma com `id`, `url`, `host`,
`createdAt`, `measurements`, `lastMeasuredAt` e `latest` por estratégia. Com
`url`, devolve `project`, `url` e `measurements`. No JSON as medições vêm da
mais recente para a mais antiga; no Markdown que acompanha a resposta, a
linha do tempo vai da mais antiga para a mais recente. Projeto sem histórico
retorna `isError: true` com a orientação de medir uma página.

### `pagespeed_report`

Imprime uma medição guardada por inteiro.

| Parâmetro | Tipo | Default | Efeito |
| --- | --- | --- | --- |
| `ref` | string, obrigatório | nenhum | Id da medição ou URL da página, que vale a última medição de `strategy`. |
| `strategy` | `mobile` ou `desktop` | `mobile` | Estratégia usada quando `ref` é URL. |
| `project` | string | diretório do servidor | Raiz do projeto. |

Devolve `{ measurement }`, com o resumo de notas e métricas e o objeto `run`
normalizado, que traz `scores`, `labMetrics`, `fieldData`, `failedAudits` e
`formatVersion`. Id inexistente retorna `isError: true`.

### `pagespeed_compare`

Compara duas medições da mesma página: diferença de notas e métricas,
auditorias resolvidas, novas e pendentes.

| Parâmetro | Tipo | Default | Efeito |
| --- | --- | --- | --- |
| `before` | string, obrigatório | nenhum | Id da medição ou URL da página. |
| `after` | string | nenhum | Segunda referência. Omitido, a tool escolhe a medição anterior da mesma página e estratégia. |
| `strategy` | `mobile` ou `desktop` | `mobile` | Estratégia usada quando uma referência é URL. |
| `project` | string | diretório do servidor | Raiz do projeto. |

Devolve `{ comparison }`, com `url`, `strategy`, `sameUrl`, `sameStrategy`,
`before`, `after`, `scores`, `labMetrics`, `resolvedAudits`, `newAudits`,
`remainingAudits` e `regression`. A tool não altera o exit code do processo;
cabe ao agente ler `regression` e decidir. Comparação sem medição suficiente
retorna `isError: true`.

## Tools do binário

| Tool | Entrada | Saída |
| --- | --- | --- |
| `doctor` | nenhuma | `{ checks, ok }`; `isError: true` se houver `fail` |
| `about` | nenhuma | identity, runtime, platform, data directory e credits |
| `exit_codes` | nenhuma | tabela de exit codes |
| `skill` | `topic?` (`cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`) | documentação em Markdown |
| `config_list` | nenhuma | keys de settings.json em vigor e o schema |
| `config_get` | `key` | valor da key; `isError` quando não existe |
| `credentials_status` | nenhuma | file, master key source, count e names |

Nenhuma tool devolve o valor de uma credencial. `pagespeed_run` é a única
que grava e chama serviço externo; a description da tool avisa isso.

## Resources

| URI | Conteúdo |
| --- | --- |
| `{{bin}}://about` | identity em JSON |
| `{{bin}}://exit-codes` | exit codes em JSON |
| `{{bin}}://skill` | documentação completa em Markdown |
| `{{bin}}://skill/{topic}` | uma seção; os topics são os mesmos de `--skill` |

## Prompts

| Prompt | Arguments | Função |
| --- | --- | --- |
| `operate` | `task` | instrui o agente a ler `skill cli` e executar a task pelo CLI com `--json` |
| `optimize_page` | `url`, `project?` | conduz o ciclo medir, corrigir, publicar e comparar de uma página, gravando cada etapa no histórico |

## Listar sem iniciar

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

## Testar

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
```

O Inspector abre uma página local para chamar tools, ler resources e
inspecionar as mensagens JSON-RPC.

Nomes de tools usam `snake_case`. Tools que gravam ou chamam APIs externas
precisam dizer isso na description e nunca devem ecoar segredos na resposta.
A tool `doctor` usa a mesma coleta do command CLI e não grava arquivos.
