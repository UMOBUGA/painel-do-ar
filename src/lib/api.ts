import type { City } from '../data/capitals'
import {
  POLLUTANTS,
  type AirQualitySeries,
  type HourlySample,
  type OpenMeteoResponse,
  type Pollutant,
} from '../types/air'

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/** Erro de rede/HTTP com mensagem já pronta para a interface. */
export class AirQualityError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AirQualityError'
  }
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * A Open-Meteo devolve arrays paralelos (um por poluente) alinhados pelo array
 * `time`. Transpomos para uma lista de amostras — muito mais fácil de ordenar,
 * fatiar e renderizar do que seis arrays que precisam ficar sincronizados.
 */
export function normalize(cityId: string, raw: OpenMeteoResponse): AirQualitySeries {
  const times = raw.hourly?.time ?? []

  const samples: HourlySample[] = times.map((time, i) => {
    const sample = { time } as HourlySample
    for (const p of POLLUTANTS) {
      sample[p] = toNumberOrNull(raw.hourly?.[p]?.[i])
    }
    return sample
  })

  const units: Partial<Record<Pollutant, string>> = {}
  for (const p of POLLUTANTS) {
    const unit = raw.hourly_units?.[p]
    if (unit) units[p] = unit
  }

  return { cityId, fetchedAt: Date.now(), units, samples }
}

export interface FetchOptions {
  /** Quantos dias passados incluir. */
  pastDays?: number
  signal?: AbortSignal
}

export async function fetchAirQuality(
  city: City,
  { pastDays = 2, signal }: FetchOptions = {},
): Promise<AirQualitySeries> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('latitude', String(city.lat))
  url.searchParams.set('longitude', String(city.lon))
  url.searchParams.set('hourly', POLLUTANTS.join(','))
  url.searchParams.set('timezone', 'America/Sao_Paulo')
  url.searchParams.set('past_days', String(pastDays))
  url.searchParams.set('forecast_days', '1')

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new AirQualityError('Não foi possível falar com o servidor de dados.')
  }

  if (!response.ok) {
    throw new AirQualityError(
      `O servidor de dados respondeu com erro ${response.status}.`,
      response.status,
    )
  }

  const raw = (await response.json()) as OpenMeteoResponse
  const series = normalize(city.id, raw)

  if (series.samples.length === 0) {
    throw new AirQualityError('O servidor não devolveu leituras para esta cidade.')
  }

  return series
}
