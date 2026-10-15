# Kurio · NFT Marketplace

Marketplace de NFTs feito para o desafio de frontend da JungleGaming. Cobre descoberta (catálogo, busca, filtros e detalhe), compra (carrinho, pagamento com carteira e confirmação) e conta (perfil, carteiras, favoritos e pedidos), com versões desktop e mobile do [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

Não há backend real: a API REST e o Socket.IO são simulados no navegador pelo **MSW**, inclusive no deploy.

- **Aplicação publicada:** https://nft-marketplace-junglegaming.vercel.app
- **Repositório:** https://github.com/EduardoLovo/nft-marketplace-junglegaming
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/RESULTS.md](lighthouse/RESULTS.md) e [lighthouse/ANALYSIS.md](lighthouse/ANALYSIS.md)

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Tailwind CSS v4 · shadcn/ui (Radix) · React Hook Form + Zod · MSW (REST e Socket.IO via `@mswjs/socket.io-binding`) · Playwright · Lighthouse · oxlint

## Setup

Requisitos: **Node.js 20+** (desenvolvido com o Node 24) e npm. O Docker só é necessário para rodar a regressão visual fora do Linux.

```bash
npm install
npx playwright install chromium   # navegador dos testes E2E e da auditoria
cp .env.example .env              # opcional: os valores padrão já funcionam
npm run dev                       # http://localhost:5173
```

Os mocks sobem com a aplicação. Não é preciso nenhum serviço externo.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (MSW) e HMR |
| `npm run build` | Verificação de tipos e build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run typecheck` | Verificação de tipos (`tsc -b`) |
| `npm run lint` | Lint com oxlint |
| `npm run test:e2e` | Testes Playwright (desktop, tablet e mobile, mais a regressão visual) |
| `npm run test:e2e:ui` | Testes no modo interativo do Playwright |
| `npm run test:e2e:report` | Abre o último relatório HTML dos testes, com traces das falhas |
| `npm run test:visual` | Só a regressão visual (início, detalhe, carrinho e pagamento), no container Linux do Playwright (requer Docker) |
| `npm run test:visual:update` | Atualiza as imagens de referência após uma mudança visual intencional (também no Docker) |
| `npm run audit` | Build e auditoria Lighthouse (3 medições por página e perfil) |

Os testes E2E fazem o próprio build (`npm run build:e2e`) e o servem na porta 4173.

## Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | URL base da API REST (interceptada pelo MSW) |
| `VITE_ENABLE_MOCKS` | `true` | `false` desliga o MSW e o retira do bundle |
| `VITE_SOCKET_URL` | origem da página | Origem do servidor Socket.IO |
| `VITE_API_TIMEOUT_MS` | `10000` | Timeout das requisições REST, em ms |

O arquivo `.env.e2e` configura o build dos testes. Ele usa um timeout de 3s e o React de desenvolvimento, para que avisos do React no console façam o teste falhar.

## Credenciais fictícias

| Usuário | E-mail | Senha | Carteiras |
| --- | --- | --- | --- |
| Ana Souza | `ana@kurio.dev` | `Kurio@2026` | MetaMask "Principal" (Ethereum e Polygon) e Coinbase "Reserva" (Polygon) |
| Bruno Lima | `bruno@kurio.dev` | `Colecione#123` | WalletConnect "Principal" (Ethereum) |

Também é possível criar uma conta em "Entrar → Criar conta". As senhas ficam no backend simulado apenas como hash.

**Cupons** (aplicados no carrinho):
- `KURIO10`: 10% de desconto;
- `GENESIS15`: 15% em pedidos a partir de 3 ETH;
- `VERAO2025`: expirado.

**Carteiras para testar:** qualquer endereço `0x` com 40 caracteres hexadecimais (ex.: `0x1111222233334444555566667777888899990000`). A conexão é uma simulação da extensão da carteira: aprovar conecta e rejeitar recusa.

## Cenários dos mocks

O estado do backend simulado (catálogo, carrinhos, sessões, carteiras e pedidos) fica no `localStorage`, para sobreviver ao refresh.

**Escolher um cenário:** acrescente `?scenario=<id>` a qualquer URL, por exemplo `http://localhost:5173/?scenario=slow-network`. O cenário é aplicado na carga e o parâmetro sai da URL.

**Reset:** `?scenario=default` restaura o cenário padrão por completo. Limpar o `localStorage` do site tem o mesmo efeito.

