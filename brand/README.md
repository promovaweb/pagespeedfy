# Marca Pagespeedfy

O Pagespeedfy mede uma página no PageSpeed Insights e entrega o relatório para
uma skill corrigir o site Astro. Sua identidade combina o petróleo e o
turquesa da Promovaweb com verde, a cor que o PageSpeed usa para nota boa e
página rápida.

## Conceito visual

O símbolo é uma **página veloz**: a folha de um site, desenhada em turquesa,
com um **raio verde** recortado no centro. A composição mostra a página do
site que fica mais rápida depois das correções.

## Arquivos oficiais

| Arquivo | Uso |
| --- | --- |
| `logo/icon.svg` | ícone principal com placa petróleo |
| `logo/icon-light.svg` | ícone transparente sobre fundo claro |
| `logo/icon-dark.svg` | ícone transparente sobre fundo escuro |
| `logo/logo-light.svg` | assinatura horizontal sobre fundo claro |
| `logo/logo-dark.svg` | assinatura horizontal sobre fundo escuro |
| `logo/icon.png` | fallback raster de 512 × 512 px |
| `logo/icon-light.png`, `logo/icon-dark.png` | fallbacks raster de 512 × 512 px |
| `logo/logo-light.png`, `logo/logo-dark.png` | fallbacks raster de 1300 × 339 px |
| `logo/icon-16w.png` a `logo/icon-512w.png` | favicons e ícones de aplicativo |

Use a variante correspondente ao fundo. Preserve 12,5% de área livre ao redor
do ativo. O tamanho mínimo é 24 px para o ícone e 140 px para a assinatura.
O nome da assinatura está convertido em curvas (Manrope 750) e não depende da
fonte instalada.

## Sistema digital

- `colors/palette.json`: fonte editável da paleta;
- `tokens.json`: tokens agnósticos;
- `global.css`: webfontes, variáveis CSS e troca de tema;
- `tailwind-theme.js`: extensão para Tailwind CSS;
- `accessibility.md`: relatório de contraste;
- `typography/README.md`: hierarquia tipográfica;
- `manifest.json`: dimensão, função e hash de cada arquivo de logo;
- `style-guide.html`: guia visual com logo e paleta.

Para recompilar os tokens depois de editar a paleta, rode o gerador do
[Brandfy](https://github.com/promovaweb/brandfy):

```bash
node <brandfy>/skills/brandfy-design-tokens/scripts/generate-tokens.mjs \
  --input brand/colors/palette.json --output brand
```

## Regras para agentes

1. Use os ativos desta pasta sem redesenhá-los.
2. Verde indica velocidade, nota boa ou correção aplicada; turquesa
   identifica a família.
3. Estado nunca depende apenas de cor: inclua texto, ícone ou posição.
4. Use tokens semânticos e a variante correta para light ou dark mode.
5. Sobre fundo claro, o verde é `#15803D`; `#22C55E` fica para fundo escuro.
6. Não aplique filtros, gradientes, sombras, rotações ou deformações.
