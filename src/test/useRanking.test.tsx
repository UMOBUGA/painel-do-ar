import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useRanking } from '@/hooks/useRanking'
import { queryWrapper } from './renderApp'
import { server } from './mocks/server'

describe('useRanking', () => {
  it('busca e devolve o ranking', async () => {
    server.use(
      http.get('/api/ranking', () =>
        HttpResponse.json({
          capitals: 1,
          entries: [
            {
              cityId: 'curitiba',
              name: 'Curitiba',
              state: 'PR',
              date: '2026-08-14',
              aqi: 40,
              band: 'moderada',
              dominant: 'pm2_5',
            },
          ],
        }),
      ),
    )

    const { Wrapper } = queryWrapper()
    const { result } = renderHook(() => useRanking(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.entries).toHaveLength(1)
    expect(result.current.data?.entries[0]?.cityId).toBe('curitiba')
  })

  it('vira erro quando o endpoint falha', async () => {
    server.use(http.get('/api/ranking', () => new HttpResponse(null, { status: 500 })))

    const { Wrapper } = queryWrapper()
    const { result } = renderHook(() => useRanking(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
