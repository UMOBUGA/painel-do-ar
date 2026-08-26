# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O projeto

Painel do ar: índice de qualidade do ar hora a hora para as 27 capitais brasileiras, com histórico de 48h e funcionamento offline. React 18 + TypeScript + Vite no frontend; a leitura ao vivo de uma cidade continua vindo direto do cliente para a Open-Meteo, sem servidor no meio. Um backend em `api/` (Vercel Functions + Postgres/Drizzle) existe só para o que o cliente não consegue fazer sozinho: comparar as 27 capitais de uma vez (ranking nacional) e um histórico mais longo que a API pública expõe por requisição (tendência de 30 dias).

O README.md documenta o raciocínio por trás de cada decisão técnica (por que IndexedDB e não localStorage, por que roving tabindex no HourStrip, por que o gráfico é lazy-loaded, por que o ranking tem um cron em vez de buscar as 27 cidades ao vivo, etc.) — leia antes de propor mudanças arquiteturais para não repetir uma alternativa já descartada.

## Comandos

```bash
npm run dev              # servidor de dev (Vite + middleware que serve /api/*)
npm run build             # tsc -b && vite build → dist/
npm run typecheck         # tsc -b --noEmit
npm run lint               # eslint .
npm run format              # prettier --write .
npm test                    # vitest run (todos os testes, uma vez)
npm run test:watch          # vitest em modo watch
npm run test:coverage       # vitest run --coverage
npm run db:generate          # gera migração SQL a partir de api/_lib/schema.ts
npm run db:migrate            # aplica migrações (só necessário com DATABASE_URL real)
```

Rodar um único teste ou arquivo: `npx vitest run src/test/aqi.test.ts` ou `npx vitest run -t "nome do teste"`. Testes em `api/` rodam em ambiente Node (não jsdom) via `environmentMatchGlobs` em `vite.config.ts` — mesmo comando, o Vitest escolhe o ambiente pelo caminho do arquivo.

O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda typecheck, lint, test:coverage e build nessa ordem a cada push/PR — rode a mesma sequência localmente antes de considerar uma mudança pronta. Há um hook de pre-commit (Husky + lint-staged) que já roda ESLint/Prettier nos arquivos staged.

## Arquitetura

**Fluxo de dados**: `useCityFromUrl` (estado da cidade na querystring `?cidade=`) → `useAirQuality` (TanStack Query) → `fetchAirQuality` ([src/lib/api.ts](src/lib/api.ts)) busca na rede; em caso de falha cai para `readSeries` do IndexedDB ([src/lib/db.ts](src/lib/db.ts)); em sucesso grava no cache via `writeSeries` sem esperar (`void writeSeries`). O componente `App.tsx` nunca fala com a rede ou o cache diretamente — só consome o hook.

**Regra de negócio isolada**: [src/lib/aqi.ts](src/lib/aqi.ts) é o único lugar que sabe converter concentração (µg/m³) em IQA e faixa. É TypeScript puro, sem I/O e sem React — testado à parte em [src/test/aqi.test.ts](src/test/aqi.test.ts). Qualquer mudança nas faixas EPA ou na lógica de poluente dominante (`aggregateAqi`) deve passar por esse arquivo, não ser duplicada em componentes.

**Ausência de dado é `null`, nunca `0`.** Isso vale em todo o pipeline — `toNumberOrNull` na normalização da API, `toAqi`/`aggregateAqi` no cálculo do índice. Um zero silencioso renderizaria como "qualidade boa", que é o bug mais perigoso possível aqui (estação fora do ar parecendo ar limpo).

**Cache é estritamente best-effort**: toda função em `src/lib/db.ts` engole exceções e devolve `null`/no-op. Nunca deixe um erro de IndexedDB propagar até a UI.

**Componentes de apresentação x lógica**: `src/components/` é apresentação pura recebendo `samples`/`sample` já normalizados; toda derivação (IQA, cor de faixa, formatação) é chamada inline a partir de `src/lib/`, não recalculada localmente. `HourStrip.tsx` e `HourlyTable.tsx` são os dois componentes com mais complexidade própria — o primeiro implementa roving tabindex (só o item selecionado tem `tabIndex=0`, setas/Home/End/PageUp/PageDown movem o foco), o segundo virtualiza com `@tanstack/react-virtual` e por isso declara papéis ARIA de grid manualmente (`role="grid"`/`"row"`/`"gridcell"`, `aria-rowcount`) já que a linha `absolute`-posicionada quebra a semântica de `<table>`.

**Code splitting**: `TrendChart` e `LongTermTrend` (ambos Recharts) são carregados via `React.lazy` em `App.tsx` porque Recharts responde por boa parte do bundle inicial. Não importe Recharts fora desse limite lazy.

**Erro de render não derruba a tela**: `ErrorBoundary` ([src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx)) envolve `<App />` em `main.tsx`. É o único ponto pensado para plugar um serviço externo de monitoramento (ex.: Sentry) no futuro — não existe integração real hoje, só o ponto de extensão.

## Backend (`api/`)

