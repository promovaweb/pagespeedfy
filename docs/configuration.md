# Configuração e credenciais

Tudo que o binário persiste fica em `~/.{{bin}}/`:

| Arquivo | Conteúdo | Permissão |
| --- | --- | --- |
| `settings.json` | preferências em texto claro | 0600 |
| `credentials.json` | envelope AES-256-GCM com os segredos | 0600 |
| `master.key` | master key em hexadecimal, criada na primeira gravação | 0600 |

A pasta é criada com 0700. A variável `{{BIN}}_HOME` troca a raiz, útil em
testes e CI.

## Pasta do projeto: `.pagespeedfy/`

O histórico de medições não fica em `~/.pagespeedfy/`. Ele pertence ao
projeto que está sendo otimizado, ao lado do código, para a evolução viajar
com o repositório. O caminho é `<projeto>/.pagespeedfy/`:

| Caminho | Conteúdo | Versionar |
| --- | --- | --- |
| `history.db` | SQLite com as tabelas `pages` e `measurements` | pode ir para o Git, para a equipe compartilhar a linha do tempo |
| `reports/<host>/<rota>/<AAAAMMDD-HHMMSS>/<estrategia>-<n>.raw.json` | respostas brutas da API, uma por leitura | não |
| `.gitignore` | gerado na criação da pasta; ignora `reports/` e os arquivos `*.db-wal`, `*.db-shm` e `*.bak` | sim, é ele que mantém os brutos fora do Git |

A pasta nasce no primeiro `run` ou `import`. `history`, `report`,
`compare` e a TUI só leem; sem `history.db` elas informam o caminho e o
command de medição, sem criar arquivo.

O `history.db` guarda uma linha em `pages` por URL e uma linha em
`measurements` por estratégia medida. Uma execução de `run` grava uma
medição por estratégia com o mesmo `session`, o que agrupa as leituras
feitas juntas. Notas, métricas de laboratório e a contagem de auditorias
falhadas têm colunas próprias; o objeto `run` completo fica em JSON na
mesma linha.

Para apagar o histórico de um projeto, remova `.pagespeedfy/history.db`
(ou a pasta inteira, incluindo os brutos). Nada fora do projeto é afetado;
a próxima medição recria a pasta.

### Resolução da raiz do projeto

Nesta ordem:

1. `--project <dir>`, em `run`, `history`, `report`, `compare`, `import` e
   `forget`;
2. a variável `PAGESPEEDFY_PROJECT`;
3. a pasta ancestral mais próxima que já tem `.pagespeedfy/`. A pasta home é
   pulada, porque `~/.pagespeedfy/` é a pasta de dados do binário;
4. a pasta ancestral mais próxima com `.git` ou `package.json`;
5. o diretório atual.

O caminho de `--project` e de `PAGESPEEDFY_PROJECT` é resolvido a partir do
diretório atual. Rode os commands dentro do projeto ou aponte a raiz quando
o histórico estiver em outro lugar.

## API key do PageSpeed Insights

A chave vem, nesta ordem:

1. da variável `PAGESPEEDFY_API_KEY`, útil em CI e em execução única;
2. do cofre cifrado, na credencial `pagespeed.api_key`.

```bash
{{bin}} credentials set pagespeed.api_key
export PAGESPEEDFY_API_KEY="AIza..."
```

A chave vai no cabeçalho `X-Goog-Api-Key`, nunca na URL, e não aparece em
`--json`, em erro, em resposta de tool MCP nem em frame da TUI.

A versão 0.3.x guardava a chave em texto claro em `~/.pagespeedfy/credentials`.
No primeiro uso da versão nova, essa chave é movida para o cofre em
`pagespeed.api_key` e o arquivo antigo é apagado; um aviso em stderr informa
a migração, com a chave mascarada. A variável de ambiente tem prioridade e
dispensa a migração. Se o arquivo antigo estiver ilegível, ele é mantido e
ignorado.

## settings.json

Keys em notação de ponto. O schema atual:

| Key | Tipo | Padrão | Função |
| --- | --- | --- | --- |
| `output.format` | `text` ou `json` | `text` | formato padrão da saída do CLI |
| `output.colors` | boolean | `true` | cores ANSI na saída de texto |
| `tui.initialTab` | `history`, `overview` ou `about` | `history` | aba aberta ao iniciar a TUI |
| `tui.theme` | `night` ou `day` | `night` | paleta da TUI |
| `telemetry.enabled` | boolean | `false` | reservado, ainda sem efeito |

