export const POLLUTANTS = [
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
] as const

export type Pollutant = (typeof POLLUTANTS)[number]

export const POLLUTANT_LABELS: Record<Pollutant, string> = {
  pm2_5: 'PM2,5',
  pm10: 'PM10',
  ozone: 'Ozônio',
  nitrogen_dioxide: 'Dióxido de nitrogênio',
  sulphur_dioxide: 'Dióxido de enxofre',
  carbon_monoxide: 'Monóxido de carbono',
}

export const POLLUTANT_FORMULAS: Record<Pollutant, string> = {
  pm2_5: 'PM2,5',
  pm10: 'PM10',
  ozone: 'O₃',
  nitrogen_dioxide: 'NO₂',
  sulphur_dioxide: 'SO₂',
  carbon_monoxide: 'CO',
}

/** Uma leitura horária já normalizada para uso na interface. */
export interface HourlySample {
  /** ISO local da estação, ex.: "2026-08-14T13:00". */
  time: string
  pm2_5: number | null
  pm10: number | null
  ozone: number | null
  nitrogen_dioxide: number | null
  sulphur_dioxide: number | null
  carbon_monoxide: number | null
}

export interface AirQualitySeries {
  cityId: string
  /** Momento em que os dados foram buscados na rede (epoch ms). */
  fetchedAt: number
  units: Partial<Record<Pollutant, string>>
  samples: HourlySample[]
}

/** Formato bruto da Open-Meteo, antes da normalização. */
export interface OpenMeteoResponse {
  hourly?: {
    time?: string[]
  } & Partial<Record<Pollutant, (number | null)[]>>
  hourly_units?: Partial<Record<Pollutant, string>>
}
