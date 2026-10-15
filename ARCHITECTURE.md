# Arquitetura

Visão técnica da Kurio: organização, contratos REST e de eventos, sessão, carrinho, cache, tempo real, limitações, decisões de UX e desvios do Figma. Setup e comandos estão no [README](README.md).

## Organização

```
src/
  app/          inicialização: QueryClient, router, sincronia de sessão e de tempo real
  routes/       rotas por arquivo (TanStack Router): páginas e layouts
  features/     uma pasta por domínio: account, auth, cart, catalog, checkout,
                favorites, home, nft, wallets (api.ts, hooks, components, schemas)
  components/   layout (header, footer, menus) e componentes de UI (shadcn/Radix)
  contracts/    tipos e regras compartilhados entre o app e os mocks (a "API")
  lib/          cliente HTTP, sessão, ETH em precisão exata, tempo real e utilitários
  mocks/        backend simulado (MSW): handlers, domínio, fixtures, cenários e Socket.IO
tests/e2e/      Playwright: fluxos, falhas, tempo real, acessibilidade e regressão visual
lighthouse/     configuração, resultados e análise da auditoria
```

As responsabilidades se dividem assim:

- **Componentes:** não conhecem a API. Leem e escrevem pelos hooks de cada feature (TanStack Query).
- **Hooks:** chamam funções `api.ts` que usam um único cliente Axios (`lib/api/client.ts`).
- **Erros:** o cliente normaliza toda falha em `ApiError`, com código, mensagem, erros por campo e se é transitória.
- **Contratos:** `contracts/` é a única fonte dos tipos de requisição e resposta. Os handlers do MSW importam os mesmos tipos, então app e mock não divergem.
- **Mocks:** nenhum componente, hook ou cliente tem resposta fictícia ou caminho alternativo para eles. O MSW intercepta na camada de rede.

## Contratos REST

Base `VITE_API_BASE_URL` (padrão `/api`). JSON nos dois sentidos. Erros no formato `{ error: { code, message, fields? } }`.

| Código | HTTP | Uso |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Erros por campo |
| `UNAUTHORIZED` | 401 | Sessão ausente ou expirada |
| `FORBIDDEN` | 403 | Recurso de outra conta |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `CONFLICT` | 409 | Estoque, cupom, cotação ou idempotência |
| `SERVICE_UNAVAILABLE` / `SERVER_ERROR` | 503 / 500 | Falhas do servidor |

- **Autenticação:** `Authorization: Bearer <token>`.
- **Visitante:** o carrinho é identificado pelo cabeçalho `X-Cart-Id`, um UUID gerado e guardado no navegador.
- **Valores em ETH:** sempre strings decimais (`"1.19"`). Os cálculos usam BigInt em wei (`lib/eth.ts`), sem `number`.

| Método e rota | Descrição |
| --- | --- |
| `POST /auth/signup` · `POST /auth/login` | Cria conta ou entra. Retorna `{ token, expiresAt, user }` e mescla o carrinho de visitante (`X-Cart-Id`) |
| `GET /auth/session` · `POST /auth/logout` | Valida o token atual · encerra a sessão |
| `GET /nfts` | Catálogo paginado. Busca, abas, categorias, redes, faixa de preço, ordenação, coleção e `exclude`; retorna também as facetas |
| `GET /nfts/:id` · `GET /nfts/:id/reviews` | Detalhe com edições e versão · avaliações paginadas |
| `GET /cart` | Carrinho do usuário ou do visitante, com resumo calculado no servidor |
| `POST /cart/items` · `PATCH /cart/items/:editionId` · `DELETE /cart/items/:editionId` | Adiciona, altera a quantidade ou remove. Valida estoque e limite por pedido |
| `POST /cart/coupon` · `DELETE /cart/coupon` | Aplica ou remove cupom (válido, com mínimo ou expirado) |
| `POST /cart/acknowledge` | Aceita os novos preços dos itens alterados |
| `GET /favorites` · `PUT /favorites/:nftId` · `DELETE /favorites/:nftId` | Lista de interesse |
| `GET /me` · `PATCH /me` · `PUT /me/avatar` · `DELETE /me/avatar` · `POST /me/password` | Perfil, avatar e troca de senha (encerra as outras sessões) |
| `GET /wallets` · `POST /wallets` · `PATCH /wallets/:id` · `DELETE /wallets/:id` | Carteiras principal e secundárias. Endereço e tipo não mudam após o cadastro |
| `POST /wallets/:id/connect` · `POST /wallets/:id/disconnect` | Conexão simulada da extensão |
| `POST /checkout/quote` | Cotação do carrinho para uma carteira e rede: linhas, taxa, total e `expiresAt` (2 min) |
| `POST /orders` | Cria o pedido a partir da cotação, com o cabeçalho `Idempotency-Key` obrigatório (detalhes abaixo) |
| `GET /orders` · `GET /orders/:id` | Histórico e recibo (snapshot do pedido) |

