import { describe, expect, it } from 'vitest'
import { formatConcentration, formatRelativeMinutes } from '@/lib/format'

describe('formatConcentration', () => {
  it('devolve travessão para null', () => {
    expect(formatConcentration(null)).toBe('—')
  })

  it('formata com uma casa decimal', () => {
    expect(formatConcentration(12)).toBe('12,0')
  })
})

describe('formatRelativeMinutes', () => {
  const now = new Date('2026-08-14T13:00:00').getTime()

  it('"agora mesmo" para menos de 1 minuto', () => {
    expect(formatRelativeMinutes(now - 10_000, now)).toBe('agora mesmo')
  })

  it('minutos para menos de 1 hora', () => {
    expect(formatRelativeMinutes(now - 5 * 60_000, now)).toBe('há 5 min')
  })

  it('horas para menos de 1 dia', () => {
    expect(formatRelativeMinutes(now - 3 * 3_600_000, now)).toBe('há 3 h')
  })

  it('dias para 1 dia ou mais', () => {
    expect(formatRelativeMinutes(now - 2 * 86_400_000, now)).toBe('há 2 d')
  })

  it('nunca devolve negativo para um instante no futuro', () => {
    expect(formatRelativeMinutes(now + 60_000, now)).toBe('agora mesmo')
  })
})
