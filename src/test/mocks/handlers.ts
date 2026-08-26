import { HttpResponse, http } from 'msw'

export const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/**
 * Série determinística: o valor de PM2,5 depende só do índice da hora, então
 * qualquer asserção sobre "a última leitura" é estável entre execuções.
 */
export function buildFixture(hours = 72, pm25 = (i: number) => 5 + (i % 12) * 2) {
  const start = new Date('2026-08-11T00:00:00')
  const time: string[] = []
  for (let i = 0; i < hours; i++) {
    const d = new Date(start.getTime() + i * 3_600_000)
    time.push(d.toISOString().slice(0, 16))
  }

  return {
    hourly_units: {
      pm2_5: 'µg/m³',
      pm10: 'µg/m³',
      ozone: 'µg/m³',
      nitrogen_dioxide: 'µg/m³',
      sulphur_dioxide: 'µg/m³',
      carbon_monoxide: 'µg/m³',
    },
    hourly: {
      time,
      pm2_5: time.map((_, i) => pm25(i)),
      pm10: time.map((_, i) => pm25(i) * 2),
      ozone: time.map(() => 40),
      nitrogen_dioxide: time.map(() => 12),
      sulphur_dioxide: time.map(() => 3),
      carbon_monoxide: time.map(() => 180),
    },
  }
}

export const handlers = [http.get(ENDPOINT, () => HttpResponse.json(buildFixture()))]
