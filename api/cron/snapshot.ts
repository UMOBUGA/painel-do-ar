import { sql } from 'drizzle-orm'
import { getDb } from '../_lib/db'
import { dailySnapshots } from '../_lib/schema'
import { snapshotForCity, todayInBrazil } from '../_lib/aggregate'
import { CAPITALS } from '../../src/data/capitals'
import { sendJson, type Handler } from '../_lib/http'

/**
 * Roda 1x/dia (ver `crons` em vercel.json) e popula um snapshot por capital.
 * Cada cidade é isolada em try/catch: uma estação fora do ar não pode
 * derrubar as outras 26. Protegido por CRON_SECRET para não virar um endpoint
 * público que qualquer um pode martelar.
 */
const handler: Handler = async (req, res) => {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const authorization = req.headers.authorization
    if (authorization !== `Bearer ${expected}`) {
      sendJson(res, 401, { error: 'unauthorized' })
      return
    }
  }

  const db = await getDb()
  const date = todayInBrazil()
  const failed: string[] = []
  let count = 0

  for (const city of CAPITALS) {
    try {
      const snapshot = await snapshotForCity(city, date)
      if (!snapshot) {
        failed.push(city.id)
        continue
      }

      await db
        .insert(dailySnapshots)
        .values(snapshot)
        .onConflictDoUpdate({
          target: [dailySnapshots.cityId, dailySnapshots.date],
          set: {
            aqi: sql`excluded.aqi`,
            band: sql`excluded.band`,
            dominant: sql`excluded.dominant`,
            pm25: sql`excluded.pm25`,
            pm10: sql`excluded.pm10`,
            capturedAt: sql`now()`,
          },
        })
      count++
    } catch {
      failed.push(city.id)
    }
  }

  sendJson(res, 200, { ok: true, date, count, failed })
}

export default handler