Convenção de arquivo do Vercel: cada `.ts` em `api/` vira uma função serverless; `api/_lib/` (prefixo `_`) é ignorado como rota e guarda código compartilhado. Handlers são funções Node puras `(req, res) => Promise<void>` ([api/_lib/http.ts](api/_lib/http.ts)) que não dependem de `req.query`/augmentações do Vercel — extraem path e query manualmente com `new URL(req.url, ...)`. Isso é o que permite o mesmo arquivo rodar idêntico em produção e no dev local.

**Três rotas**: `api/ranking.ts` (snapshot mais recente de cada capital, ordenado por IQA), `api/history/[cityId].ts` (últimos N dias de uma capital) e `api/cron/snapshot.ts` (job diário protegido por `CRON_SECRET` que popula a tabela `daily_snapshots` para as 27 capitais — ver `crons` em `vercel.json`). As duas rotas de leitura só fazem `SELECT`; quem escreve é sempre o cron.

**Banco**: `api/_lib/db.ts` escolhe o driver por `DATABASE_URL` — com a variável definida usa Postgres real (`drizzle-orm/postgres-js`); sem ela usa PGlite (Postgres embutido em WASM, `drizzle-orm/pglite`) num arquivo local, migrando automaticamente. Em teste (`process.env.VITEST`), PGlite roda em memória (`memory://`) em vez de arquivo — cada arquivo de teste é um worker separado, e um arquivo compartilhado causaria disputa entre eles. **Não** assuma Postgres real disponível ao escrever testes; use `getDb()` normalmente e ele já resolve para PGlite.

**Reuso deliberado, com uma armadilha de import**: `api/_lib/aggregate.ts` chama `fetchAirQuality`/`aggregateAqi`/`CAPITALS` de `src/` via caminho relativo, não duplica a regra de negócio. Isso só funciona porque `src/lib/api.ts`, `src/lib/aqi.ts` e `src/data/capitals.ts` usam import relativo entre si — **não reintroduza `@/` nesses arquivos**: o Vercel empacota cada função de `api/` isoladamente e não conhece o alias do Vite, então um `@/` ali quebraria em produção sem quebrar em dev (o middleware do Vite resolve o alias, mascarando o problema localmente).

**Dev local**: `vite.api-plugin.ts` monta as três rotas acima como middleware do `vite dev`, via `server.ssrLoadModule` — é uma tabela explícita de 3 padrões, não um roteador genérico. `npm run dev` já serve `/api/*`; não precisa de `vercel dev`.

**Testes de `api/`**: rodam em ambiente Node (`environmentMatchGlobs` em `vite.config.ts`) contra PGlite real — nunca mockam o cliente de banco. `api/_lib/testHttp.ts` tem `mockReq`/`mockRes` para chamar os handlers diretamente sem precisar de um servidor HTTP de verdade.

## Testes (frontend)

MSW intercepta na camada HTTP ([src/test/mocks/handlers.ts](src/test/mocks/handlers.ts)), não mocka `fetch` nem o módulo `api.ts` — os testes exercitam a construção real da URL e a normalização da resposta. Os handlers padrão incluem respostas vazias para `/api/ranking` e `/api/history/:cityId`, porque `App.tsx` sempre renderiza essas seções — testes que não são sobre esse dado ainda precisam de uma resposta para não cair em "unhandled request". A fixture (`buildFixture`) é determinística (valor de cada hora depende só do índice, nunca do relógio).

Cada teste que renderiza a árvore usa `renderWithQuery` ([src/test/renderApp.tsx](src/test/renderApp.tsx)); para hooks isolados (`renderHook`), use `queryWrapper` do mesmo arquivo. Ambos criam um `QueryClient` novo por teste para não vazar cache entre casos.

**`vitest.setup.ts` tem uma correção não óbvia**: jsdom cria `AbortController`/`AbortSignal` num realm de VM diferente do `fetch` nativo do Node, e o Undici rejeita esse signal ("Expected signal to be an instance of AbortSignal") — trava qualquer `useQuery` que passe `signal` para `fetch`, silenciosamente (fica pendente para sempre). O setup envolve `globalThis.fetch` para nunca repassar esse signal estrangeiro adiante. **O wrap precisa acontecer depois de `server.listen()`**, porque o MSW substitui `globalThis.fetch` inteiro ao ativar a interceptação — envolver antes seria descartado. Isso é uma incompatibilidade do ambiente de teste (Node 24 + jsdom neste sandbox), não do código de produção; se for mexer nesse arquivo, não remova sem entender por que existe.

O mesmo `vitest.setup.ts` também faz polyfill de `ResizeObserver`, `matchMedia` e dimensões de elemento (necessários para Recharts/TanStack Virtual no jsdom) — guardados por `typeof HTMLElement !== 'undefined'` porque o mesmo setup roda para os testes de `api/`, em ambiente Node puro, onde `HTMLElement` não existe.

## Convenções

**Alias de import**: `@/` aponta para `src/` (configurado em `vite.config.ts` e nos tsconfigs) — mas só dentro de `src/`. Arquivos em `api/` usam caminho relativo (ver seção Backend acima).

**Git**: o repositório foi inicializado nesta sessão; não havia `.git` antes, apesar do CI/vercel.json já existentes. Identidade local configurada para `GustavoLopes79` / `gustavolopes7979@gmail.com`, igual ao config global do usuário.
