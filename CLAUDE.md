# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O projeto

Painel do ar: índice de qualidade do ar hora a hora para as 27 capitais brasileiras, com histórico de 48h e funcionamento offline. React 18 + TypeScript + Vite, sem backend próprio — consome a API pública da Open-Meteo diretamente do cliente.

O README.md documenta o raciocínio por trás de cada decisão técnica (por que IndexedDB e não localStorage, por que roving tabindex no HourStrip, por que o gráfico é lazy-loaded, etc.) — leia antes de propor mudanças arquiteturais para não repetir uma alternativa já descartada.

## Comandos

```bash
npm run dev             # servidor de dev (Vite)
npm run build            # tsc -b && vite build → dist/
npm run typecheck        # tsc -b --noEmit
npm run lint              # eslint .
npm test                  # vitest run (todos os testes, uma vez)
npm run test:watch        # vitest em modo watch
npm run test:coverage     # vitest run --coverage
```

Rodar um único teste ou arquivo: `npx vitest run src/test/aqi.test.ts` ou `npx vitest run -t "nome do teste"`.

O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda typecheck, lint, test:coverage e build nessa ordem a cada push/PR — rode a mesma sequência localmente antes de considerar uma mudança pronta.

## Arquitetura

**Fluxo de dados**: `useCityFromUrl` (estado da cidade na querystring `?cidade=`) → `useAirQuality` (TanStack Query) → `fetchAirQuality` ([src/lib/api.ts](src/lib/api.ts)) busca na rede; em caso de falha cai para `readSeries` do IndexedDB ([src/lib/db.ts](src/lib/db.ts)); em sucesso grava no cache via `writeSeries` sem esperar (`void writeSeries`). O componente `App.tsx` nunca fala com a rede ou o cache diretamente — só consome o hook.

**Regra de negócio isolada**: [src/lib/aqi.ts](src/lib/aqi.ts) é o único lugar que sabe converter concentração (µg/m³) em IQA e faixa. É TypeScript puro, sem I/O e sem React — testado à parte em [src/test/aqi.test.ts](src/test/aqi.test.ts). Qualquer mudança nas faixas EPA ou na lógica de poluente dominante (`aggregateAqi`) deve passar por esse arquivo, não ser duplicada em componentes.

**Ausência de dado é `null`, nunca `0`.** Isso vale em todo o pipeline — `toNumberOrNull` na normalização da API, `toAqi`/`aggregateAqi` no cálculo do índice. Um zero silencioso renderizaria como "qualidade boa", que é o bug mais perigoso possível aqui (estação fora do ar parecendo ar limpo).

**Cache é estritamente best-effort**: toda função em `src/lib/db.ts` engole exceções e devolve `null`/no-op. Nunca deixe um erro de IndexedDB propagar até a UI.

**Componentes de apresentação x lógica**: `src/components/` é apresentação pura recebendo `samples`/`sample` já normalizados; toda derivação (IQA, cor de faixa, formatação) é chamada inline a partir de `src/lib/`, não recalculada localmente. `HourStrip.tsx` e `HourlyTable.tsx` são os dois componentes com mais complexidade própria — o primeiro implementa roving tabindex (só o item selecionado tem `tabIndex=0`, setas/Home/End/PageUp/PageDown movem o foco), o segundo virtualiza com `@tanstack/react-virtual` e por isso declara papéis ARIA de grid manualmente (`role="grid"`/`"row"`/`"gridcell"`, `aria-rowcount`) já que a linha `absolute`-posicionada quebra a semântica de `<table>`.

**Code splitting**: `TrendChart` (Recharts) é carregado via `React.lazy` em `App.tsx` porque respondia por boa parte do bundle inicial. Não importe Recharts fora desse limite lazy.

**Testes**: MSW intercepta na camada HTTP ([src/test/mocks/handlers.ts](src/test/mocks/handlers.ts)), não mocka `fetch` nem o módulo `api.ts` — os testes exercitam a construção real da URL e a normalização da resposta. A fixture (`buildFixture`) é determinística (valor de cada hora depende só do índice, nunca do relógio). Cada teste que renderiza a árvore usa `renderWithQuery` ([src/test/renderApp.tsx](src/test/renderApp.tsx)), que cria um `QueryClient` novo por teste para não vazar cache entre casos. `vitest.setup.ts` faz polyfill de `ResizeObserver`, `matchMedia` e dimensões de elemento — necessários para Recharts/TanStack Virtual no jsdom.

**Alias de import**: `@/` aponta para `src/` (configurado em `vite.config.ts` e nos tsconfigs).