Commands:

```bash
{{bin}} config list
{{bin}} config get tui.theme
{{bin}} config set output.format json
{{bin}} config unset telemetry.enabled
{{bin}} config path
{{bin}} config schema
```

Keys fora do schema são aceitas como texto. Para que uma key nova ganhe tipo,
padrão e documentação, acrescente-a a `SETTINGS_SCHEMA` em
`src/config/settings.ts`.

## credentials.json

O arquivo guarda um envelope:

```json
{ "version": 1, "algorithm": "aes-256-gcm", "iv": "<base64>", "tag": "<base64>", "data": "<base64>" }
```

`data` é o JSON `{ "name": "value" }` cifrado. Names seguem
`[a-z0-9][a-z0-9_.-]{0,63}`, por exemplo `openai.api_key` ou `github.token`.

A master key tem 32 bytes e vem, nesta ordem:

1. da variável `{{BIN}}_MASTER_KEY` (64 caracteres hexadecimais);
2. do arquivo `master.key`, gerado automaticamente.

Gere uma chave para a variável com `openssl rand -hex 32`. Quando a variável
está definida, `master.key` é ignorado.

Commands:

```bash
{{bin}} credentials set openai.api_key            # digita sem eco
printf '%s' "$TOKEN" | {{bin}} credentials set github.token --stdin
{{bin}} credentials get openai.api_key            # mascarado
{{bin}} credentials get openai.api_key --reveal   # em claro
{{bin}} credentials list
{{bin}} credentials remove github.token
{{bin}} credentials status
{{bin}} credentials clear --yes
```

## O que a cifra protege

A cifra protege o arquivo contra leitura casual, cópia em backup e varredura
do disco por outras ferramentas. Quem tem acesso à mesma conta do sistema
consegue ler `master.key` e decifrar o conteúdo. Para um nível acima, injete a
chave por `{{BIN}}_MASTER_KEY` a partir de um gerenciador de segredos e não
grave `master.key` em disco.

## Usar uma credencial no código

```ts
import { getCredential } from "../config/credentials.ts";

const token = getCredential("github.token"); // lança AppError(4) quando não existe
```

Nunca escreva o valor em log, em erro, em `data` do `--json` nem em
resposta de tool MCP.

## Variáveis de ambiente

| Variável | Efeito |
| --- | --- |
| `{{BIN}}_HOME` | troca `~/.{{bin}}/` por outra pasta |
| `{{BIN}}_MASTER_KEY` | master key em hex; dispensa `master.key` |
| `NO_COLOR` | desliga cores na saída de texto |
| `PAGESPEEDFY_API_KEY` | API key do PageSpeed Insights; tem prioridade sobre o cofre |
| `PAGESPEEDFY_PROJECT` | raiz do projeto com `.pagespeedfy/`; equivale a `--project` |

## Rotação da master key

| Command ou option | Efeito |
| --- | --- |
| `credentials rotate-key` | Gera chave aleatória, recifra o cofre e grava `master.key` com 0600. |
| `credentials rotate-key --from-env` | Lê a chave atual de `master.key` e usa `{{BIN}}_MASTER_KEY` como chave nova. |

`{{bin}} credentials rotate-key` abre o cofre com a chave atual e preserva
seus valores ao recifrar. A opção `--from-env` exige a chave atual em disco
e uma chave nova de 64 caracteres hexadecimais na variável. A chave nova
também é gravada em `master.key` com 0600. Sem cofre ou chave atual, o command
retorna exit code 4 (`CREDENTIALS`). Em JSON, retorna `{ rotated, source }`,
sem o conteúdo das chaves.

Sem `--from-env`, se a chave anterior veio da variável, remova essa variável
do shell após a rotação: `unset {{BIN}}_MASTER_KEY`. Ela tem prioridade sobre
o arquivo nas próximas execuções. Não execute gravações no cofre durante a
rotação. Os dois arquivos são preparados antes da substituição; falhas de
gravação comuns restauram a chave anterior por substituição atômica. Se essa
restauração também falhar, os arquivos de recuperação ficam na pasta
`.rotate-*` indicada pelo erro; a cópia `previous.key` mantém permissão 0600. Como são dois arquivos, uma
interrupção do processo entre as substituições exige recuperação de backup.
