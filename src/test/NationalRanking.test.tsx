import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { NationalRanking } from '@/components/NationalRanking'
import { renderWithQuery } from './renderApp'
import { server } from './mocks/server'

const entries = [
  {
    cityId: 'manaus',
    name: 'Manaus',
    state: 'AM',
    date: '2026-08-14',
    aqi: 160,
    band: 'ruim',
    dominant: 'pm10',
  },
  {
    cityId: 'curitiba',
    name: 'Curitiba',
    state: 'PR',
    date: '2026-08-14',
    aqi: 30,
    band: 'boa',
    dominant: 'pm2_5',
  },
]

describe('NationalRanking', () => {
  it('lista as cidades na ordem devolvida pela API e destaca a selecionada', async () => {
    server.use(http.get('/api/ranking', () => HttpResponse.json({ capitals: 2, entries })))

    renderWithQuery(<NationalRanking selectedCityId="curitiba" onSelectCity={() => {}} />)

    const rows = await screen.findAllByRole('button')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Manaus'),
      expect.stringContaining('Curitiba'),
    ])
    expect(screen.getByRole('button', { name: /curitiba/i })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('troca de cidade ao clicar numa linha', async () => {
    server.use(http.get('/api/ranking', () => HttpResponse.json({ capitals: 2, entries })))
    const onSelectCity = vi.fn()
    const user = userEvent.setup()

    renderWithQuery(<NationalRanking selectedCityId="curitiba" onSelectCity={onSelectCity} />)

    await user.click(await screen.findByRole('button', { name: /manaus/i }))
    expect(onSelectCity).toHaveBeenCalledWith('manaus')
  })

  it('mostra uma mensagem quando ainda não há dados', async () => {
    server.use(http.get('/api/ranking', () => HttpResponse.json({ capitals: 0, entries: [] })))

    renderWithQuery(<NationalRanking selectedCityId="curitiba" onSelectCity={() => {}} />)

    expect(await screen.findByText(/ainda não tem dados/i)).toBeInTheDocument()
  })
})