| Cenário | O que simula |
| --- | --- |
| `default` | Catálogo completo, latência baixa e nenhuma falha |
| `empty-catalog` | Nenhum NFT listado (estados vazios) |
| `catalog-error` | A listagem responde 500 até o cenário ser trocado |
| `catalog-flaky` | A listagem falha com 503 duas vezes e depois responde (retry) |
| `out-of-order` | Buscas alternam entre lentas e rápidas para a resposta antiga chegar por último |
| `slow-network` | Todas as respostas levam 2,5s (skeletons e estados de carregamento) |
| `payment-declined` | Os pedidos são recusados pela carteira após o processamento |
| `order-timeout` | O pedido é criado mas a resposta não chega; a nova tentativa com a mesma chave recupera o mesmo pedido |
| `wallet-connect-error` | A conexão com a carteira falha uma vez com 503 |
| `favorites-error` | Favoritar falha uma vez com 503 (rollback do update otimista) |
| `live-market` | A cada 8s um NFT muda de preço ou estoque (eventos `nft.updated`) |
| `offline` | Toda requisição falha com erro de rede |

**Controle pelo console:** `window.__KURIO_MOCKS__` expõe a mesma API que os testes usam:
- `reset('slow-network')`: troca de cenário;
- `setConfig({ latencyMs: 1500 })`: ajusta a configuração;
- `updateEdition('emerald-ape-042--open', { priceEth: '1.49', available: 1 })`: muda preço ou estoque;
- `expireSessions()`: expira as sessões;
- `dropRealtimeConnections()`: derruba o Socket.IO;
- `replayLastEvent({ stale: true })`: reenvia o último evento em tempo real.

## Como reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Erro e retry do catálogo | `/?scenario=catalog-error` mostra o erro com "Tentar novamente"; `/?scenario=catalog-flaky` se recupera sozinho |
| Respostas fora de ordem | `/?scenario=out-of-order` e digite rápido na busca: só o resultado do último termo aparece |
| Rede lenta e skeletons | `/?scenario=slow-network` e navegue entre catálogo, detalhe e carrinho |
| Sem conexão | `/?scenario=offline` mostra erros com opção de tentar de novo; o indicador de tempo real avisa a queda |
| Preço ou estoque mudando no carrinho | Com itens no carrinho, rode `window.__KURIO_MOCKS__.updateEdition('<edição>', { priceEth: '9.99' })`; o carrinho avisa e pede para aceitar os novos preços |
| Mudança durante o checkout | Abra a revisão do pedido e rode o `updateEdition` acima: a confirmação é bloqueada até atualizar os valores |
| Cotação vencida | A cotação vale 2 min; espere com a revisão aberta e confirme: os valores são recalculados para reconfirmar |
| Pagamento recusado | `/?scenario=payment-declined`, faça uma compra: o pedido termina recusado e o carrinho é mantido |
| Timeout ao criar o pedido | `/?scenario=order-timeout`: a nova tentativa recupera o mesmo pedido, sem duplicar |
| Clique repetido em confirmar | Clique duas vezes em "Confirmar compra" na revisão: um único pedido é criado (Idempotency-Key) |
| Carteira recusa ou falha | No pagamento, "Rejeitar" na janela da carteira; ou `/?scenario=wallet-connect-error` |
| Sessão expirada | Logado, rode `window.__KURIO_MOCKS__.expireSessions()` e navegue: o login abre com o aviso de sessão expirada e retoma a página |
| Queda do tempo real | `window.__KURIO_MOCKS__.dropRealtimeConnections()`: o cliente reconecta e reconcilia com a API |
| Favoritar com falha | `/?scenario=favorites-error` e favorite um NFT: o coração volta ao estado anterior com aviso |
| Validação de formulários | Cadastro, perfil, senha e carteiras mostram erros do cliente e da API (ex.: e-mail já cadastrado, endereço de carteira repetido) |

Todos esses fluxos têm testes automatizados em `tests/e2e/`.

## Testes

- **E2E (Playwright, Chromium):**
  - desktop em 1440px roda todos os testes;
  - tablet em 768px e mobile em 390px rodam os fluxos principais (`@main`);
  - a REST passa pelos handlers MSW, e o tempo real pelo cliente Socket.IO real.
- **Regressão visual:**
  - início, detalhe, carrinho e pagamento, no desktop e no mobile;
  - as imagens de referência ficam versionadas em `tests/e2e/visual.spec.ts-snapshots/`, com dados estáveis (cenário padrão e carrinho fixo);
  - são geradas no Linux, na imagem Docker oficial do Playwright: cada sistema operacional desenha o texto com larguras um pouco diferentes, a ponto de mudar quebras de linha. Fora do Linux, `npm run test:e2e` pula esses testes, e `npm run test:visual` os roda no container.
- **Relatório:** `playwright-report/`, com trace, vídeo e captura das falhas.
- **CI (GitHub Actions, [`.github/workflows/ci.yml`](.github/workflows/ci.yml)):** a cada push e pull request roda tipos, lint e build, e depois toda a suíte E2E no Linux, inclusive a regressão visual. O relatório do Playwright fica como artefato da execução.

## Deploy

Vercel, com o build `npm run build` e a saída `dist/`. O `vercel.json` reescreve todas as rotas para o `index.html`, então o acesso direto e o refresh funcionam em qualquer rota. Os mocks e o tempo real rodam no navegador, também na versão publicada.