**Criação do pedido (`POST /orders`):**

- A mesma chave com o mesmo corpo devolve o mesmo pedido; com outro corpo, devolve 409.
- O servidor revalida preço, estoque, cupom, taxa e conexão da carteira.
- Qualquer diferença em relação à cotação devolve 409 `{ fields: { quote } }`, e o cliente pede nova confirmação.

## Contratos de tempo real (Socket.IO)

O Socket.IO usa o caminho `/realtime`, só com o transporte WebSocket, e envia o token na query de conexão. Cada sessão tem sua conexão. Os eventos vêm num envelope comum:

```ts
{ id, type, resource: { type, id }, version, occurredAt, data }
```

| Evento | Destinatário | Dados |
| --- | --- | --- |
| `nft.updated` | Todos | `priceEth`, `status` e `editions[]` (`id`, `priceEth`, `available`) |
| `order.updated` | Só as conexões do dono do pedido | `status`, `txHash` e `rejectionReason` |

O `id` é estável (o mesmo evento reenviado tem o mesmo `id`). O `version` é a versão do recurso após a mudança. Um token inválido ou expirado fecha a conexão com o código 4401.

## Política de sessão

- **Onde fica:** token, expiração e dados públicos do usuário ficam em `localStorage` (`kurio:session`) e sobrevivem ao refresh. A senha nunca passa pelo app. Num backend real o token iria num cookie `httpOnly`.
- **Validação:** ao carregar, a sessão é validada com `GET /auth/session`.
- **Expiração:**
  - um timer encerra a sessão no `expiresAt` (30 min no mock), mesmo sem requisições;
  - um 401 numa requisição que levava o token atual também encerra a sessão; um 401 de um token já trocado é ignorado.
- **Ao expirar:**
  - **em rota protegida** (checkout, perfil, carteiras, favoritos, pedidos), o modal de login abre sobre a home com o aviso de sessão expirada e, depois de entrar, retoma a mesma página (`?auth=login&next=…&reason=expired`);
  - **em página pública**, o usuário continua nela.
- **Motivo do fim:** fica em `sessionStorage`, para o aviso não se perder num recarregamento.
- **Logout e troca de usuário:**
  - removem do cache todas as queries privadas (carrinho, favoritos, perfil, carteiras e pedidos), cujas chaves incluem o id do dono;
  - fecham a conexão Socket.IO da sessão anterior e abrem uma nova.
  
  Nenhum dado de uma conta aparece para outra.
- **Abas:** um evento `storage` sincroniza login e logout entre abas.

## Estado do carrinho

- **Fonte da verdade:** o servidor. Itens, quantidades, status por item, cupom e resumo (subtotal, desconto, taxa e total) vêm da API.
- **Visitante:** o carrinho tem um id próprio (`kurio:cart-id`). No login ou cadastro, o servidor mescla esse carrinho no da conta, respeitando estoque e limite por pedido.
- **Alterações otimistas:**
  - adicionar, alterar e remover aplicam a mudança no cache na hora e guardam um snapshot;
  - em erro, o snapshot volta (rollback) com aviso;
  - com várias alterações seguidas, só a resposta da última é aplicada ao cache, evitando que uma resposta antiga sobrescreva uma mais nova;
  - durante a sincronização, os totais ficam esmaecidos até o servidor recalcular.
