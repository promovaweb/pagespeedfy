# Otimizar uma página com a skill

A skill leva um agente de programação da medição à correção de uma página
Astro. Ela usa o CLI para medir e grava o resultado no histórico do projeto
aberto no agente.

## Instalação

Na raiz do projeto Astro, instale a skill direto do repositório no GitHub:

```bash
npx skills add https://github.com/promovaweb/pagespeedfy
```

O `npx skills` lê a pasta `skills/` do repositório e instala a skill nos
agentes escolhidos. A skill precisa do binário instalado e de uma chave no
cofre, gravada com `pagespeedfy credentials set pagespeed.api_key`.

## Acionamento

```text
Use $pagespeedfy-otimizar-pagina para otimizar https://promovaweb.com/blog/
```

Informe uma URL. Se você enviar várias, a skill pergunta qual medir agora e
lista as outras para depois.

## O que a skill faz

1. Confere o binário, a chave, o projeto Astro e o estado do Git.
2. Mede a linha de base com
   `pagespeedfy run <url> --samples 3 --note "baseline"`.
3. Lê a medição com `pagespeedfy report <url> --json` e o histórico com
   `pagespeedfy history <url> --json`, para separar auditorias recorrentes das
   novas.
4. Acha a rota em `src/pages/`, o layout, os componentes e os arquivos de
   origem de cada item reprovado, sem alterar nada.
5. Cria o plano de correções em `plano.md`, na pasta da medição dentro de
   `.pagespeedfy/reports/`, com uma linha por auditoria: escopo, arquivo,
   correção proposta e efeito esperado.
6. **Mostra o plano na tela e espera você dizer que pode corrigir.**
7. Aplica só as linhas autorizadas e atualiza o status de cada uma no plano.
8. Roda o build e os testes do projeto.
9. Mede de novo com
   `pagespeedfy run <url> --samples 3 --note "correções do plano"` e compara
   com `pagespeedfy compare <url> --json`.
10. Entrega o relatório final com as medições de antes e depois.

## O plano de correções

O plano é o ponto de controle da skill: nenhum arquivo do projeto muda antes
da sua resposta. Você pode:

- autorizar o plano inteiro;
- autorizar só algumas linhas, por número, ou só alguns escopos;
- indicar ajustes, para que a skill atualize o `plano.md`, mostre a nova
  versão e pergunte de novo.

A resposta fica registrada na seção "Autorização" do `plano.md`. Se durante a
correção aparecer uma mudança que não estava no plano, a skill acrescenta a
linha e aguarda sua autorização outra vez.

Cada linha recebe um de quatro escopos:

| Escopo | Exemplo |
| --- | --- |
| Página | Imagem de capa sem `<Image>` na própria rota |
| Componente | Botão do header sem nome acessível, usado em várias páginas |
| Global | `build.inlineStylesheets` no `astro.config.mjs` |
| Fora do código | Cabeçalho de cache da CDN |

## O que a skill não faz

- Não mede mais de uma página por execução.
- Não solicita nem mostra a API key.
- Não altera o projeto antes de você autorizar o plano.
- Não faz deploy, commit nem push.
- Não altera hospedagem, CDN ou DNS.
- Não remove conteúdo, funcionalidade ou analytics para ganhar nota sem
  perguntar.

## Referências da skill

- `references/leitura-relatorio.md`: todos os campos do JSON de `report` e
  como consultar o arquivo bruto.
- `references/astro-correcoes.md`: correção recomendada para cada ID de
  auditoria de Performance, Acessibilidade, Boas práticas e SEO.
- `references/modelo-plano.md`: estrutura do `plano.md`.
