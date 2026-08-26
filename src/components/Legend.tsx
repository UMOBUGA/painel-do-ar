import { BANDS } from '@/lib/aqi'
import { bandColor } from '@/lib/bandColor'

export function Legend() {
  return (
    <ul className="legend">
      {BANDS.map((band) => (
        <li key={band.id}>
          <i style={{ '--band': bandColor(band.id) } as React.CSSProperties} aria-hidden="true" />
          {band.label} <span aria-hidden="true">·</span>{' '}
          <span className="visually-hidden">de </span>
          {band.min}
          <span aria-hidden="true">–</span>
          <span className="visually-hidden"> a </span>
          {band.max}
        </li>
      ))}
    </ul>
  )
}
