import { fetchAirQuality } from '../../src/lib/api'
import { aggregateAqi } from '../../src/lib/aqi'
import type { City } from '../../src/data/capitals'
import type { NewDailySnapshot } from './schema'

const todayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "en-CA" formata como YYYY-MM-DD, o formato que a coluna `date` espera. */
export function todayInBrazil(now = new Date()): string {
  return todayFormat.format(now)
}

/**
 * Busca a leitura mais recente de uma capital e resume no formato de
 * `daily_snapshots`. Reaproveita `fetchAirQuality`/`aggregateAqi` do
 * frontend — mesma regra de negócio, sem duplicar as faixas da EPA aqui.
 * Devolve `null` quando não há leitura válida (estação fora do ar), sem
 * lançar — quem chama decide se isso interrompe o lote ou não.
 */
export async function snapshotForCity(
  city: City,
  date = todayInBrazil(),
): Promise<Omit<NewDailySnapshot, 'id' | 'capturedAt'> | null> {
  const series = await fetchAirQuality(city, { pastDays: 0 })
  const latest = series.samples.at(-1)
  if (!latest) return null

  const reading = aggregateAqi(latest)
  if (!reading) return null

  return {
    cityId: city.id,
    date,
    aqi: reading.aqi,
    band: reading.band.id,
    dominant: reading.dominant,
    pm25: latest.pm2_5,
    pm10: latest.pm10,
  }
}