- **Status por item:** `ok`, `price-changed` (mostra o preço anterior), `insufficient-stock` (oferece "Ajustar para N") e `unavailable`.
  - O checkout é bloqueado por falta de estoque.
  - Preço alterado é aceito em "Aceitar novos preços" (`POST /cart/acknowledge`) ou reconfirmado na revisão do pedido.
- **Após o pedido:** só os itens comprados saem do carrinho.

## Estratégia de cache (TanStack Query)

- **Chaves por domínio** (`catalogKeys`, `cartKeys`, `orderKeys`...). Dados privados incluem o dono (`useOwnerKey`: id do usuário ou `guest`).
- **Padrão:**
  - dados ficam frescos por 30s e são revalidados ao voltar o foco à janela ou ao reconectar;
  - `gcTime` de 5 min;
  - só falhas transitórias (rede, timeout, 429, 5xx) são repetidas, com backoff exponencial (até 2 tentativas);
  - mutations nunca são repetidas automaticamente.
- **Exceções:**
  - o carrinho tem `staleTime: 0`;
  - um pedido concluído (confirmado ou recusado) fica fresco para sempre; um pedido pendente é revalidado;
  - a criação do pedido repete até 3 vezes em falha transitória, com a mesma `Idempotency-Key`.
- **Catálogo:**
  - o estado da busca vive na URL (`?q=&categories=a,b&minPrice=&sort=&page=`), então voltar e recarregar restauram a tela;
  - a página anterior fica na tela enquanto a nova carrega;
  - respostas fora de ordem são descartadas pela chave da query.
- **Pré-carregamento:** os loaders das rotas começam a busca junto com a navegação, e passar o mouse ou focar um link pré-carrega a rota.

## Reconciliação entre REST e Socket.IO

O REST é a fonte da verdade, e o tempo real só acelera a atualização. Tudo isso acontece em `app/realtime-sync.ts`:

1. **Duplicados e eventos antigos:**
   - eventos com um `id` já visto são descartados;
   - eventos com `version` menor ou igual à já aplicada, ou à do cache, também; o estado nunca regride.
2. **`nft.updated`:**
   - atualiza no lugar o detalhe e as listagens em cache;
   - marca as listagens para refazer, porque filtros e ordenação por preço podem ter mudado;
   - revalida o carrinho que contém o NFT;
   - avisa o usuário só se a edição que está no carrinho mudou de preço ou ficou sem estoque suficiente.
3. **`order.updated`:**
   - atualiza o pedido aberto;
   - ao concluir, revalida carrinho e catálogo, porque estoque e itens comprados mudaram.
4. **Reconexão:** eventos podem ter sido perdidos durante a queda. Ao reconectar, catálogo, carrinho e pedidos visíveis são revalidados pela API.
5. **Checkout:**
   - com a revisão aberta, um `nft.updated` de um item invalida a cotação;
   - "Confirmar" fica bloqueado até "Atualizar valores", que pede nova cotação e mostra as diferenças;
   - no servidor, `POST /orders` ainda revalida tudo.

## Fluxo de compra

1. **Pagamento:** a carteira e a rede vêm das carteiras cadastradas, e é possível informar outra.
2. **"Confirmar compra":**
   - com a carteira desconectada, abre a autorização simulada da carteira; ao aprovar, segue sozinho;
   - em seguida pede a cotação e abre a revisão.
3. **Revisão:** "Confirmar compra" cria o pedido com a `Idempotency-Key` da cotação. Clique repetido, timeout ou retry nunca duplicam o pedido.
4. **Confirmação:** abre o modal sobre o pagamento (`/checkout?pedido=ord_…`), que sobrevive ao refresh e mostra os estados pendente, confirmado e recusado.
5. **Liquidação no mock:**
   - o pedido nasce pendente e é liquidado depois de `paymentDelayMs` (3s);
   - a liquidação é verificada a cada leitura e por um timer;
   - o resultado chega pelo `order.updated`.

## Backend simulado (MSW)

