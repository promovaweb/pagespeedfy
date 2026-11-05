---
name: pagespeedfy-otimizar-pagina
description: Mede uma única página com o CLI do Pagespeedfy, lê todos os relatórios da rota, cria e exibe um plano de correções e só altera o projeto Astro depois da autorização da pessoa.
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
5. Garanta que `pagespeedfy-reports/` esteja no `.gitignore` do projeto. Os
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

### 2. Ler todos os relatórios

Leia `references/leitura-relatorio.md` e depois **todos** os arquivos da
pasta da medição, sem pular nenhum:

- `report.json`, das duas estratégias;
- `mobile.raw.json` e `desktop.raw.json`, para conferir cada auditoria
  reprovada e completar os itens que o `report.json` cortou
  (`truncated: true`);
- `report.md`, só como conferência do resumo.

Depois liste as medições anteriores da mesma rota, nas pastas irmãs de
`pagespeedfy-reports/<host>/<rota>/`, e leia o `report.json` de cada uma.
Use o histórico para separar auditorias recorrentes das novas e para saber se
uma correção anterior já foi tentada. Quando houver mais de uma medição, rode
`pagespeedfy compare` entre a mais antiga e a atual.

Para cada estratégia, registre:

- `runtimeError`: quando preenchido, a medição falhou. Relate e pare.
- `runWarnings`: avisos que afetam a confiança na medição, como redirecionamento
  ou página lenta demais.
- `scores`, `labMetrics` e `field` (CrUX de página e de origem).
- Cada item de `failedAudits`, com todos os `items`, conferidos no JSON bruto.
- `manualAudits`, que vão para o plano como verificação humana.

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

Nesta etapa, só leia. Não altere nenhum arquivo do projeto.

### 4. Criar o plano

Monte o plano com o modelo de `references/modelo-plano.md` e grave em
`plano.md`, na pasta da medição, ao lado do `report.json`. O plano tem uma
linha por auditoria reprovada, na ordem do `report.json`, e diz para cada uma:
estratégias afetadas, escopo, arquivo, correção proposta e efeito esperado.

Use quatro escopos:

| Escopo | Significado |
| --- | --- |
| Página | Muda só o arquivo da rota ou conteúdo dela |
| Componente | Muda componente usado em outras páginas; liste as páginas afetadas |
| Global | Muda layout base, `astro.config.*`, dependências ou tokens de design |
| Fora do código | Servidor, CDN, cabeçalhos de cache, DNS, conteúdo de terceiros; só descreva o ajuste |

Consulte `references/astro-correcoes.md` para a correção de cada ID de
auditoria. Auditoria sem item e sem orientação clara entra como pendência
explicada, sem correção inventada.

### 5. Exibir o plano e aguardar autorização

Mostre o plano completo na tela, no chat, e não só o caminho do arquivo.
Termine com a pergunta: "Posso aplicar as correções deste plano?"

Pare e aguarde a resposta. Não altere arquivo do projeto antes de a pessoa
informar que pode corrigir. Esta regra vale mesmo em sessões com modo
automático, `/goal` ou `/loop`.

A pessoa pode:

- autorizar o plano inteiro;
- autorizar só algumas linhas ou só alguns escopos;
- pedir ajustes no plano. Nesse caso, atualize o `plano.md`, mostre a nova
  versão e pergunte de novo.

Registre a resposta no `plano.md`, na seção "Autorização", com a data e as
linhas autorizadas.

### 6. Aplicar as correções autorizadas

Aplique só as linhas autorizadas, na ordem do plano. Atualize a coluna
"Status" do `plano.md` a cada linha: `aplicada`, `não aplicada` (com o
motivo) ou `fora do código`.

Siga estas regras ao editar:

- Respeite o design system e as skills de design do projeto. Ajuste de
  contraste, tamanho de alvo ou espaçamento muda a aparência: use os tokens
  existentes e mostre o antes e depois do valor.
- Não remova conteúdo, seção, funcionalidade, analytics ou consentimento de
  cookies para ganhar nota. Quando a única saída for remover, pergunte.
- Não adicione dependência que o plano autorizado não listou.
- Prefira os recursos nativos do Astro (`astro:assets`, diretivas `client:*`,
  `build.inlineStylesheets`, prefetch) a soluções manuais.
- Documente o código alterado conforme as regras do projeto.

Se surgir uma correção que não estava no plano, acrescente a linha, mostre e
peça autorização antes de aplicar.

### 7. Validar localmente

Rode o build do projeto (`npm run build` ou o script equivalente) e, se
existir, `astro check` e a suíte de testes. Corrija o que quebrar antes de
seguir. Abra o HTML gerado em `dist/` para conferir o resultado das mudanças
no `<head>`, nas imagens e nos scripts.

### 8. Medir de novo

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

### 9. Relatório final

Entregue em Markdown e atualize o `plano.md` com o resultado:

1. URL, data da medição e caminhos do `report.json` e do `plano.md`.
2. Notas e métricas por estratégia, antes e depois quando houver remedição.
3. Tabela do plano com o status final de cada linha.
4. Mudanças em componentes compartilhados e as páginas que elas alcançam.
5. Linhas não autorizadas ou não aplicadas, com o motivo.
6. Itens fora do código, com o ajuste recomendado para servidor ou CDN.
7. Verificações manuais de `manualAudits`.
8. Dados de campo do CrUX, lembrando que eles refletem 28 dias de usuários
   reais e só mudam depois desse período.

## Limites

- Uma URL por execução. Para outra página, comece de novo pelo passo 1.
- Nenhuma correção sem plano exibido e autorizado pela pessoa.
- A skill não altera configuração de hospedagem nem de CDN.
- A skill não grava, lê nem exibe a API key.
