import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HourStrip } from '@/components/HourStrip'
import type { HourlySample } from '@/types/air'

function samples(count: number): HourlySample[] {
  const start = new Date('2026-08-12T00:00:00')
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(start.getTime() + i * 3_600_000).toISOString().slice(0, 16),
    pm2_5: 5 + i,
    pm10: 10 + i,
    ozone: null,
    nitrogen_dioxide: null,
    sulphur_dioxide: null,
    carbon_monoxide: null,
  }))
}

describe('HourStrip', () => {
  it('mostra no máximo 48 barras, mesmo com série maior', () => {
    render(<HourStrip samples={samples(72)} />)
    expect(screen.getAllByRole('button')).toHaveLength(48)
  })

  it('começa selecionando a hora mais recente', () => {
    render(<HourStrip samples={samples(48)} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.at(-1)).toHaveAttribute('aria-pressed', 'true')
    expect(buttons.at(-1)).toHaveAttribute('tabindex', '0')
  })

  it('deixa só uma barra na ordem de tabulação', () => {
    render(<HourStrip samples={samples(48)} />)
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('anda pela série com as setas do teclado', async () => {
    const user = userEvent.setup()
    render(<HourStrip samples={samples(48)} />)
    const buttons = screen.getAllByRole('button')

    buttons.at(-1)!.focus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')

    expect(buttons.at(-3)).toHaveAttribute('aria-pressed', 'true')
    expect(buttons.at(-3)).toHaveFocus()
  })

  it('Home e End vão para as pontas', async () => {
    const user = userEvent.setup()
    render(<HourStrip samples={samples(48)} />)
    const buttons = screen.getAllByRole('button')

    buttons.at(-1)!.focus()
    await user.keyboard('{Home}')
    expect(buttons[0]).toHaveFocus()

    await user.keyboard('{End}')
    expect(buttons.at(-1)).toHaveFocus()
  })

  it('descreve cada hora para leitor de tela', () => {
    render(<HourStrip samples={samples(3)} />)
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(/IQA \d+/)
  })
})
