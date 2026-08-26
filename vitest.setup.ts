import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './src/test/mocks/server'

// jsdom não implementa estas duas APIs, e Recharts/TanStack Virtual dependem
// delas. Sem os stubs os testes quebram por motivo que nada tem a ver com o
// código sendo testado.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// O ResponsiveContainer do Recharts mede o pai antes de desenhar. No jsdom
// todo elemento tem tamanho zero, o que gera um aviso em toda execução; fixar
// dimensões deixa a saída dos testes limpa. Guardado por `typeof` porque este
// setup também roda para os testes de `api/`, em ambiente Node puro, onde
// `HTMLElement` nem existe.
if (typeof HTMLElement !== 'undefined') {
  for (const prop of ['offsetWidth', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value: prop === 'offsetWidth' ? 800 : 300,
    })
  }
}

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

/**
 * jsdom cria AbortController/AbortSignal no seu próprio realm de VM. O fetch
 * nativo do Node (Undici) faz uma checagem WebIDL que rejeita um AbortSignal
 * de outro realm mesmo passando em "instanceof" — o pedido nem chega a sair
 * ("Expected signal to be an instance of AbortSignal"). Isso só acontece
 * neste ambiente de teste; no navegador real o AbortSignal já nasce no mesmo
 * realm do fetch. Envolve o fetch para nunca repassar o signal estrangeiro
 * adiante, implementando o cancelamento manualmente.
 *
 * Precisa envolver depois de `server.listen()`: o MSW substitui
 * `globalThis.fetch` inteiro ao ativar a interceptação, então envolver antes
 * seria descartado.
 */
function guardForeignRealmAbortSignal() {
  const patchedFetch = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const { signal, ...rest } = init ?? {}
    if (!signal) return patchedFetch(input, init)
    if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
      signal.addEventListener('abort', onAbort, { once: true })
      patchedFetch(input, rest)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort))
    })
  }) as typeof fetch
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  guardForeignRealmAbortSignal()
})
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
