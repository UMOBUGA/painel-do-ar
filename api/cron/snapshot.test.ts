import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '../_lib/db'
import { dailySnapshots } from '../_lib/schema'
import { mockReq, mockRes } from '../_lib/testHttp'
import { CAPITALS } from '../../src/data/capitals'
import handler from './snapshot'

describe('POST /api/cron/snapshot', () => {
  beforeEach(async () => {
    const db = await getDb()
    await db.delete(dailySnapshots)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejeita sem CRON_SECRET correto quando ele está configurado', async () => {
    vi.stubEnv('CRON_SECRET', 'segredo')

    const res = mockRes()
    await handler(mockReq('/api/cron/snapshot'), res)

    expect(res.statusCode).toBe(401)
  })

  it('aceita com o Bearer token correto', async () => {
    vi.stubEnv('CRON_SECRET', 'segredo')

    const res = mockRes()
    await handler(mockReq('/api/cron/snapshot', { authorization: 'Bearer segredo' }), res)

    expect(res.statusCode).toBe(200)
  })

  it('grava um snapshot por capital e é idempotente ao rodar de novo', async () => {
    const res = mockRes()
    await handler(mockReq('/api/cron/snapshot'), res)

    expect(res.statusCode).toBe(200)
    const body = res.body as { count: number; failed: string[] }
    expect(body.count).toBe(CAPITALS.length)
    expect(body.failed).toEqual([])

    const db = await getDb()
    const rows = await db.select().from(dailySnapshots)
    expect(rows).toHaveLength(CAPITALS.length)

    // Rodar de novo no mesmo dia deve atualizar, não duplicar (upsert).
    await handler(mockReq('/api/cron/snapshot'), res)
    const rowsAfter = await db.select().from(dailySnapshots)
    expect(rowsAfter).toHaveLength(CAPITALS.length)
  }, 20000)
})
