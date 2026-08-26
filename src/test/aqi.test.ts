import { describe, expect, it } from 'vitest'
import { aggregateAqi, bandFor, toAqi } from '@/lib/aqi'

describe('toAqi', () => {
  it('devolve os limites exatos de cada faixa de PM2,5', () => {
    expect(toAqi('pm2_5', 0)).toBe(0)
    expect(toAqi('pm2_5', 9.0)).toBe(50)
    expect(toAqi('pm2_5', 35.4)).toBe(100)
    expect(toAqi('pm2_5', 55.4)).toBe(150)
  })

  it('interpola linearmente dentro da faixa', () => {
    // Meio da faixa 0–9 µg/m³ deve cair no meio de 0–50.
    expect(toAqi('pm2_5', 4.5)).toBe(25)
  })

  it('satura no teto em vez de extrapolar', () => {
    expect(toAqi('pm2_5', 10_000)).toBe(500)
    expect(toAqi('pm10', 10_000)).toBe(500)
  })

  it('trata o vão entre faixas usando a faixa seguinte', () => {
    // 9.05 não pertence a nenhuma faixa da tabela da EPA.
    expect(toAqi('pm2_5', 9.05)).toBe(51)
  })

  it('devolve null para ausência de leitura, não zero', () => {
    expect(toAqi('pm2_5', null)).toBeNull()
    expect(toAqi('pm2_5', undefined)).toBeNull()
    expect(toAqi('pm2_5', Number.NaN)).toBeNull()
    expect(toAqi('pm2_5', -1)).toBeNull()
  })
})

describe('bandFor', () => {
  it('classifica nos limites', () => {
    expect(bandFor(0)?.id).toBe('boa')
    expect(bandFor(50)?.id).toBe('boa')
    expect(bandFor(51)?.id).toBe('moderada')
    expect(bandFor(150)?.id).toBe('sensiveis')
    expect(bandFor(301)?.id).toBe('pessima')
  })

  it('limita valores fora do intervalo em vez de devolver null', () => {
    expect(bandFor(900)?.id).toBe('pessima')
    expect(bandFor(-40)?.id).toBe('boa')
  })

  it('devolve null sem valor', () => {
    expect(bandFor(null)).toBeNull()
  })
})

describe('aggregateAqi', () => {
  it('usa o pior poluente e informa qual foi', () => {
    // PM10 em 200 µg/m³ dá IQA maior que PM2,5 em 10 µg/m³.
    const result = aggregateAqi({ pm2_5: 10, pm10: 200 })
    expect(result?.dominant).toBe('pm10')
    expect(result?.aqi).toBeGreaterThan(100)
  })

  it('funciona com apenas um poluente disponível', () => {
    const result = aggregateAqi({ pm2_5: 12, pm10: null })
    expect(result?.dominant).toBe('pm2_5')
  })

  it('devolve null quando nenhum poluente tem leitura', () => {
    expect(aggregateAqi({ pm2_5: null, pm10: null })).toBeNull()
    expect(aggregateAqi({})).toBeNull()
  })
})
