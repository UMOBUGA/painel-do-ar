import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from './_lib/db'
import { dailySnapshots } from './_lib/schema'
import { mockReq, mockRes } from './_lib/testHttp'
import handler from './ranking'
import type { RankingEntry } from './ranking'

describe('GET /api/ranking', () => {
  beforeEach(async () => {
    const db = await getDb()
    await db.delete(dailySnapshots)
  })

  it('ordena as capitais da pior para a melhor qualidade do ar', async () => {
    const db = await getDb()
    await db.insert(dailySnapshots).values([
      { cityId: 'sao-paulo', date: '2026-08-14', aqi: 80, band: 'moderada', dominant: 'pm2_5' },
      { cityId: 'curitiba', date: '2026-08-14', aqi: 30, band: 'boa', dominant: 'pm2_5' },
      { cityId: 'manaus', date: '2026-08-14', aqi: 160, band: 'ruim', dominant: 'pm10' },
    ])

    const res = mockRes()
    await handler(mockReq('/api/ranking'), res)

    expect(res.statusCode).toBe(200)
    const body = res.body as { entries: RankingEntry[] }
    expect(body.entries.map((e) => e.cityId)).toEqual(['manaus', 'sao-paulo', 'curitiba'])
    expect(body.entries[0]).toMatchObject({ name: 'Manaus', state: 'AM', aqi: 160 })
  })

  it('usa só o snapshot mais recente de cada cidade', async () => {
    const db = await getDb()
    await db.insert(dailySnapshots).values([
      { cityId: 'curitiba', date: '2026-08-13', aqi: 200, band: 'muito-ruim', dominant: 'pm2_5' },
      { cityId: 'curitiba', date: '2026-08-14', aqi: 30, band: 'boa', dominant: 'pm2_5' },
    ])

    const res = mockRes()
    await handler(mockReq('/api/ranking'), res)

    const body = res.body as { entries: RankingEntry[] }
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({ date: '2026-08-14', aqi: 30 })
  })

  it('devolve lista vazia quando não há snapshots ainda', async () => {
    const res = mockRes()
    await handler(mockReq('/api/ranking'), res)

    const body = res.body as { entries: RankingEntry[] }
    expect(body.entries).toEqual([])
  })
})
