# Instalação

## Requisitos

- Um projeto Astro para otimizar.
- Um agente de programação com suporte a skills, como Codex ou Claude Code.
- Node.js 18.17 ou superior apenas se você instalar pelo npm. O binário não
  precisa de Node para rodar.
- Git, para versionar o histórico do projeto.

## Instalar pelo npm

O pacote está no npm como `@promovaweb/pagespeedfy`:

```bash
npm install -g @promovaweb/pagespeedfy
```

O pacote npm é um invólucro. No primeiro uso, ele baixa o binário da GitHub
Release da mesma versão, confere o SHA-256 e guarda em
`~/.pagespeedfy/bin/v<versão>/`. As execuções seguintes usam esse arquivo,
sem baixar de novo.

Para experimentar sem instalar:

```bash
npx @promovaweb/pagespeedfy --version
```

## Baixar o binário da release

Quem não usa npm pode baixar o executável direto da
[página de releases](https://github.com/promovaweb/pagespeedfy/releases). Há um
arquivo por plataforma:

- `linux-x64`
- `linux-arm64`
- `darwin-x64`
- `darwin-arm64`
- `windows-x64`

Mova o arquivo para uma pasta do `PATH` e dê permissão de execução:

```bash
chmod +x pagespeedfy-linux-x64
mv pagespeedfy-linux-x64 ~/.local/bin/pagespeedfy
```

## Conferir a instalação

```bash
pagespeedfy --version
```

A saída traz a versão, por exemplo `pagespeedfy 1.0.0`. Para ver o diagnóstico
do ambiente, a origem da chave e a leitura do cofre:

```bash
pagespeedfy doctor
```

## Instalar a skill no projeto

A skill fica na pasta `skills/` do repositório
[promovaweb/pagespeedfy](https://github.com/promovaweb/pagespeedfy), no formato
lido pelo `npx skills`. Na raiz do projeto Astro, rode:

```bash
npx skills add https://github.com/promovaweb/pagespeedfy
```

O comando baixa a skill `pagespeedfy-otimizar-pagina` do GitHub, pergunta para
quais agentes instalar e registra a origem no `skills-lock.json` do projeto.
Para conferir:

```bash
npx skills list
```

## Onde ficam os dados

O binário guarda só o que é da máquina em `~/.pagespeedfy/`:

```text
~/.pagespeedfy/
├── settings.json
├── credentials.json
├── master.key
└── bin/
```

O histórico de medições não fica aqui. Ele fica em
`<projeto>/.pagespeedfy/`, junto do site.

## Atualizar

```bash
npm install -g @promovaweb/pagespeedfy@latest
```

Quem usa o binário da release baixa o arquivo novo e substitui o antigo. Para
atualizar a skill no projeto, rode de novo:

```bash
npx skills add https://github.com/promovaweb/pagespeedfy
```