- **Estado:** um único estado consistente (catálogo, carrinhos, sessões, favoritos, carteiras e pedidos), persistido em `localStorage` (`kurio:mocks:db`, com versão de schema) para sobreviver ao refresh.
- **Reset:** `?scenario=<id>` (ou `window.__KURIO_MOCKS__.reset()`) restaura um cenário conhecido por completo.
- **Falhas:** por rota, configuráveis (HTTP com código, erro de rede, `times`), mais latência, respostas fora de ordem e modo offline. Os mesmos cenários servem ao desenvolvimento, à demonstração e aos testes.
- **Tempo real:** usa `@mswjs/socket.io-binding`, com heartbeat manual.
- **Ordem de carga:**
  - o app importa o `socket.io-client` só ao conectar, depois de o worker estar ativo, porque ele guarda a referência do `WebSocket` global ao carregar;
  - o resto do app baixa em paralelo com o worker, mas só é iniciado (validação da sessão, Socket.IO e renderização) depois dele, para nenhuma requisição escapar dos mocks.
- **Bundle:** o `tldts`, a lista de sufixos públicos que o MSW usa para cookies, é trocado por uma versão mínima. Isso reduz o MSW de 175 para 63 KB gzip, e a API não usa cookies.

## Limitações

- **Sem backend, blockchain ou extensão de carteira reais** (fora do escopo).
  - Endereços, `txHash` e "Ver no Etherscan" são simulados.
  - Os dados vivem no navegador: cada visitante do deploy tem o próprio estado.
- **Transporte do Socket.IO nos mocks** (`@mswjs/socket.io-binding`):
  - só WebSocket: o MSW não intercepta o long-polling, então o cliente usa `transports: ['websocket']`, sem fallback;
  - o binding não implementa o heartbeat do protocolo; o servidor simulado envia um ping manual a cada 20s;
  - o MSW remove o prefixo `/socket.io/` antes de casar a rota, por isso o caminho é `/realtime`;
  - o servidor vive na própria aba: eventos não passam entre abas nem entre visitantes;
  - o `socket.io-client` precisa ser carregado depois de o worker ativar, porque ele guarda a referência do `WebSocket` global.
- **Token em `localStorage`** e na query do Socket.IO. Num backend real seriam um cookie `httpOnly` e o `auth` do handshake.
- **Performance mobile 77 no Lighthouse** (meta 90): limitada pela banda, porque o MSW roda no navegador. A análise está em [lighthouse/ANALYSIS.md](lighthouse/ANALYSIS.md).
- **Login social, newsletter e itens de menu sem tela no Figma** (Criadores, Aprenda, Ofertas, Arquivos baixados, Suporte e o botão central "escanear" do menu mobile) mostram "Indisponível nesta demonstração", em vez de simular sucesso.
- **Imagens de referência da regressão visual:** valem só para o Linux (o do CI). Mesmo com as fontes do próprio projeto, Windows e Linux desenham o texto com larguras diferentes; por isso elas são geradas e comparadas na imagem Docker do Playwright (`npm run test:visual`).

## Decisões de UX

- **Login e cadastro:** abrem num modal sobre a página atual (`?auth=login`). Rotas protegidas abrem o modal sobre a última página pública e seguem para o destino depois de entrar. `/login` e `/signup` redirecionam para o modal.
- **Pagamento:**
  - a lista "Carteira e rede" mostra os aplicativos de carteira; escolher um seleciona a carteira cadastrada daquele aplicativo e preenche Rede, Endereço e Tipo;
  - "Usar outra carteira?" libera esses campos, e a carteira digitada é cadastrada ao confirmar;
  - no mobile, que não tem esses campos, um aplicativo sem carteira cadastrada leva a cadastrá-la em "Trocar carteira".
- **Confirmar compra:** com a carteira desconectada, abre a conexão automaticamente, em vez de exigir um passo separado.
- **Botão do resumo do carrinho:** "Conectar e finalizar" para visitantes e "Finalizar" para quem está logado.
- **Resumo do carrinho no mobile:** fixo no rodapé, e a página rola por trás dele.
- **Erros:** aparecem no próprio campo, com foco. Falhas de lista e de página oferecem "Tentar novamente". Mudanças de preço e estoque são avisadas e nunca aplicadas sem confirmação.
- **Acessibilidade:**
  - "Pular para o conteúdo", foco visível e foco devolvido ao fechar diálogos;
  - radios nativos nos seletores, anúncios `aria-live` de resultados e totais, áreas de toque de 24px no carrossel;
  - respeito a `prefers-reduced-motion`.
