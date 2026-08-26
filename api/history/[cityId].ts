import { and, desc, eq, gte } from 'drizzle-orm'
import { getDb } from '../_lib/db'
import { dailySnapshots } from '../_lib/schema'
import { findCity } from '../../src/data/capitals'
import { getUrl, lastPathSegment, sendJson, type Handler } from '../_lib/http'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

/**
 * Snapshots diários de uma capital, ordenados do mais antigo ao mais recente
 * — é o formato que um gráfico de tendência consome direto. `cityId` vem do
 * último segmento do path (não de `req.query`, que só o Vercel popula) para
 * que o handler se comporte igual em produção e no middleware de dev do
 * Vite.
 */
const handler: Handler = async (req, res) => {
  const cityId = lastPathSegment(req)
  const city = findCity(cityId)
  if (!city) {
    sendJson(res, 404, { error: `cidade desconhecida: ${cityId}` })
    return
  }

  const daysParam = Number(getUrl(req).searchParams.get('days'))
  const days =
    Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, MAX_DAYS) : DEFAULT_DAYS

  const db = await getDb()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceDate = since.toISOString().slice(0, 10)

  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(and(eq(dailySnapshots.cityId, cityId), gte(dailySnapshots.date, sinceDate)))
    .orderBy(desc(dailySnapshots.date))
    .limit(days)

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  sendJson(
    res,
    200,
    {
      cityId,
      name: city.name,
      state: city.state,
      days,
      entries: rows.map((row) => ({
        date: row.date,
        aqi: row.aqi,
        band: row.band,
        dominant: row.dominant,
        pm25: row.pm25,
        pm10: row.pm10,
      })),
    },
    's-maxage=1800, stale-while-revalidate=3600',
  )
}

export default handler
