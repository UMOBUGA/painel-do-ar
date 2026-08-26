import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PollutantCards } from '@/components/PollutantCards'
import type { HourlySample } from '@/types/air'

const sample: HourlySample = {
  time: '2026-08-14T13:00',
  pm2_5: 12,
  pm10: 24,
  ozone: 40,
  nitrogen_dioxide: 12,
  sulphur_dioxide: 3,
  carbon_monoxide: 180,
}

describe('PollutantCards', () => {
  it('usa a unidade informada pela API', () => {
    render(<PollutantCards sample={sample} units={{ pm2_5: 'ppm' }} />)
    expect(screen.getByText('ppm')).toBeInTheDocument()
  })

  it('cai para µg/m³ quando a API não informa unidade', () => {
    render(<PollutantCards sample={sample} units={{}} />)
    expect(screen.getAllByText('µg/m³').length).toBeGreaterThan(0)
  })
})
