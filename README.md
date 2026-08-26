# Painel do ar

Índice de qualidade do ar hora a hora nas 27 capitais brasileiras, com histórico de 48 horas e funcionamento offline.

**[Ver online](https://painel-do-ar.vercel.app)** · React 18 · TypeScript · Vite

![Cobertura de testes](https://img.shields.io/badge/cobertura-94%25-2e7d5f)

---

## O problema

Os dados de qualidade do ar existem e são públicos, mas chegam ao cidadão como uma concentração de PM2,5 em µg/m³ — um número que não responde a pergunta que a pessoa realmente tem: _dá para correr no parque hoje?_

Este painel converte concentração em índice, índice em faixa, e faixa em uma frase acionável. O resto da tela existe para justificar essa frase.

## Decisões técnicas

Cada escolha aqui tem um porquê. Se você está lendo isto numa entrevista, estes são os pontos que valem discussão.

### O índice é código puro e testado à parte

A conversão de concentração para IQA ([`src/lib/aqi.ts`](src/lib/aqi.ts)) é a regra de negócio do projeto. Ela não importa React, não faz I/O e tem 11 testes cobrindo limites de faixa, interpolação, saturação e os vãos que a tabela da EPA deixa entre faixas (9,05 µg/m³ de PM2,5 não pertence a nenhuma).

Ausência de leitura devolve `null`, nunca `0`. Um zero silencioso vira "qualidade boa" na tela — é o tipo de bug que só aparece em produção, num dia em que a estação sai do ar.

### Offline-first com IndexedDB, não localStorage

Uma série horária de uma cidade passa de 100 KB. O `localStorage` é síncrono e trava a thread principal, justamente enquanto a lista virtualizada está rolando. O IndexedDB ([`src/lib/db.ts`](src/lib/db.ts)) é assíncrono e tem cota maior.

O fluxo: a rede é tentada primeiro; se falhar e houver cache, o cache aparece com um aviso de "dados salvos há X min" em vez de uma tela de erro. **Dado antigo é mais útil que dado nenhum** — a tela de erro só aparece quando não existe nem uma coisa nem outra.

Toda operação de cache é envolvida em `try/catch` e falha em silêncio. Aba anônima no Safari, cota estourada e storage bloqueado por política corporativa são casos reais; nenhum deles pode derrubar a tela, porque o cache é otimização e não requisito.

### A faixa de 48 horas é navegável pelo teclado

O elemento de assinatura ([`src/components/HourStrip.tsx`](src/components/HourStrip.tsx)) são 48 barras, uma por hora, com cor da faixa e altura pelo valor. Cada barra é um `<button>` de verdade.

Quarenta e oito paradas de `Tab` seriam hostis, então o componente usa **roving tabindex**: só a barra selecionada entra na ordem de foco, e as setas percorrem o resto — o mesmo padrão de um grupo de rádio. `Home` e `End` vão para as pontas, `PageUp`/`PageDown` andam de 6 em 6. Seis testes cobrem essa navegação.

### O gráfico tem equivalente textual

O SVG que o Recharts gera é invisível para leitor de tela. A mesma série vai numa `<table>` escondida visualmente (`clip-path`, não `display: none`, senão sai da árvore de acessibilidade também). É a alternativa não-visual que o WCAG pede, e custa dez linhas.

### A tabela horária é virtualizada

Com `@tanstack/react-virtual`, o DOM fica em ~12 linhas independente do tamanho da série. Como as linhas são posicionadas em `absolute`, a `<table>` semântica não funciona — então os papéis ARIA de grid são declarados explicitamente, com `aria-rowcount` informando o total real, que é o número que o leitor de tela deve anunciar.

### O gráfico é carregado sob demanda

O Recharts respondia por 63% do bundle. Um `React.lazy` tirou 385 KB do caminho crítico:

|                | Antes                | Depois                  |
| -------------- | -------------------- | ----------------------- |
| Bundle inicial | 611 KB (178 KB gzip) | **227 KB (72 KB gzip)** |
| Gráfico        | no bundle inicial    | sob demanda             |

O número grande e a faixa de 48 horas — o que a pessoa veio ver — aparecem antes de o gráfico começar a baixar.

### A cidade vive na URL

`?cidade=curitiba`. O link é compartilhável e o botão voltar do navegador funciona como o usuário espera, sem trazer um roteador para uma aplicação de uma tela só.

## Acessibilidade

- Navegação completa por teclado, com foco sempre visível
- `prefers-reduced-motion` respeitado
- `prefers-color-scheme` com tema claro e escuro
- Alvos de toque de no mínimo 44 px
- Alternativa textual para o gráfico
- Alvos `aria-live` para mudanças de estado
- Link "pular para o conteúdo"

## Stack

| Camada  | Escolha                        | Motivo                                      |
| ------- | ------------------------------ | ------------------------------------------- |
| Build   | Vite 5                         | HMR instantâneo, build via Rollup           |
| Tipos   | TypeScript strict              | Com `noUncheckedIndexedAccess`              |
| Dados   | TanStack Query 5               | Cache, deduplicação e estados de requisição |
| Cache   | idb                            | Wrapper de IndexedDB com tipos              |
| Lista   | TanStack Virtual 3             | Virtualização                               |
| Gráfico | Recharts 2                     | Carregado sob demanda                       |
| Testes  | Vitest + Testing Library + MSW | Rede mockada na camada HTTP, não no `fetch` |

A API ([Open-Meteo](https://open-meteo.com/)) é aberta e não exige chave — clonar e rodar funciona sem configurar nada.

## Rodando

```bash
npm install
npm run dev
```

| Comando                 | O que faz                         |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Servidor de desenvolvimento       |
| `npm run build`         | Build de produção em `dist/`      |
| `npm run typecheck`     | Verificação de tipos              |
| `npm run lint`          | ESLint                            |
| `npm test`              | Testes                            |
| `npm run test:coverage` | Testes com relatório de cobertura |

## Testes

22 testes, 94% de cobertura de linhas.

```
src/test/aqi.test.ts         11 testes  regra de negócio pura
src/test/HourStrip.test.tsx   6 testes  navegação por teclado
src/test/App.test.tsx         5 testes  integração, incluindo queda para cache
```

O MSW intercepta na camada HTTP, então os testes exercitam o `fetch` real do `src/lib/api.ts` — inclusive a construção da URL e a normalização da resposta. Mockar o módulo inteiro esconderia justamente o código que mais quebra.

A fixture é determinística: o valor de cada hora depende só do índice, então nenhuma asserção depende do relógio.

## CI

O workflow em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda tipos, lint, testes com cobertura e build de produção a cada push e pull request.

## Limitações conhecidas

- Os dados vêm do modelo CAMS por interpolação, não de estações físicas. Para valor regulatório, consulte a rede oficial do seu estado (em São Paulo, a [CETESB](https://cetesb.sp.gov.br/)).
- O índice usa as faixas da US EPA, não os padrões do CONAMA. A EPA foi escolhida por ser mais documentada e permitir comparação internacional; os limites brasileiros são diferentes.
- Só PM2,5 e PM10 entram no índice agregado. O³, NO₂, SO₂ e CO aparecem como concentração, mas suas faixas de IQA usam médias de 8 h e 24 h que a série horária não fornece diretamente.

## Licença

MIT
