import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useCityHistory } from '@/hooks/useCityHistory'
import { queryWrapper } from './renderApp'
import { server } from './mocks/server'

describe('useCityHistory', () => {
  it('busca o histórico com o número de dias informado', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/history/:cityId', ({ request, params }) => {
        requestedUrl = request.url
        return HttpResponse.json({
          cityId: params.cityId,
          name: 'Curitiba',
          state: 'PR',
          days: 7,
          entries: [
            {
              date: '2026-08-14',
              aqi: 40,
              band: 'moderada',
              dominant: 'pm2_5',
              pm25: 12,
              pm10: 20,
            },
          ],
        })
      }),
    )

    const { Wrapper } = queryWrapper()
    const { result } = renderHook(() => useCityHistory('curitiba', 7), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.entries).toHaveLength(1)
    expect(requestedUrl).toContain('/api/history/curitiba?days=7')
  })
})
