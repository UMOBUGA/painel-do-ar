import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { LongTermTrend } from '@/components/LongTermTrend'
import { renderWithQuery } from './renderApp'
import { server } from './mocks/server'

describe('LongTermTrend', () => {
  it('expõe a série também como tabela para leitor de tela', async () => {
    server.use(
      http.get('/api/history/:cityId', () =>
        HttpResponse.json({
          cityId: 'curitiba',
          name: 'Curitiba',
          state: 'PR',
          days: 3,
          entries: [
            { date: '2026-08-12', aqi: 20, band: 'boa', dominant: 'pm2_5', pm25: 10, pm10: 15 },
            { date: '2026-08-13', aqi: 25, band: 'boa', dominant: 'pm2_5', pm25: 11, pm10: 16 },
            { date: '2026-08-14', aqi: 30, band: 'boa', dominant: 'pm2_5', pm25: 12, pm10: 18 },
          ],
        }),
      ),
    )

    renderWithQuery(<LongTermTrend cityId="curitiba" />)

    const table = await screen.findByRole('table', { name: /iqa médio diário de curitiba/i })
    expect(within(table).getAllByRole('row')).toHaveLength(4) // cabeçalho + 3 dias
  })

  it('mostra aviso quando não há histórico suficiente', async () => {
    server.use(
      http.get('/api/history/:cityId', () =>
        HttpResponse.json({
          cityId: 'curitiba',
          name: 'Curitiba',
          state: 'PR',
          days: 30,
          entries: [],
        }),
      ),
    )

    renderWithQuery(<LongTermTrend cityId="curitiba" />)

    expect(await screen.findByText(/ainda não há histórico/i)).toBeInTheDocument()
  })
})
