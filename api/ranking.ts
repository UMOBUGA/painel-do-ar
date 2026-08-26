import { getDb } from './_lib/db'
import { dailySnapshots, type DailySnapshot } from './_lib/schema'
import { CAPITALS, findCity } from '../src/data/capitals'
import { sendJson, type Handler } from './_lib/http'

export interface RankingEntry {
  cityId: string
  name: string
  state: string
  date: string
  aqi: number
  band: string
  dominant: string
}

/**
 * Snapshot mais recente de cada cidade, ordenado do pior ar para o melhor.
 * Reduz em memória em vez de "DISTINCT ON" no SQL: são no máximo ~27 linhas
 * por dia acumuladas, então o custo é irrelevante e evita depender de um
 * comportamento específico de dialeto que precisaria valer tanto no Postgres
 * de produção quanto no PGlite de dev/teste.
 */
function latestPerCity(rows: DailySnapshot[]): DailySnapshot[] {
  const latest = new Map<string, DailySnapshot>()
  for (const row of rows) {
    const current = latest.get(row.cityId)
    if (!current || row.date > current.date) latest.set(row.cityId, row)
  }
  return [...latest.values()]
}

const handler: Handler = async (_req, res) => {
  const db = await getDb()
  const rows = await db.select().from(dailySnapshots)

  const entries: RankingEntry[] = latestPerCity(rows)
    .map((row): RankingEntry | null => {
      const city = findCity(row.cityId)
      if (!city) return null
      return {
        cityId: row.cityId,
        name: city.name,
        state: city.state,
        date: row.date,
        aqi: row.aqi,
        band: row.band,
        dominant: row.dominant,
      }
    })
    .filter((entry): entry is RankingEntry => entry !== null)
    .sort((a, b) => b.aqi - a.aqi)

  sendJson(
    res,
    200,
    { capitals: CAPITALS.length, entries },
    's-maxage=1800, stale-while-revalidate=3600',
  )
}

export default handler
