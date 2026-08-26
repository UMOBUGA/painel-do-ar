import { formatConcentration } from '@/lib/format'
import {
  POLLUTANTS,
  POLLUTANT_FORMULAS,
  POLLUTANT_LABELS,
  type HourlySample,
  type Pollutant,
} from '@/types/air'

interface Props {
  sample: HourlySample
  units: Partial<Record<Pollutant, string>>
}

export function PollutantCards({ sample, units }: Props) {
  return (
    <ul className="cards">
      {POLLUTANTS.map((pollutant) => (
        <li key={pollutant} className="card">
          <p className="card__formula">{POLLUTANT_FORMULAS[pollutant]}</p>
          <p className="card__value">
            {formatConcentration(sample[pollutant])}
            <span className="card__unit">{units[pollutant] ?? 'µg/m³'}</span>
          </p>
          <p className="card__name">{POLLUTANT_LABELS[pollutant]}</p>
        </li>
      ))}
    </ul>
  )
}
