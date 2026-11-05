# PageSpeed Insights: https://promovaweb.com/

Gerado em 2026-11-05T14:49:34.961Z pelo Pagespeedfy 0.0.0. Locale pt-BR.

## Mobile

URL final: https://promovaweb.com/ · Lighthouse 13.6.0 · 2026-11-05T14:49:39.261Z

| Categoria | Nota |
| --- | --- |
| Performance | 100 |
| Acessibilidade | 93 |
| Boas práticas | 100 |
| SEO | 100 |

### Métricas de laboratório

| Métrica | Valor | Nota |
| --- | --- | --- |
| First Contentful Paint | 1.4 s | 98 |
| Largest Contentful Paint | 1.4 s | 100 |
| Total Blocking Time | 0 ms | 100 |
| Cumulative Layout Shift | 0 | 100 |
| Speed Index | 1.4 s | 100 |
| Time to Interactive | 1.4 s | 100 |

### Dados de campo (página): FAST

| Métrica | p75 | Classificação |
| --- | --- | --- |
| CUMULATIVE_LAYOUT_SHIFT_SCORE | 0 | FAST |
| EXPERIMENTAL_TIME_TO_FIRST_BYTE | 733 | FAST |
| FIRST_CONTENTFUL_PAINT_MS | 1562 | FAST |
| INTERACTION_TO_NEXT_PAINT | 126 | FAST |
| LARGEST_CONTENTFUL_PAINT_MS | 1620 | FAST |

### Dados de campo (origem): FAST

| Métrica | p75 | Classificação |
| --- | --- | --- |
| CUMULATIVE_LAYOUT_SHIFT_SCORE | 0 | FAST |
| EXPERIMENTAL_TIME_TO_FIRST_BYTE | 733 | FAST |
| FIRST_CONTENTFUL_PAINT_MS | 1562 | FAST |
| INTERACTION_TO_NEXT_PAINT | 126 | FAST |
| LARGEST_CONTENTFUL_PAINT_MS | 1620 | FAST |

### Auditorias pendentes (9)

#### `color-contrast` · Background and foreground colors do not have a sufficient contrast ratio.

- Categorias: Acessibilidade; peso 7; nota 0.
- Orientação: Low-contrast text is difficult or impossible for many users to read. Learn how to provide sufficient color contrast.
- Itens (4):
  - `div.row > div.col > article.home-pratica__card > span.home-pratica__numero` · `<span class="home-pratica__numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`

#### `target-size` · Touch targets do not have sufficient size or spacing.

- Categorias: Acessibilidade; peso 7; nota 0.
- Orientação: Touch targets with sufficient size and spacing help users who may have difficulty targeting small controls to activate the targets. Learn more about touch targets.
- Itens (6):
  - `div.blog-coverflow > ul.blog-coverflow__track > li.blog-coverflow__item > a.blog-coverflow__link` · `<a href="/blog/n8n-3-0-queue-mode/" draggable="false" class="blog-coverflow__link group flex h-full flex-col overflow-hi`
  - `div.blog-coverflow > ul.blog-coverflow__track > li.blog-coverflow__item > a.blog-coverflow__link` · `<a href="/blog/gostei-nao-gostei-n8n-3-0/" draggable="false" class="blog-coverflow__link group flex h-full flex-col over`
  - `div.blog-coverflow > ul.blog-coverflow__track > li.blog-coverflow__item > a.blog-coverflow__link` · `<a href="/blog/quando-migrar-n8n-3-0/" draggable="false" class="blog-coverflow__link group flex h-full flex-col overflow`
  - `div.blog-coverflow > ul.blog-coverflow__track > li.blog-coverflow__item > a.blog-coverflow__link` · `<a href="/blog/waf-cloudflare-tunnel-php/" draggable="false" class="blog-coverflow__link group flex h-full flex-col over`
  - `div.blog-coverflow > ul.blog-coverflow__track > li.blog-coverflow__item > a.blog-coverflow__link` · `<a href="/blog/vulnerabilidade-php-laravel/" draggable="false" class="blog-coverflow__link group flex h-full flex-col ov`
  - … mais 1 no report.json.

#### `render-blocking-insight` · Render-blocking requests

- Categorias: Performance; peso 0; nota 0.
- Resultado: Est savings of 1,210 ms.
- Economia estimada: LCP −1200 ms, FCP −1200 ms.
- Orientação: Requests are blocking the page’s initial render, which may delay LCP. Deferring or inlining can move these network requests out of the critical path.
- Itens (10):
  - https://promovaweb.com/_astro/global.B6C5i5GV.css · 1285 ms evitáveis · 58 KiB
  - https://promovaweb.com/_astro/Footer.BEmfrqH0.css · 162 ms evitáveis · 3 KiB
  - https://promovaweb.com/_astro/PricingThreeColumns.BqUc6Jl6.css · 322 ms evitáveis · 4 KiB
  - https://promovaweb.com/_astro/index.B7s_j6mY.css · 483 ms evitáveis · 4 KiB
  - https://promovaweb.com/_astro/WhatsAppFab.BKKVsN82.css · 483 ms evitáveis · 3 KiB
  - … mais 5 no report.json.

