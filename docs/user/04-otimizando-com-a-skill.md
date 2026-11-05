# Otimizar uma página com a skill

A skill leva um agente de programação da medição à correção de uma página
Astro. Ela usa o CLI para medir e trabalha no código do projeto aberto no
agente.

## Instalação

Copie a pasta da skill para o projeto Astro:

```bash
cp -R "$(npm root -g)/@promovaweb/pagespeedfy/.codex/skills/pagespeedfy-otimizar-pagina" <projeto>/.codex/skills/
```

Use `.claude/skills/` no Claude Code ou `.agents/skills/` quando o projeto
adotar essa pasta. A skill precisa do CLI instalado e de uma chave gravada
com `pagespeedfy auth login`.

## Acionamento

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

Informe uma URL. Com várias, a skill pede que você escolha uma e lista as
outras para depois.

## O que a skill faz

1. Confere o CLI, a chave, o projeto Astro e o estado do Git.
2. Coloca `pagespeedfy-reports/` no `.gitignore`.
3. Mede a página com `pagespeedfy run <url> --print path`.
4. Lê todos os relatórios: o `report.json`, os dois JSON brutos e as
   medições anteriores da mesma rota, para separar problemas recorrentes dos
   novos.
5. Acha a rota em `src/pages/`, o layout, os componentes e os arquivos de
   origem de cada item reprovado, sem alterar nada.
6. Cria o plano de correções em `plano.md`, na pasta da medição, com uma
   linha por auditoria: escopo, arquivo, correção proposta e efeito esperado.
7. **Mostra o plano na tela e espera você dizer que pode corrigir.**
8. Aplica só as linhas autorizadas e atualiza o status de cada uma no plano.
9. Roda o build e os testes do projeto.
10. Mede de novo quando houver URL de preview e compara com a linha de base.
11. Entrega o relatório final.

## O plano de correções

O plano é o ponto de controle da skill. Nenhum arquivo do projeto muda antes
da sua resposta. Você pode:

- autorizar o plano inteiro;
- autorizar só algumas linhas, por número, ou só alguns escopos;
- pedir ajustes. A skill atualiza o `plano.md`, mostra a nova versão e
  pergunta de novo.

A resposta fica registrada na seção "Autorização" do `plano.md`. Se durante a
correção aparecer uma mudança que não estava no plano, a skill acrescenta a
linha e pede autorização outra vez.

Cada linha recebe um de quatro escopos:

| Escopo | Exemplo |
| --- | --- |
| Página | Imagem de capa sem `<Image>` na própria rota |
| Componente | Botão do header sem nome acessível, usado em várias páginas |
| Global | `build.inlineStylesheets` no `astro.config.mjs` |
| Fora do código | Cabeçalho de cache da CDN |

## O que a skill não faz

- Não mede mais de uma página por execução.
- Não pede nem mostra a API key.
- Não altera o projeto antes de você autorizar o plano.
- Não faz deploy, commit nem push.
- Não altera hospedagem, CDN ou DNS.
- Não remove conteúdo, funcionalidade ou analytics para ganhar nota sem
  perguntar.

## Referências da skill

- `references/leitura-relatorio.md`: todos os campos do `report.json` e como
  consultar o JSON bruto.
- `references/astro-correcoes.md`: correção recomendada para cada ID de
  auditoria de Performance, Acessibilidade, Boas práticas e SEO.
- `references/modelo-plano.md`: estrutura do `plano.md`.
