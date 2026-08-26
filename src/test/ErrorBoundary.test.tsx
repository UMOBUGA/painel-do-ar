import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Boom(): never {
  throw new Error('quebrou de propósito')
}

describe('ErrorBoundary', () => {
  it('renderiza os filhos normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>tudo bem</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('tudo bem')).toBeInTheDocument()
  })

  it('mostra o estado de erro em vez de derrubar a árvore', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /algo quebrou/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recarregar/i })).toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
