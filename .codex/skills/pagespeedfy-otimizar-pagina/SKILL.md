---
name: pagespeedfy-otimizar-pagina
description: Mede uma única página com o CLI do Pagespeedfy, lê o relatório inteiro do PageSpeed Insights e aplica as correções no projeto Astro, com build e comparação antes e depois.
---

# Otimizar uma página Astro com o Pagespeedfy

Use esta skill quando a pessoa pedir para melhorar a nota do PageSpeed
Insights, os Core Web Vitals, a acessibilidade, as boas práticas ou o SEO
técnico de uma página publicada de um site Astro.

A skill trabalha com **uma página por execução**. A medição, a leitura e as
correções valem para a URL informada. Componentes compartilhados podem mudar
outras páginas, e isso entra no relatório final.

## Entrada

- Uma URL pública e completa, com `https://`. O PageSpeed Insights roda nos
  servidores do Google e não alcança `localhost`, IP privado nem domínio
  `.local`.
- Quando a pessoa enviar várias URLs, peça que escolha uma. Siga com a
  escolhida e liste as demais como próximas execuções.
- Quando a pessoa não enviar URL, pergunte qual página medir. Não escolha por
  ela.

## Pré-requisitos

1. Rode `pagespeedfy --version`. Se o comando não existir, oriente a
   instalação descrita no README do Pagespeedfy e pare.
2. Rode `pagespeedfy auth status`. Sem chave configurada, peça que a pessoa
   execute `! pagespeedfy auth login` no próprio terminal. Nunca peça a API
   key no chat, nunca a escreva em arquivo do projeto e nunca a passe como
   argumento de comando.
3. Confirme que o diretório atual é um projeto Astro: `astro.config.*` na raiz
   e `astro` em `package.json`. Leia `AGENTS.md`, `CLAUDE.md` ou o README do
   projeto e siga as regras locais de código, design e documentação.
4. Rode `git status --short` e preserve mudanças que já existiam.
5. Garanta que `.pagespeedfy/` esteja no `.gitignore` do projeto. Os
   relatórios trazem URLs e trechos de HTML que não pertencem ao repositório.

## Fluxo

### 1. Medir a linha de base

```bash
pagespeedfy run <url> --print path
```

O comando consulta mobile e desktop nas quatro categorias e imprime o caminho
do `report.json`. Guarde esse caminho como linha de base. A consulta leva de
20 a 90 segundos por estratégia.

Se o comando falhar por cota diária, chave recusada ou URL inacessível, relate
a mensagem do CLI e pare. Não repita em laço.

### 2. Ler o relatório inteiro

Leia `references/leitura-relatorio.md` e depois o `report.json` completo,
das duas estratégias. Não leia apenas o `report.md`: ele resume os itens.

Para cada estratégia, registre:

- `runtimeError`: quando preenchido, a medição falhou. Relate e pare.
- `runWarnings`: avisos que afetam a confiança na medição, como redirecionamento
  ou página lenta demais.
- `scores`, `labMetrics` e `field` (CrUX de página e de origem).
- Cada item de `failedAudits`, com todos os `items`. Quando `truncated` for
  `true`, abra o arquivo indicado em `rawFile` e leia
  `lighthouseResult.audits.<id>.details.items` inteiro.
- `manualAudits`, que vão para o relatório final como verificação humana.

### 3. Localizar a página no código

Encontre o arquivo que gera a URL. Leia `astro.config.*` para `base`,
`trailingSlash`, `i18n`, `redirects` e integrações. Depois procure em
`src/pages/`, incluindo rotas dinâmicas (`[slug].astro`, `[...rota].astro`) e
coleções de `src/content/`.

Siga a cadeia de imports: página, layout, componentes, estilos e scripts. Use
os dados dos itens para chegar ao arquivo certo:

- `node.selector` e `node.snippet`: procure classes, IDs e textos com `rg`.
- URLs em `/_astro/`: são arquivos gerados pelo build. Rode o build e procure
  o nome base (antes do hash) nos imports do projeto.
- URLs de outros domínios: scripts de terceiros, fontes externas ou embeds.
  Procure o domínio no código.

### 4. Classificar cada auditoria

Monte uma tabela com uma linha por auditoria reprovada, na ordem do
`report.json`, com estas colunas: auditoria, estratégias afetadas, escopo,
arquivo, correção e efeito esperado.

Use quatro escopos:

| Escopo | Significado | Como agir |
| --- | --- | --- |
| Página | Muda só o arquivo da rota ou conteúdo dela | Aplique |
| Componente | Muda componente usado em outras páginas | Aplique e liste as páginas afetadas |
| Global | Muda layout base, `astro.config.*`, dependências ou tokens de design | Mostre a mudança e peça confirmação antes |
| Fora do código | Servidor, CDN, cabeçalhos de cache, DNS, conteúdo de terceiros | Não altere; descreva o ajuste no relatório |

Consulte `references/astro-correcoes.md` para a correção de cada ID de
auditoria. Auditoria sem item e sem orientação clara entra como pendência
explicada, sem correção inventada.

### 5. Aplicar as correções

Aplique as linhas de escopo Página e Componente. Para o escopo Global, mostre
o diff proposto e aguarde a resposta da pessoa.

Siga estas regras ao editar:

- Respeite o design system e as skills de design do projeto. Ajuste de
  contraste, tamanho de alvo ou espaçamento muda a aparência: use os tokens
  existentes e mostre o antes e depois do valor.
- Não remova conteúdo, seção, funcionalidade, analytics ou consentimento de
  cookies para ganhar nota. Quando a única saída for remover, pergunte.
- Não adicione dependência sem confirmação.
- Prefira os recursos nativos do Astro (`astro:assets`, diretivas `client:*`,
  `build.inlineStylesheets`, prefetch) a soluções manuais.
- Documente o código alterado conforme as regras do projeto.

### 6. Validar localmente

Rode o build do projeto (`npm run build` ou o script equivalente) e, se
existir, `astro check` e a suíte de testes. Corrija o que quebrar antes de
seguir. Abra o HTML gerado em `dist/` para conferir o resultado das mudanças
no `<head>`, nas imagens e nos scripts.

### 7. Medir de novo

O PageSpeed Insights só mede URL pública. Quando a pessoa tiver uma URL de
preview com as mudanças publicadas, rode:

```bash
pagespeedfy run <url-de-preview> --print path
pagespeedfy compare <report-da-linha-de-base> <report-novo>
```

Sem preview, entregue as mudanças e informe o comando de comparação para
depois da publicação. Não faça deploy, commit nem push por conta própria.

As notas de laboratório variam entre execuções. Diferença de até 5 pontos em
Performance pode ser ruído. Para conclusões, compare métricas e a lista de
auditorias resolvidas, não só a nota.

### 8. Relatório final

Entregue em Markdown:

1. URL, data da medição e caminho do `report.json` de base.
2. Notas e métricas por estratégia, antes e depois quando houver remedição.
3. Tabela de auditorias com a correção aplicada, o arquivo e o resultado.
4. Mudanças em componentes compartilhados e as páginas que elas alcançam.
5. Itens de escopo Global aguardando confirmação.
6. Itens fora do código, com o ajuste recomendado para servidor ou CDN.
7. Verificações manuais de `manualAudits`.
8. Dados de campo do CrUX, lembrando que eles refletem 28 dias de usuários
   reais e só mudam depois desse período.

## Limites

- Uma URL por execução. Para outra página, comece de novo pelo passo 1.
- A skill não altera configuração de hospedagem nem de CDN.
- A skill não grava, lê nem exibe a API key.
