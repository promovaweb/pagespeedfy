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
2. Coloca `.pagespeedfy/` no `.gitignore`.
3. Mede a página com `pagespeedfy run <url> --print path`.
4. Lê o `report.json` inteiro e o JSON bruto das auditorias truncadas.
5. Acha a rota em `src/pages/`, o layout, os componentes e os arquivos de
   origem de cada item reprovado.
6. Classifica cada auditoria em Página, Componente, Global ou Fora do código.
7. Aplica as correções de Página e Componente; mostra o diff das Globais e
   espera sua resposta.
8. Roda o build e os testes do projeto.
9. Mede de novo quando houver URL de preview e compara com a linha de base.
10. Entrega o relatório final.

## O que a skill não faz

- Não mede mais de uma página por execução.
- Não pede nem mostra a API key.
- Não faz deploy, commit nem push.
- Não altera hospedagem, CDN ou DNS.
- Não remove conteúdo, funcionalidade ou analytics para ganhar nota sem
  perguntar.

## Referências da skill

- `references/leitura-relatorio.md`: todos os campos do `report.json` e como
  consultar o JSON bruto.
- `references/astro-correcoes.md`: correção recomendada para cada ID de
  auditoria de Performance, Acessibilidade, Boas práticas e SEO.
