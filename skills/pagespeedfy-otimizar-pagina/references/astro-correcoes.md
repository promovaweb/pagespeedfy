# Correções por auditoria em projetos Astro

Use esta tabela depois de localizar o arquivo da página. Os IDs seguem o
Lighthouse usado pelo PageSpeed Insights. Versões recentes trocaram várias
auditorias antigas por **insights** (sufixo `-insight`). As duas famílias
aparecem aqui porque relatórios diferentes podem trazer uma ou outra.

Antes de aplicar uma correção que depende de recurso do Astro, confira a
versão em `package.json`. Quando o recurso não existir na versão instalada,
use a alternativa indicada e não atualize o Astro sem confirmação.

## Performance: imagens

| Auditoria | Correção no Astro |
| --- | --- |
| `image-delivery-insight`, `modern-image-formats`, `uses-optimized-images` | Troque `<img>` por `<Image>` ou `<Picture>` de `astro:assets`, com a imagem importada de `src/`. Em `<Picture>`, use `formats={["avif", "webp"]}`. Imagens em `public/` não passam pela otimização: mova para `src/assets/` |
| `uses-responsive-images`, `image-size-responsive` | Defina `widths` e `sizes` em `<Image>` conforme a largura real no layout. Nas versões com imagens responsivas, use `layout="constrained"` ou `layout="full-width"` |
| `offscreen-images` | Mantenha `loading="lazy"` (padrão do `<Image>`) para imagens abaixo da primeira dobra |
| `lcp-discovery-insight`, `prioritize-lcp-image` | Na imagem de LCP, use `priority` quando a versão aceitar. Sem ela, use `loading="eager"`, `decoding="sync"` e `fetchpriority="high"`. Se a imagem vier de CSS `background-image`, troque por `<Image>` no HTML ou adicione `<link rel="preload" as="image">` no `<head>` da página |
| `unsized-images`, `cls-culprits-insight` (imagem) | Garanta `width` e `height` ou `aspect-ratio` em toda imagem. `<Image>` com import local preenche as dimensões sozinho |

## Performance: CSS, fontes e renderização

| Auditoria | Correção no Astro |
| --- | --- |
| `render-blocking-insight`, `render-blocking-resources` | Para CSS pequeno, avalie `build.inlineStylesheets: "always"` em `astro.config.*` (escopo Global). Mova CSS usado só por uma seção para o componente dela, para o Astro dividir o arquivo. Fontes do Google: carregue com `preconnect` e `display=swap` ou hospede localmente |
| `unused-css-rules` | Remova imports globais de CSS que a página não usa. Em Tailwind, confira se o `content`/`@source` não inclui pastas demais. Prefira `<style>` com escopo no componente |
| `unminified-css`, `unminified-javascript` | O build do Astro já minifica. Se aparecer, o arquivo vem de `public/` ou de `is:inline`: mova para `src/` e importe |
| `font-display-insight`, `font-display` | Use `font-display: swap` (ou `optional` para fontes decorativas) em cada `@font-face`. Com `@fontsource`, a opção já vem no CSS. Nas versões com a API de fontes do Astro, configure por ela |
| `cls-culprits-insight` (fonte) | Faça preload só da fonte do texto principal (`<link rel="preload" as="font" type="font/woff2" crossorigin>`). Ajuste a fonte de fallback com `size-adjust`, `ascent-override` e `descent-override` |
| `lcp-breakdown-insight`, `lcp-phases-insight` | Leia qual fase domina. Atraso de carregamento: veja `lcp-discovery-insight`. Atraso de renderização: veja CSS e JavaScript acima. TTFB alto: veja `document-latency-insight` |
| `network-dependency-tree-insight`, `critical-request-chains` | Encurte cadeias: evite CSS que importa CSS, fonte chamada por CSS externo e scripts que carregam outros scripts. Use `preconnect` para no máximo duas origens críticas |
| `non-composited-animations` | Anime só `transform` e `opacity`. Troque animações de `top`, `left`, `width` ou `box-shadow` |
| `dom-size-insight`, `dom-size` | Pagine listas longas, carregue seções extensas sob demanda ou simplifique wrappers aninhados |
| `viewport-insight`, `viewport` | Garanta `<meta name="viewport" content="width=device-width, initial-scale=1">` no layout (escopo Global) |

## Performance: JavaScript

