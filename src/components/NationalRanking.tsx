import { BANDS, type BandId } from '@/lib/aqi'
import { bandColor } from '@/lib/bandColor'
import { formatDateOnly } from '@/lib/format'
import { useRanking } from '@/hooks/useRanking'
import { POLLUTANT_FORMULAS } from '@/types/air'

interface Props {
  selectedCityId: string
  onSelectCity: (cityId: string) => void
}

function bandLabel(id: BandId | string): string {
  return BANDS.find((b) => b.id === id)?.label ?? id
}

/**
 * As 27 capitais ordenadas da pior para a melhor qualidade do ar, lidas de
 * `/api/ranking` — o único dado do produto que vem de um snapshot diário no
 * servidor em vez de buscado ao vivo no cliente (ver `useRanking`). Cada
 * linha é um botão que troca a cidade selecionada, reaproveitando o mesmo
 * estado de `useCityFromUrl` que o seletor no cabeçalho já usa.
 */
export function NationalRanking({ selectedCityId, onSelectCity }: Props) {
  const { data, isPending, error } = useRanking()

  if (isPending) return null
  if (error || !data || data.entries.length === 0) {
    return (
      <p className="section__note">
        O ranking nacional ainda não tem dados — ele é populado uma vez por dia.
      </p>
    )
  }

  return (
    <ol className="ranking">
      {data.entries.map((entry, index) => (
        <li key={entry.cityId}>
          <button
            type="button"
            className="ranking__row"
            aria-current={entry.cityId === selectedCityId ? 'true' : undefined}
            onClick={() => onSelectCity(entry.cityId)}
          >
            <span className="ranking__position" aria-hidden="true">
              {index + 1}
            </span>
            <i
              className="ranking__chip"
              style={{ '--band': bandColor(entry.band as BandId) } as React.CSSProperties}
              aria-hidden="true"
            />
            <span className="ranking__place">
              {entry.name} <span className="ranking__state">{entry.state}</span>
            </span>
            <span className="ranking__meta">
              {POLLUTANT_FORMULAS[entry.dominant]} · {formatDateOnly(entry.date)}
            </span>
            <span className="ranking__aqi">
              {entry.aqi}
              <span className="visually-hidden"> de índice, faixa {bandLabel(entry.band)}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
