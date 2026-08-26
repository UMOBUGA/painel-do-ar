import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../_lib/db'
import { dailySnapshots } from '../_lib/schema'
import { mockReq, mockRes } from '../_lib/testHttp'
import handler from './[cityId]'

// Relativo ao "agora" real, não a uma data fixa: o handler usa `new Date()`
// para calcular a janela de `?days=`, então a fixture precisa se ancorar no
// mesmo relógio para os testes de limite de janela ficarem corretos.
function dateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

describe('GET /api/history/:cityId', () => {
  beforeEach(async () => {
    const db = await getDb()
    await db.delete(dailySnapshots)
  })

  it('devolve os snapshots da cidade em ordem crescente de data', async () => {
    const db = await getDb()
    await db.insert(dailySnapshots).values([
      { cityId: 'curitiba', date: dateDaysAgo(2), aqi: 40, band: 'moderada', dominant: 'pm2_5' },
      { cityId: 'curitiba', date: dateDaysAgo(0), aqi: 20, band: 'boa', dominant: 'pm2_5' },
      { cityId: 'curitiba', date: dateDaysAgo(1), aqi: 30, band: 'boa', dominant: 'pm2_5' },
      { cityId: 'sao-paulo', date: dateDaysAgo(0), aqi: 90, band: 'moderada', dominant: 'pm10' },
    ])

    const res = mockRes()
    await handler(mockReq('/api/history/curitiba'), res)

    expect(res.statusCode).toBe(200)
    const body = res.body as { entries: { date: string; aqi: number }[] }
    expect(body.entries.map((e) => e.aqi)).toEqual([40, 30, 20])
  })

  it('respeita o parâmetro ?days=', async () => {
    const db = await getDb()
    await db.insert(dailySnapshots).values(
      Array.from({ length: 5 }, (_, i) => ({
        cityId: 'curitiba',
        date: dateDaysAgo(i),
        aqi: i,
        band: 'boa',
        dominant: 'pm2_5' as const,
      })),
    )

    const res = mockRes()
    await handler(mockReq('/api/history/curitiba?days=2'), res)

    const body = res.body as { entries: unknown[] }
    expect(body.entries).toHaveLength(2)
  })

  it('404 para uma cidade desconhecida', async () => {
    const res = mockRes()
    await handler(mockReq('/api/history/atlantida-perdida'), res)

    expect(res.statusCode).toBe(404)
  })
})