| Auditoria | Correção no Astro |
| --- | --- |
| `unused-javascript`, `bootup-time`, `mainthread-work-breakdown`, `total-blocking-time` | Revise as diretivas `client:*`. Componente sem interação não precisa de diretiva. Troque `client:load` por `client:visible` para o que está abaixo da dobra, `client:idle` para o que pode esperar e `client:media` para o que só existe em uma largura |
| `duplicated-javascript-insight`, `duplicated-javascript` | Procure duas versões da mesma biblioteca (`npm ls <pacote>`) ou o mesmo framework importado por ilhas diferentes |
| `legacy-javascript-insight`, `legacy-javascript` | Remova polyfills manuais e scripts em `public/` escritos para navegadores antigos |
| `third-parties-insight`, `third-party-summary` | Carregue scripts de terceiros depois da interação ou com `@astrojs/partytown` (`type="text/partytown"`), com confirmação. Troque embeds de vídeo por uma fachada com imagem que carrega o player no clique |
| `forced-reflow-insight` | No script do componente, agrupe leituras de layout (`offsetHeight`, `getBoundingClientRect`) antes das escritas de estilo |
| `inp-breakdown-insight`, `interaction-to-next-paint` | Divida handlers longos, adie trabalho com `requestIdleCallback` ou `scheduler.yield` quando disponível e evite re-render de ilhas inteiras |
| Uso de `<ClientRouter />` ou view transitions | Se a página não precisa de navegação animada, avalie remover do layout (escopo Global) |

## Performance: servidor e entrega

Estas linhas costumam ficar fora do código. Descreva o ajuste para a
hospedagem.

| Auditoria | O que fazer |
| --- | --- |
| `document-latency-insight`, `server-response-time` | Para páginas estáticas, confira se a rota é pré-renderizada (`export const prerender = true` em modo `server` ou `hybrid`). TTFB alto em página estática é CDN ou cache |
| `redirects`, `document-latency-insight` (redirect) | Ajuste links internos para a URL final e alinhe `trailingSlash` com a hospedagem |
| `uses-text-compression` | Ative Brotli ou gzip na hospedagem |
| `cache-insight`, `uses-long-cache-ttl` | Arquivos em `/_astro/` têm hash e aceitam `Cache-Control: public, max-age=31536000, immutable`. Em Cloudflare Pages e Netlify, isso vai em `public/_headers` (escopo Global) |

## Acessibilidade

| Auditoria | Correção |
| --- | --- |
| `color-contrast` | Use um token de cor do design system com contraste 4.5:1 (texto normal) ou 3:1 (texto grande). Mostre o valor antigo e o novo |
| `image-alt` | `alt` descritivo em imagens de conteúdo; `alt=""` em imagens decorativas. Em coleções, leia o `alt` do frontmatter |
| `button-name`, `link-name` | Texto visível ou `aria-label` em botões e links só com ícone |
| `label`, `label-content-name-mismatch` | `<label for>` associado a cada campo; o nome acessível contém o texto visível |
| `heading-order` | Ajuste o nível dos títulos sem pular níveis. Se a aparência precisar mudar, troque a classe, não o nível |
| `html-has-lang`, `html-lang-valid` | `lang` correto no `<html>` do layout (escopo Global) |
| `document-title` | `<title>` único por página, vindo das props do layout |
| `target-size` | Área de toque de pelo menos 24 por 24 px, com padding nos tokens existentes |
| `aria-*`, `list`, `listitem`, `definition-list` | Corrija atributos ARIA inválidos e a estrutura de listas |
| `tabindex`, `focus-order-semantics` | Remova `tabindex` positivo; use elementos nativos interativos |
| `landmark-one-main`, `region` | Um `<main>` por página, com o conteúdo dentro de landmarks |

## Boas práticas

| Auditoria | Correção |
| --- | --- |
| `errors-in-console` | Abra o item, ache o script que gera o erro e corrija a causa. Erros de terceiros vão para o relatório |
| `image-aspect-ratio` | `width` e `height` coerentes com a proporção real; `object-fit` no CSS |
| `deprecations`, `inspector-issues` | Atualize a API usada no script indicado |
| `third-party-cookies` | Registre o terceiro responsável. Não remova sem confirmação |
| `csp-xss`, `has-hsts`, `origin-isolation`, `clickjacking-mitigation` | Cabeçalhos de segurança: escopo Global ou fora do código |
| `valid-source-maps` | Só se aplica com source maps publicados. Mantenha `vite.build.sourcemap` desligado em produção ou publique mapas válidos |
| `is-on-https`, `redirects-http` | Hospedagem e DNS: fora do código |

## SEO

| Auditoria | Correção |
| --- | --- |
| `meta-description` | `<meta name="description">` único por página, via props do layout ou frontmatter |
| `document-title` | Ver Acessibilidade |
| `link-text` | Troque "clique aqui" e "saiba mais" por texto que descreva o destino |
| `crawlable-anchors` | Todo link com `href` real; nada de `href="#"` ou `javascript:` para navegação |
| `is-crawlable` | Confira `<meta name="robots">` e cabeçalho `X-Robots-Tag`. Página com `noindex` intencional fica como está |
| `canonical` | `<link rel="canonical">` absoluto para a própria URL final, com `site` definido em `astro.config.*` |
| `hreflang` | Alinhe com a configuração `i18n` do Astro |
| `http-status-code` | A URL precisa responder 200. Página 404 ou redirect é problema de rota |
| `robots-txt` | `public/robots.txt` válido ou gerado por endpoint |
| `structured-data` | Verificação manual: valide o JSON-LD da página |
