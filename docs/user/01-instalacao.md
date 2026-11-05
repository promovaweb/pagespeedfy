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

O comando imprime a versão, por exemplo `0.1.0`.

## Instalar a skill no projeto

A skill vem dentro do pacote npm, em
`$(npm root -g)/@promovaweb/pagespeedfy/.codex/skills/`. Copie a pasta para o
projeto Astro. O destino depende do agente:

| Agente | Pasta |
| --- | --- |
| Codex | `.codex/skills/` |
| Claude Code | `.claude/skills/` |
| Projetos com `npx skills` | `.agents/skills/` |

```bash
cp -R "$(npm root -g)/@promovaweb/pagespeedfy/.codex/skills/pagespeedfy-otimizar-pagina" meu-site/.claude/skills/
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

Copie a skill de novo
para os projetos quando o CHANGELOG indicar mudança nela.
