# Painel do ar

Índice de qualidade do ar hora a hora nas 27 capitais brasileiras, com histórico de 48 horas e funcionamento offline.

**[Ver online](https://painel-do-ar.vercel.app)** · React 18 · TypeScript · Vite

![Cobertura de testes](https://img.shields.io/badge/cobertura-96%25-2e7d5f)

---

## O problema que isso resolve

Os dados de qualidade do ar já existem e já são públicos — o problema nunca foi acesso, foi tradução. Eles chegam para o cidadão como uma concentração de PM2,5 em µg/m³, e ninguém decide se vai correr no parque olhando para um número desses. A pergunta real é bem mais simples: _dá para sair hoje ou não?_

Então o painel faz o trabalho de tradução: pega a concentração, converte em índice, o índice numa faixa (boa, moderada, ruim...) e a faixa numa frase que já responde à pergunta. Todo o resto da tela — o gráfico, a tabela, os cartões de poluente — existe para justificar essa frase, não para substituí-la.

## Como ele funciona, por dentro

Ao abrir o site, a cidade selecionada vem da URL (`?cidade=curitiba`), não de um roteador — é só um parâmetro que o próprio navegador já sabe compartilhar e voltar atrás. A partir daí o app tenta buscar a leitura mais recente direto na Open-Meteo. Se der certo, mostra o número e guarda uma cópia no IndexedDB do navegador. Se a rede falhar — sem conexão, API fora do ar — ele recorre a essa cópia salva e avisa que o dado é antigo, em vez de simplesmente mostrar uma tela de erro. A ideia por trás disso é simples: um dado de uma hora atrás ainda é mais útil do que nenhum dado.

Só uma coisa não vem direto da Open-Meteo: o ranking das 27 capitais e a tendência de 30 dias. Comparar todas as cidades ao vivo custaria 27 requisições paralelas a cada visita, então essa parte roda uma vez por dia num cron que grava os resultados num banco Postgres — e é o único momento em que este projeto realmente precisa de um servidor.

## Decisões que valem explicar

### Ausência de leitura nunca é zero

A conversão de concentração para índice ([`src/lib/aqi.ts`](src/lib/aqi.ts)) é código puro — sem React, sem chamada de rede — justamente para poder testar as faixas de perto: os limites, a interpolação entre eles, os vãos que a tabela da EPA deixa (9,05 µg/m³ de PM2,5, por exemplo, não cai em faixa nenhuma). Onze testes cobrem isso.

Uma regra guia tudo aqui: quando não há leitura, a função devolve `null`, nunca `0`. Um zero silencioso viraria "qualidade boa" na tela, e esse é exatamente o tipo de bug que só aparece em produção — no dia em que uma estação sai do ar.

### Por que IndexedDB e não localStorage

Uma série de uma cidade passa fácil de 100 KB, e `localStorage` é síncrono: ele travaria a thread principal bem na hora em que a lista virtualizada está rolando na tela. O IndexedDB ([`src/lib/db.ts`](src/lib/db.ts)) resolve isso por ser assíncrono e ter uma cota bem maior.

Toda leitura e escrita nesse cache está dentro de um `try/catch` que falha em silêncio. Aba anônima do Safari, cota estourada, storage bloqueado por política de empresa — são casos reais, e nenhum deles pode derrubar a tela. O cache aqui é uma otimização, não um requisito.

### A faixa de 48 horas dá para navegar só com o teclado

O elemento mais reconhecível do painel ([`src/components/HourStrip.tsx`](src/components/HourStrip.tsx)) são 48 barrinhas, uma por hora, coloridas pela faixa e com altura proporcional ao índice — dá para ver de relance se o ar piorou de madrugada ou no fim da tarde. Cada barra é um `<button>` de verdade, e passar por 48 paradas de `Tab` seria hostil, então o grupo usa o padrão de **roving tabindex**: só a barra selecionada entra na ordem de tabulação, as setas percorrem o resto, `Home`/`End` vão para as pontas e `PageUp`/`PageDown` pulam de 6 em 6 — o mesmo comportamento de um grupo de rádio. Seis testes cobrem essa navegação.

### O gráfico também é uma tabela, escondida

O SVG que o Recharts desenha é invisível para quem usa leitor de tela. Por isso a mesma série também vai para uma `<table>` escondida visualmente com `clip-path` (não `display: none`, que tiraria o conteúdo da árvore de acessibilidade também). É a alternativa não-visual que o WCAG pede, e não custa mais que dez linhas de código.

### A tabela horária é virtualizada

Com `@tanstack/react-virtual`, o DOM fica em torno de 12 linhas o tempo todo, não importa quantas horas a série tenha. O efeito colateral é que, como as linhas ficam posicionadas em `absolute`, uma `<table>` semântica deixa de funcionar — então os papéis ARIA de grid (`role="grid"`, `"row"`, `"gridcell"`) são declarados na mão, com `aria-rowcount` informando o total real de linhas, que é o número que o leitor de tela precisa anunciar.

### O gráfico só baixa quando alguém rola até ele

O Recharts sozinho respondia por 63% do bundle inicial. Colocá-lo atrás de um `React.lazy` tirou 385 KB do caminho crítico:

|                | Antes                | Depois                  |
| -------------- | -------------------- | ----------------------- |
| Bundle inicial | 611 KB (178 KB gzip) | **227 KB (72 KB gzip)** |
| Gráfico        | no bundle inicial    | sob demanda             |

Assim o número grande e a faixa de 48 horas — o que a pessoa realmente veio ver — aparecem antes de o gráfico sequer começar a baixar.

### O ranking nacional é o único dado que passa por um servidor

Como já falei acima, todo o resto desta tela é buscado direto do cliente para a Open-Meteo, de propósito, para o projeto não depender de infraestrutura própria. O ranking é a exceção que realmente precisa de uma: comparar 27 capitais ao vivo significaria refazer 27 requisições a cada visita, o tempo todo.

A solução foi um cron diário ([`api/cron/snapshot.ts`](api/cron/snapshot.ts)) que passa pelas 27 capitais, agrega uma leitura de cada e grava numa tabela Postgres (`daily_snapshots`, schema em [`api/_lib/schema.ts`](api/_lib/schema.ts)). Daí em diante, `/api/ranking` só lê o snapshot mais recente de cada cidade, e `/api/history/:cityId` lê os últimos N dias da mesma tabela para alimentar o gráfico de tendência de 30 dias — a mesma coleta paga por dois recursos diferentes.

Os handlers reaproveitam `fetchAirQuality`, `aggregateAqi` e `CAPITALS` do próprio frontend em vez de duplicar a regra de negócio em outro lugar, e são escritos como funções Node puras `(req, res)`, sem depender de nada específico do runtime do Vercel. Isso é o que permite o mesmo arquivo rodar idêntico em produção e no middleware de desenvolvimento do Vite ([`vite.api-plugin.ts`](vite.api-plugin.ts)), que já serve `/api/*` durante `npm run dev` — sem precisar instalar nem rodar `vercel dev`.

E sem nenhuma `DATABASE_URL` configurada, o banco por trás disso tudo é o [PGlite](https://pglite.dev/): um Postgres de verdade compilado para WASM, que roda embutido sem instalar nada. É o que mantém válida a promessa de "clonar e rodar funciona sem configurar nada" mesmo tendo um banco de dados no meio do caminho — e é contra essa mesma instância embutida que os testes de integração dos três endpoints rodam, não contra um mock de banco.

### Dá para instalar e funciona offline desde a primeira visita

O IndexedDB cuida dos _dados_, mas até pouco tempo atrás nada garantia que o _app_ em si — o JS, o CSS, o HTML — estivesse no cache do navegador. Offline na primeira visita, ou depois de o navegador limpar o cache HTTP por conta própria, era tela branca.

Um service worker via `vite-plugin-pwa` resolve isso, mas com escopo propositalmente estreito: ele só guarda o app shell. Não entra em cache nem a Open-Meteo nem a API própria — essa responsabilidade já é do `src/lib/db.ts`, com seu banner de "dados salvos há X min", e duplicá-la no service worker só criaria duas fontes de verdade diferentes para "dado antigo".

## Acessibilidade

- Navegação completa por teclado, com foco sempre visível
- `prefers-reduced-motion` respeitado
- `prefers-color-scheme` com tema claro e escuro
- Alvos de toque de no mínimo 44 px
- Alternativa textual para o gráfico
- Alvos `aria-live` para mudanças de estado
- Link "pular para o conteúdo"

## Stack

| Camada      | Escolha                        | Motivo                                                |
| ----------- | ------------------------------ | ----------------------------------------------------- |
| Build       | Vite 5                         | HMR instantâneo, build via Rollup                     |
| Tipos       | TypeScript strict              | Com `noUncheckedIndexedAccess`                        |
| Dados       | TanStack Query 5               | Cache, deduplicação e estados de requisição           |
| Cache       | idb                            | Wrapper de IndexedDB com tipos                        |
| Lista       | TanStack Virtual 3             | Virtualização                                         |
| Gráfico     | Recharts 2                     | Carregado sob demanda                                 |
| Backend     | Drizzle ORM + Postgres         | Ranking nacional e histórico de 30 dias               |
| Banco local | PGlite                         | Postgres embutido (WASM), sem Docker para dev e teste |
| PWA         | vite-plugin-pwa                | App shell instalável, offline desde a 1ª visita       |
| Testes      | Vitest + Testing Library + MSW | Rede mockada na camada HTTP, não no `fetch`           |

A API ([Open-Meteo](https://open-meteo.com/)) é aberta e não exige chave — clonar e rodar funciona sem configurar nada.

## Rodando

```bash
npm install
npm run dev
```

Sem nenhuma variável de ambiente, `/api/ranking` e `/api/history/:cityId` já funcionam contra o Postgres embutido (PGlite), criado automaticamente na primeira vez. Para apontar para produção, copie [`.env.example`](.env.example), defina `DATABASE_URL` com um Postgres real (Neon, Supabase, Vercel Postgres — qualquer um serve) e `CRON_SECRET`.

Em produção quem popula a tabela é o cron diário do Vercel (`vercel.json`). Em dev local ninguém dispara esse cron sozinho, então logo após clonar o projeto o ranking nacional aparece vazio — para preencher com uma leitura real das 27 capitais, chame o endpoint do cron manualmente uma vez, com o `npm run dev` já rodando:

```bash
curl -X POST http://localhost:5173/api/cron/snapshot
```

(no PowerShell, `Invoke-WebRequest -UseBasicParsing -Method POST http://localhost:5173/api/cron/snapshot`)

| Comando                 | O que faz                                     |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Servidor de desenvolvimento (inclui `/api/*`) |
| `npm run build`         | Build de produção em `dist/`                  |
| `npm run typecheck`     | Verificação de tipos                          |
| `npm run lint`          | ESLint                                        |
| `npm run format`        | Prettier                                      |
| `npm test`              | Testes                                        |
| `npm run test:coverage` | Testes com relatório de cobertura             |
| `npm run db:generate`   | Gera migração SQL a partir do schema Drizzle  |
| `npm run db:migrate`    | Aplica migrações num Postgres real            |
| `npm run db:studio`     | Abre o Drizzle Studio                         |

## Testes

66 testes, 96% de cobertura de linhas. A suíte cobre tanto o frontend, em jsdom, quanto os endpoints de `api/`, que rodam em ambiente Node de verdade (configurado via `environmentMatchGlobs` no `vite.config.ts`).

```
src/test/aqi.test.ts            11 testes  regra de negócio pura
src/test/HourStrip.test.tsx      6 testes  navegação por teclado
src/test/App.test.tsx            5 testes  integração, incluindo queda para cache
api/ranking.test.ts              3 testes  ordenação e "só o snapshot mais recente"
api/history/[cityId].test.ts     3 testes  janela de dias, 404 para cidade desconhecida
api/cron/snapshot.test.ts        3 testes  upsert idempotente, CRON_SECRET
```

O MSW intercepta na camada HTTP, então os testes exercitam o `fetch` de verdade em `src/lib/api.ts` — inclusive a construção da URL e a normalização da resposta. Mockar o módulo inteiro esconderia justamente o código que mais quebra. Os testes de `api/` seguem o mesmo raciocínio para o banco: rodam contra um PGlite de verdade, não um mock de query builder.

A fixture é determinística — o valor de cada hora depende só do índice, nunca do relógio — então nenhuma asserção fica refém do horário em que os testes rodam.

## CI

O workflow em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda tipos, lint, testes com cobertura e build de produção a cada push e pull request.

## Limitações conhecidas

- Os dados vêm do modelo CAMS por interpolação, não de estações físicas. Para valor regulatório, consulte a rede oficial do seu estado (em São Paulo, a [CETESB](https://cetesb.sp.gov.br/)).
- O índice usa as faixas da US EPA, não os padrões do CONAMA. A escolha foi pela EPA por ser mais documentada e permitir comparar com qualquer outra cidade do mundo — mas os limites brasileiros são diferentes.
- Só PM2,5 e PM10 entram no índice agregado. O³, NO₂, SO₂ e CO aparecem como concentração, mas suas faixas de IQA usam médias de 8h e 24h que a série horária não fornece diretamente.
- O ranking nacional e a tendência de 30 dias vêm de um snapshot diário, não de uma leitura ao vivo. A leitura em destaque e a faixa de 48 horas, essas sim, são sempre a mais recente da Open-Meteo.

## Licença

MIT
