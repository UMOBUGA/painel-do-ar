import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCityFromUrl } from '@/hooks/useCityFromUrl'
import { DEFAULT_CITY_ID } from '@/data/capitals'

function setUrl(search: string) {
  window.history.pushState({}, '', `/${search}`)
}

describe('useCityFromUrl', () => {
  afterEach(() => {
    setUrl('')
  })

  it('usa a cidade padrão quando não há query param', () => {
    setUrl('')
    const { result } = renderHook(() => useCityFromUrl())
    expect(result.current[0]).toBe(DEFAULT_CITY_ID)
  })

  it('lê a cidade da URL quando é válida', () => {
    setUrl('?cidade=curitiba')
    const { result } = renderHook(() => useCityFromUrl())
    expect(result.current[0]).toBe('curitiba')
  })

  it('ignora um valor inválido na URL e cai para a cidade padrão', () => {
    setUrl('?cidade=atlantida-perdida')
    const { result } = renderHook(() => useCityFromUrl())
    expect(result.current[0]).toBe(DEFAULT_CITY_ID)
  })

  it('select atualiza o estado e a query string', () => {
    setUrl('')
    const { result } = renderHook(() => useCityFromUrl())

    act(() => result.current[1]('recife'))

    expect(result.current[0]).toBe('recife')
    expect(new URL(window.location.href).searchParams.get('cidade')).toBe('recife')
  })

  it('select ignora uma cidade desconhecida', () => {
    setUrl('')
    const { result } = renderHook(() => useCityFromUrl())

    act(() => result.current[1]('nao-existe'))

    expect(result.current[0]).toBe(DEFAULT_CITY_ID)
  })

  it('reage ao botão voltar do navegador (popstate)', () => {
    setUrl('')
    const { result } = renderHook(() => useCityFromUrl())

    act(() => {
      setUrl('?cidade=salvador')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current[0]).toBe('salvador')
  })
})
