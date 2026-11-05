# Instalação

## Requisitos

- Node.js 22.12 ou superior.
- Git.
- Um projeto Astro para otimizar.
- Um agente de programação com suporte a skills, como Codex ou Claude Code.

## Instalar o CLI

O pacote está no npm como `@promovaweb/pagespeedfy`:

```bash
npm install -g @promovaweb/pagespeedfy
```

Para rodar sem instalar:

```bash
npx @promovaweb/pagespeedfy --version
```

Confira:

```bash
pagespeedfy --version
```

O comando imprime a versão, por exemplo `0.2.0`.

## Instalar a skill no projeto

A skill fica na pasta `skills/` do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy), no formato
lido pelo `npx skills`. Na raiz do projeto Astro, rode:

```bash
npx skills add https://github.com/promovaweb/pagespeedfy
```

O comando baixa a skill `pagespeedfy-otimizar-pagina` do GitHub, pergunta para
quais agentes instalar (Codex, Claude Code e outros) e registra a origem no
`skills-lock.json` do projeto. Para conferir:

```bash
npx skills list
```

## Ignorar os relatórios no Git

Os relatórios trazem URLs e trechos de HTML que não pertencem ao repositório.
No projeto Astro:

```bash
echo "pagespeedfy-reports/" >> .gitignore
```

A skill faz essa conferência sozinha na primeira execução.

## Atualizar

```bash
npm install -g @promovaweb/pagespeedfy@latest
```

Para atualizar a skill no projeto, rode de novo:

```bash
npx skills add https://github.com/promovaweb/pagespeedfy
```