- **Responsivo:** abaixo de 1024px vale o layout mobile do Figma. Em 768px a grade do catálogo tem 3 colunas e a arte do detalhe fica quadrada. A barra de abas do Figma tem 414px: em telas mais estreitas (390px, 320px), os ícones ficam em posições proporcionais, com o botão central sempre sobre o recorte do fundo. Em 320px, equivalente a zoom de 400%, nada sai da tela.

## Desvios do Figma

1. **Selos "Raro" e "Esgotado" nos cards:** o Figma só tem "RARO" em um card do mobile. Mantidos para informar estado.
2. **Botão X nas telas mobile de login e cadastro:** o Figma não tem, mas sem ele não há como fechar.
3. **Mobile do login:**
   - o link para alternar entre login e cadastro é sublinhado, para ser identificável como link;
   - o placeholder de "Nome de usuário" fica alinhado à esquerda (no Figma está centralizado, diferente dos outros campos).
4. **Coração dos cards no mobile:** contornado quando não favoritado, para o estado ficar visível (no Figma é sempre preenchido).
5. **Texto "Edição aberta · máx. 10 por pedido" no detalhe:** só para leitores de tela. O limite continua no seletor de quantidade.
6. **Botão "−" da quantidade:** apagado quando a quantidade é 1 (estado desabilitado).
7. **Lupa sobre a arte do detalhe:** o Figma não define a ação; ela amplia a arte num diálogo.
8. **Detalhe mobile:** as abas de informação e "Mais desta coleção" ficam abaixo do painel, porque o frame mobile não as mostra.
9. **Edição dos itens fora da tela** (carrinho desktop, "Seus NFTs" e recibo): o Figma mostra só o ID do token, então a edição fica só para leitores de tela.
10. **Lixeira do carrinho:** na cor secundária (no Figma usa a cor padrão do ícone, invisível sobre o card). No mobile, remover fica no canto de cada card.
11. **"Colecionadores também viram" e footer no carrinho mobile:** mantidos para o conteúdo igual ao do desktop.
12. **Pagamento:**
    - "Conectar/Desconectar" abaixo da lista de carteiras (o desafio exige simular conexão, recusa e desconexão);
    - no mobile, que não tem formulário, nome e e-mail vêm do perfil e os campos extras só são exigidos no desktop;
    - todos os campos com asterisco são obrigatórios, inclusive o código de indicação;
    - "Nome ENS" é o domínio `.eth` que completa o "ENS ou carteira secundária".
13. **Confirmação:** o Figma desenha só o estado confirmado; "processando" e "recusado" usam o mesmo modal. No mobile, que não tem frame, ocupa a tela inteira.
14. **Perfil:**
    - "Atividade" leva ao histórico de pedidos;
    - "Apelido da carteira" edita a carteira principal;
    - a senha só muda quando os três campos são preenchidos.
15. **Carteiras:**
    - os campos do perfil aparecem só para leitura; "Código de indicação" mostra "Informado no pagamento";
    - a rede tem a opção "Ethereum e Polygon";
    - "Igual à carteira principal" remove as secundárias, com confirmação.
16. **Rótulos trocados no Figma:** "Contrato" e "Direitos autorais" aparecem invertidos na aba de detalhes; o app usa o conteúdo correto para cada rótulo.
17. **Imagens e dados:**
    - as miniaturas do detalhe são a arte inteira repetida, como no Figma, porque cada NFT tem uma só arte;
    - a logo é só o texto KURIO;
    - os textos de exemplo do Figma (descrições, preços) foram trocados pelos dados do catálogo simulado.
18. **Inconsistências do próprio Figma resolvidas pela maioria:** espaço entre nome e preço no início (6px), altura dos cards de promoção (o texto não cabe nos 250px) e posição dos pontos dos cards.