#### `unused-css-rules` · Reduce unused CSS

- Categorias: Performance; peso 0; nota 0.
- Resultado: Est savings of 56 KiB.
- Economia estimada: LCP −300 ms, FCP −300 ms.
- Orientação: Reduce unused rules from stylesheets and defer CSS not used for above-the-fold content to decrease bytes consumed by network activity. Learn how to reduce unused CSS.
- Itens (1):
  - https://promovaweb.com/_astro/global.B6C5i5GV.css · 56 KiB evitáveis

#### `network-dependency-tree-insight` · Network dependency tree

- Categorias: Performance; peso 0; nota 0.
- Orientação: Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load
- Itens (3):
  - {"value":{"longestChain":{"duration":594},"type":"network-tree","chains":{"0096A30491FDEABC4011E34AF6BB8873":{"transferSize":34913,"url":"https://promovaweb.com
  - {"description":"[preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints help the browser establish a connection earlie
  - {"type":"list-section","value":{"type":"text","value":"No additional origins are good candidates for preconnecting"},"title":"Preconnect candidates","descriptio

#### `cache-insight` · Use efficient cache lifetimes

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 4 KiB.
- Orientação: A long cache lifetime can speed up repeat visits to your page. Learn more about caching.
- Itens (1):
  - https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092 · 4 KiB evitáveis

#### `image-delivery-insight` · Improve image delivery

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 7 KiB.
- Orientação: Reducing the download time of images can improve the perceived load time of the page and LCP. Learn more about optimizing image size.
- Itens (1):
  - `nav.header__nav > a.brand-logo-text > picture > img.brand-logo-text__img` · `<img src="https://promovaweb.com/_imagens/b2c12dad07d53a7559ea-384.webp" alt="Logotipo Promovaweb." width="226" height="` · https://promovaweb.com/_imagens/b2c12dad07d53a7559ea-384.webp · 7 KiB evitáveis

#### `legacy-javascript-insight` · Legacy JavaScript

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 10 KiB.
- Orientação: Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren’t necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers. Learn why most sites can deploy ES6+ code without transpiling.
- Itens (1):
  - https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092 · 10 KiB evitáveis

#### `unused-javascript` · Reduce unused JavaScript

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 141 KiB.
- Orientação: Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. Learn how to reduce unused JavaScript.
- Itens (2):
  - https://www.googletagmanager.com/gtag/js?id=G-WY6VVS1DW4&cx=c&gtm=4e6b31 · 80 KiB evitáveis
  - https://www.googletagmanager.com/gtm.js?id=GTM-5D24GSW · 61 KiB evitáveis

### Verificações manuais (11)

- `custom-controls-labels`: Custom controls have associated labels
- `custom-controls-roles`: Custom controls have ARIA roles
- `focus-traps`: User focus is not accidentally trapped in a region
- `focusable-controls`: Interactive controls are keyboard focusable
- `interactive-element-affordance`: Interactive elements indicate their purpose and state
- `logical-tab-order`: The page has a logical tab order
- `managed-focus`: The user's focus is directed to new content added to the page
- `offscreen-content-hidden`: Offscreen content is hidden from assistive technology
- `structured-data`: Structured data is valid
- `use-landmarks`: HTML5 landmark elements are used to improve navigation
- `visual-order-follows-dom`: Visual order on the page follows DOM order

Auditorias aprovadas: 64. JSON bruto: `mobile.raw.json`.

## Desktop

URL final: https://promovaweb.com/ · Lighthouse 13.6.0 · 2026-11-05T14:49:58.918Z

| Categoria | Nota |
| --- | --- |
| Performance | 100 |
| Acessibilidade | 97 |
| Boas práticas | 100 |
| SEO | 100 |

### Métricas de laboratório

| Métrica | Valor | Nota |
| --- | --- | --- |
| First Contentful Paint | 0.3 s | 100 |
| Largest Contentful Paint | 0.3 s | 100 |
| Total Blocking Time | 0 ms | 100 |
| Cumulative Layout Shift | 0 | 100 |
| Speed Index | 0.7 s | 100 |
| Time to Interactive | 0.4 s | 100 |

### Dados de campo (página): FAST

| Métrica | p75 | Classificação |
| --- | --- | --- |
| CUMULATIVE_LAYOUT_SHIFT_SCORE | 0 | FAST |
| FIRST_CONTENTFUL_PAINT_MS | 1001 | FAST |
| INTERACTION_TO_NEXT_PAINT | 77 | FAST |
| LARGEST_CONTENTFUL_PAINT_MS | 1018 | FAST |

### Dados de campo (origem): FAST

| Métrica | p75 | Classificação |
| --- | --- | --- |
| CUMULATIVE_LAYOUT_SHIFT_SCORE | 0 | FAST |
| EXPERIMENTAL_TIME_TO_FIRST_BYTE | 437 | FAST |
| FIRST_CONTENTFUL_PAINT_MS | 898 | FAST |
| INTERACTION_TO_NEXT_PAINT | 66 | FAST |
| LARGEST_CONTENTFUL_PAINT_MS | 955 | FAST |

### Auditorias pendentes (7)

#### `color-contrast` · Background and foreground colors do not have a sufficient contrast ratio.

- Categorias: Acessibilidade; peso 7; nota 0.
- Orientação: Low-contrast text is difficult or impossible for many users to read. Learn how to provide sufficient color contrast.
- Itens (4):
  - `div.row > div.col > article.home-pratica__card > span.home-pratica__numero` · `<span class="home-pratica__numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`
  - `div.col > ol.home-pratica__linhas > li.home-pratica__linha > span.home-pratica__linha-numero` · `<span class="home-pratica__linha-numero" aria-hidden="true" data-astro-cid-5yclbk7l="">`

#### `render-blocking-insight` · Render-blocking requests

- Categorias: Performance; peso 0; nota 0.
- Resultado: Est savings of 250 ms.
- Economia estimada: LCP −250 ms, FCP −250 ms.
- Orientação: Requests are blocking the page’s initial render, which may delay LCP. Deferring or inlining can move these network requests out of the critical path.
- Itens (10):
  - https://promovaweb.com/_astro/global.B6C5i5GV.css · 340 ms evitáveis · 58 KiB
  - https://promovaweb.com/_astro/Layout.DA3F0zVC.css · 171 ms evitáveis · 5 KiB
  - https://promovaweb.com/_astro/WhatsAppFab.BKKVsN82.css · 171 ms evitáveis · 3 KiB
  - https://promovaweb.com/_astro/index.B7s_j6mY.css · 171 ms evitáveis · 4 KiB
  - https://promovaweb.com/_astro/PricingThreeColumns.BqUc6Jl6.css · 58 ms evitáveis · 4 KiB
  - … mais 5 no report.json.

#### `network-dependency-tree-insight` · Network dependency tree

- Categorias: Performance; peso 0; nota 0.
- Orientação: Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load
- Itens (3):
  - {"value":{"type":"network-tree","chains":{"B7EEFCE9AF01CC9AEA6E381ED61476C9":{"transferSize":34913,"isLongest":true,"children":{"2342.14":{"url":"https://promov
  - {"description":"[preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints help the browser establish a connection earlie
  - {"title":"Preconnect candidates","type":"list-section","value":{"type":"text","value":"No additional origins are good candidates for preconnecting"},"descriptio

#### `cache-insight` · Use efficient cache lifetimes

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 4 KiB.
- Orientação: A long cache lifetime can speed up repeat visits to your page. Learn more about caching.
- Itens (1):
  - https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092 · 4 KiB evitáveis

#### `image-delivery-insight` · Improve image delivery

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 5 KiB.
- Orientação: Reducing the download time of images can improve the perceived load time of the page and LCP. Learn more about optimizing image size.
- Itens (1):
  - `nav.header__nav > a.brand-logo-text > picture > img.brand-logo-text__img` · `<img src="/_imagens/b2c12dad07d53a7559ea-256.webp" alt="Logotipo Promovaweb." width="226" height="24" sizes="(min-width:` · https://promovaweb.com/_imagens/b2c12dad07d53a7559ea-256.webp · 5 KiB evitáveis

#### `legacy-javascript-insight` · Legacy JavaScript

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 10 KiB.
- Orientação: Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren’t necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers. Learn why most sites can deploy ES6+ code without transpiling.
- Itens (1):
  - https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092 · 10 KiB evitáveis

#### `unused-css-rules` · Reduce unused CSS

- Categorias: Performance; peso 0; nota 50.
- Resultado: Est savings of 55 KiB.
- Orientação: Reduce unused rules from stylesheets and defer CSS not used for above-the-fold content to decrease bytes consumed by network activity. Learn how to reduce unused CSS.
- Itens (1):
  - https://promovaweb.com/_astro/global.B6C5i5GV.css · 55 KiB evitáveis

### Verificações manuais (11)

- `custom-controls-labels`: Custom controls have associated labels
- `custom-controls-roles`: Custom controls have ARIA roles
- `focus-traps`: User focus is not accidentally trapped in a region
- `focusable-controls`: Interactive controls are keyboard focusable
- `interactive-element-affordance`: Interactive elements indicate their purpose and state
- `logical-tab-order`: The page has a logical tab order
- `managed-focus`: The user's focus is directed to new content added to the page
- `offscreen-content-hidden`: Offscreen content is hidden from assistive technology
- `structured-data`: Structured data is valid
- `use-landmarks`: HTML5 landmark elements are used to improve navigation
- `visual-order-follows-dom`: Visual order on the page follows DOM order

Auditorias aprovadas: 68. JSON bruto: `desktop.raw.json`.
