# API key e credencial

A API do PageSpeed Insights aceita consultas sem chave, mas a cota anônima é
compartilhada entre todos os usuários e costuma acabar cedo. Por isso o
Pagespeedfy usa uma chave própria, com a cota vinculada ao seu projeto no
Google Cloud.

## Criar a chave

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e escolha
   ou crie um projeto.
2. Em **APIs e serviços → Biblioteca**, procure **PageSpeed Insights API** e
   clique em **Ativar**.
3. Em **APIs e serviços → Credenciais**, clique em **Criar credenciais →
   Chave de API**.
4. Edite a chave criada e, em **Restrições de API**, selecione só a
   PageSpeed Insights API.

A chave começa com `AIza` e tem 39 caracteres.

## Gravar a chave no cofre

```bash
pagespeedfy credentials set pagespeed.api_key
```

O terminal pede a chave e não mostra o que você digita. O valor entra cifrado
em `~/.pagespeedfy/credentials.json`, com AES-256-GCM.

Para ler a chave de um gerenciador de senhas ou de um arquivo, use o stdin:

```bash
op read "op://Promovaweb/PageSpeed/credential" | pagespeedfy credentials set pagespeed.api_key --stdin
```

## Conferir o cofre

```bash
pagespeedfy credentials status
```

A saída mostra o caminho do arquivo, a cifra, a origem da chave mestra e
quantas credenciais estão gravadas. Para ver a chave mascarada:

```bash
pagespeedfy credentials get pagespeed.api_key
```

O valor completo só aparece com `--reveal`, que você raramente precisa usar.
Para listar os nomes gravados:

```bash
pagespeedfy credentials list
```

## Onde a chave fica

```text
~/.pagespeedfy/
├── credentials.json   # cofre cifrado, permissão 0600
└── master.key         # chave mestra de 32 bytes, permissão 0600
```

A chave mestra vem do arquivo `master.key` ou da variável
`PAGESPEEDFY_MASTER_KEY`, que aceita 64 caracteres hexadecimais. Guardar a
chave mestra fora do disco ajuda em máquina compartilhada e em CI.

Para trocar a chave mestra sem perder as credenciais:

```bash
pagespeedfy credentials rotate-key
```

## Precedência da chave

1. A variável `PAGESPEEDFY_API_KEY`.
2. O cofre, no nome `pagespeed.api_key`.

A variável vence o cofre. Use a variável em automação e o cofre no dia a dia.

## Quem vem da 0.3.x

Na 0.3.x, a chave era gravada em texto puro por `pagespeedfy auth login` no
arquivo `~/.pagespeedfy/credentials`. Na 1.0, esse arquivo é lido no primeiro
uso, a chave é movida para o cofre e o arquivo antigo é apagado. Um aviso no
stderr informa a migração. Os commands da 0.3.x saíram; use `credentials set`,
`credentials status` e `credentials remove`.

## Usar em CI

Em automação, defina a variável `PAGESPEEDFY_API_KEY`. Ela tem prioridade
sobre o cofre e evita gravar a chave no disco do runner.

```bash
PAGESPEEDFY_API_KEY="$PSI_KEY" pagespeedfy run https://promovaweb.com/
```

No GitHub Actions, guarde a chave em um secret e passe pela variável de
ambiente, como mostra o exemplo em
[Histórico e comparação](06-historico-e-comparacao.md).

## Cuidados

- Não informe a chave como argumento de comando, porque ela ficaria no
  histórico do shell.
- Não grave a chave no projeto Astro nem em `.env` versionado.
- Não envie a chave no chat do agente. Rode
  `pagespeedfy credentials set pagespeed.api_key` no seu terminal.
- O Pagespeedfy troca a chave por `***` nas mensagens de erro e nunca devolve o
  valor em `--json`, nas tools MCP ou nos frames da TUI.
