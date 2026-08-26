import { describe, expect, it } from 'vitest'
import { bandColor } from '@/lib/bandColor'

describe('bandColor', () => {
  it('devolve a variável CSS da faixa', () => {
    expect(bandColor('boa')).toBe('var(--band-boa)')
    expect(bandColor('pessima')).toBe('var(--band-pessima)')
  })

  it('cai para a cor neutra quando não há faixa', () => {
    expect(bandColor(null)).toBe('var(--rule)')
    expect(bandColor(undefined)).toBe('var(--rule)')
  })
})
