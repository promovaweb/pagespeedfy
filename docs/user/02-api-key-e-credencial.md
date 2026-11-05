# API key e credencial

A API do PageSpeed Insights aceita consultas sem chave, mas a cota anônima é
compartilhada entre todos os usuários e costuma acabar cedo. Com uma chave
própria, a cota é do seu projeto no Google Cloud.

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

## Gravar a chave

```bash
pagespeedfy auth login
```

O terminal pede a chave e não mostra o que você digita. Para conferir se ela
funciona antes de gravar:

```bash
pagespeedfy auth login --validar
```

Essa opção faz uma consulta real de SEO em `https://example.com/` e leva
alguns segundos.

## Onde a chave fica

```text
~/.pagespeedfy/
└── credentials
```

O arquivo é um JSON com a chave e as datas de criação e atualização:

```json
{
  "version": 1,
  "apiKey": "AIza...",
  "createdAt": "2026-11-05T13:00:00.000Z",
  "updatedAt": "2026-11-05T13:00:00.000Z"
}
```

A pasta tem permissão `0700` e o arquivo `0600`: só o seu usuário lê.

## Conferir e remover

```bash
pagespeedfy auth status   # mostra a chave mascarada e a origem em uso
pagespeedfy auth logout   # apaga o arquivo
```

## Usar em CI

Em automação, defina a variável `PAGESPEEDFY_API_KEY`. Ela tem prioridade
sobre o arquivo e evita gravar a chave no disco do runner.

```bash
PAGESPEEDFY_API_KEY="$PSI_KEY" pagespeedfy run https://promovaweb.com/
```

## Cuidados

- Não passe a chave como argumento de comando. Ela ficaria no histórico do
  shell.
- Não grave a chave no projeto Astro nem em `.env` versionado.
- Não envie a chave no chat do agente. A skill pede que você rode
  `pagespeedfy auth login` no seu terminal.
