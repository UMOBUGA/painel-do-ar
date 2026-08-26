import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import App from '@/App'
import { renderWithQuery } from './renderApp'
import { server } from './mocks/server'
import { ENDPOINT, buildFixture } from './mocks/handlers'
import { clearCache } from '@/lib/db'

describe('App', () => {
  it('mostra o índice e a faixa da última leitura', async () => {
    renderWithQuery(<App />)

    // A fixture termina em PM2,5 = 27 µg/m³ → faixa moderada, cujo conselho
    // menciona asma. Procuramos por ele porque o rótulo "Moderada" também
    // aparece na legenda e no detalhe da faixa.
    expect(await screen.findByText(/asma ou rinite/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('São Paulo')
  })

  it('troca de cidade pelo seletor e mantém a escolha na URL', async () => {
    const user = userEvent.setup()
    renderWithQuery(<App />)
    await screen.findByText(/asma ou rinite/i)

    await user.selectOptions(screen.getByLabelText('Capital'), 'curitiba')

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Curitiba')
    })
    expect(new URL(window.location.href).searchParams.get('cidade')).toBe('curitiba')
  })

  it('oferece nova tentativa quando a API falha e não há cache', async () => {
    await clearCache()
    server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 503 })))

    renderWithQuery(<App />)

    expect(
      await screen.findByRole('heading', { name: /não deu para carregar/i }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it('cai para o cache quando a rede falha depois de uma carga bem-sucedida', async () => {
    await clearCache()
    const first = renderWithQuery(<App />)
    await screen.findByText(/asma ou rinite/i)
    first.unmount()

    server.use(http.get(ENDPOINT, () => HttpResponse.error()))
    renderWithQuery(<App />)

    // Sem tela de erro: o dado salvo em IndexedDB assume o lugar.
    expect(await screen.findByText(/asma ou rinite/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /não deu para carregar/i })).toBeNull()
  })

  it('expõe o gráfico também como tabela para leitor de tela', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json(buildFixture())))
    renderWithQuery(<App />)
    await screen.findByText(/asma ou rinite/i)

    const table = screen.getByRole('table', {
      name: /material particulado nas últimas 48 horas/i,
    })
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(40)
  })
})
