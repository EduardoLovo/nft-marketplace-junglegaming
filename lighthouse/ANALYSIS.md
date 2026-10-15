# Análise da auditoria Lighthouse

Números em [`RESULTS.md`](RESULTS.md) (gerado por `npm run audit`). Configuração em [`config.json`](config.json) e script em [`../scripts/lighthouse.mjs`](../scripts/lighthouse.mjs).

## Resultado

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | **77** | 96 | 100 | 100 | 4,1 s | 0,001 | 0 ms |
| Início | desktop | 98 | 96 | 100 | 100 | 0,9 s | 0,004 | 0 ms |
| Detalhe | mobile | **77** | 100 | 100 | 100 | 4,2 s | 0,000 | 0 ms |
| Detalhe | desktop | 98 | 100 | 100 | 100 | 1,0 s | 0,000 | 0 ms |

Todas as metas foram atingidas, exceto **Performance no perfil mobile** (meta ≥ 90, mediana 77).

## O que foi feito

Primeira medição: Performance mobile 71–73, desktop do detalhe 86, CLS 0,171, SEO 92 e acessibilidade 96–97.

| Mudança | Efeito |
| --- | --- |
| `public/robots.txt` (o fallback da SPA devolvia o HTML) | SEO 92 → 100 |
| Área principal com altura mínima da tela: o footer não é empurrado quando o conteúdo chega | CLS do detalhe 0,171 → 0 |
| Pontos do carrossel com área de toque de 24px (visual de 12px mantido) | Acessibilidade do detalhe 97 → 100 |
| `tldts` substituído por uma versão mínima de `getDomain` (o MSW só usa isso, via tough-cookie, para cookies, e a API simulada não usa cookies) | Chunk do MSW: 175,6 → 63 KB gzip |
| `socket.io-client` carregado só ao conectar, e o app importado em paralelo com o worker do MSW | O app deixa de esperar o worker para começar a baixar |
| `modulepreload` dos chunks de inicialização no HTML (plugin no `vite.config.ts`) | Downloads em paralelo desde o início; TBT mobile 150–300 ms → 0 |

## Por que a Performance mobile fica abaixo de 90

Não há backend real: a API e o Socket.IO são simulados no próprio navegador pelo MSW, que o desafio exige (seção 7). Na inicialização, o app precisa:

1. baixar o MSW e os handlers;
2. registrar o service worker;
3. só então renderizar, para nenhuma requisição escapar dos mocks;
4. buscar os dados pelo worker e baixar as imagens.

No perfil mobile do Lighthouse (4G lento simulado, cerca de 1,6 Mbps, e CPU 4× mais lenta), cerca de **340 KB de JavaScript** precisam chegar antes da primeira tela. Esse total inclui React, roteador, TanStack Query, Zod (contratos e formulários) e o próprio MSW. FCP e LCP ficam em cerca de 4 s porque o download é o gargalo, não a execução (o TBT é 0).

Num produto real, a API ficaria no servidor e o MSW sairia do bundle (`VITE_ENABLE_MOCKS=false`), eliminando os 63 KB do worker, o registro do service worker e a espera antes de renderizar. O desktop, sem limitação de banda, fica em 98.

**Alternativas descartadas por mudarem a entrega só para melhorar a nota:**
- pré-renderizar o HTML das páginas;
- adiar o MSW e renderizar com dados fixos;
- remover imagens ou fontes.

A seção 10 pede que a auditoria carregue "as imagens, fontes e funcionalidades da entrega, sem simplificações exclusivas para melhorar a pontuação".

**Acessibilidade do início (96):** o único aviso é a área de toque dos três pontos do hero, que seguem o tamanho do Figma (7–8px). A nota está acima da meta (95).
