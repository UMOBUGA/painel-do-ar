/**
 * Cálculo do Índice de Qualidade do Ar (IQA) a partir das concentrações
 * horárias devolvidas pela Open-Meteo.
 *
 * Usamos as faixas da US EPA (revisão de 2024 para PM2.5) porque são as mais
 * documentadas publicamente e permitem comparar cidades brasileiras com
 * qualquer outra do mundo. O índice final é o maior IQA entre os poluentes
 * calculados — é assim que a EPA define o índice agregado, e o poluente que
 * produziu esse valor é o "poluente dominante".
 */

export type BandId = 'boa' | 'moderada' | 'sensiveis' | 'ruim' | 'muito-ruim' | 'pessima'

export interface Band {
  id: BandId
  label: string
  /** Conselho prático, não descrição do índice. */
  advice: string
  min: number
  max: number
}

export const BANDS: readonly Band[] = [
  {
    id: 'boa',
    label: 'Boa',
    advice: 'Pode abrir as janelas e treinar ao ar livre.',
    min: 0,
    max: 50,
  },
  {
    id: 'moderada',
    label: 'Moderada',
    advice: 'Quem tem asma ou rinite pode sentir irritação em esforço longo.',
    min: 51,
    max: 100,
  },
  {
    id: 'sensiveis',
    label: 'Ruim para grupos sensíveis',
    advice:
      'Crianças, idosos e pessoas com doença respiratória devem reduzir o esforço ao ar livre.',
    min: 101,
    max: 150,
  },
  {
    id: 'ruim',
    label: 'Ruim',
    advice: 'Evite exercício ao ar livre. Mantenha as janelas fechadas nos horários de pico.',
    min: 151,
    max: 200,
  },
  {
    id: 'muito-ruim',
    label: 'Muito ruim',
    advice: 'Fique em ambiente fechado. Use máscara PFF2 se precisar sair.',
    min: 201,
    max: 300,
  },
  {
    id: 'pessima',
    label: 'Péssima',
    advice: 'Risco para todos. Saia apenas se for necessário e use máscara PFF2.',
    min: 301,
    max: 500,
  },
] as const

/** Poluentes para os quais existe conversão em IQA. */
export type IndexedPollutant = 'pm2_5' | 'pm10'

interface Breakpoint {
  cLow: number
  cHigh: number
  iLow: number
  iHigh: number
}

/** Concentrações em µg/m³. */
const BREAKPOINTS: Record<IndexedPollutant, readonly Breakpoint[]> = {
  pm2_5: [
    { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
    { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
    { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
    { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
  ],
}

/**
 * Converte uma concentração em IQA por interpolação linear dentro da faixa.
 * Devolve `null` para entradas inválidas — o chamador decide como exibir a
 * ausência de dado, em vez de receber um zero que parece leitura real.
 */
export function toAqi(
  pollutant: IndexedPollutant,
  concentration: number | null | undefined,
): number | null {
  if (concentration == null || !Number.isFinite(concentration) || concentration < 0) {
    return null
  }

  const table = BREAKPOINTS[pollutant]
  const ceiling = table[table.length - 1]!

  // Acima da última faixa a EPA não define conversão: fixamos no teto.
  if (concentration > ceiling.cHigh) return ceiling.iHigh

  const bp = table.find((b) => concentration >= b.cLow && concentration <= b.cHigh)
  // Lacunas entre faixas (ex.: 9.05 em PM2.5) caem aqui: usamos a faixa seguinte.
  const target = bp ?? table.find((b) => concentration < b.cLow)
  if (!target) return ceiling.iHigh

  const ratio = (target.iHigh - target.iLow) / (target.cHigh - target.cLow)
  return Math.round(target.iLow + ratio * (Math.max(concentration, target.cLow) - target.cLow))
}

export function bandFor(aqi: number | null | undefined): Band | null {
  if (aqi == null || !Number.isFinite(aqi)) return null
  const clamped = Math.min(Math.max(aqi, 0), 500)
  return BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? null
}

export interface AqiReading {
  aqi: number
  dominant: IndexedPollutant
  band: Band
}

/**
 * IQA agregado de uma leitura horária: o maior índice entre os poluentes.
 */
export function aggregateAqi(sample: {
  pm2_5?: number | null
  pm10?: number | null
}): AqiReading | null {
  const candidates = (['pm2_5', 'pm10'] as const)
    .map((p) => ({ pollutant: p, aqi: toAqi(p, sample[p]) }))
    .filter((c): c is { pollutant: IndexedPollutant; aqi: number } => c.aqi !== null)

  if (candidates.length === 0) return null

  const worst = candidates.reduce((a, b) => (b.aqi > a.aqi ? b : a))
  const band = bandFor(worst.aqi)
  if (!band) return null

  return { aqi: worst.aqi, dominant: worst.pollutant, band }
}
