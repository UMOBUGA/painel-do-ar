import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { aggregateAqi } from '@/lib/aqi'
import { bandColor } from '@/lib/bandColor'
import { formatConcentration, formatDayHour } from '@/lib/format'
import type { HourlySample } from '@/types/air'

interface Props {
  samples: HourlySample[]
}

const ROW_HEIGHT = 40

/**
 * A série tem ~72 leituras por cidade, e a ideia é crescer para várias cidades
 * de uma vez. Virtualizar mantém o DOM em ~12 linhas independente do tamanho da
 * lista, que é o que segura o scroll a 60 fps em celular.
 *
 * Como as linhas são posicionadas em absolute, a tabela semântica não funciona:
 * usamos os papéis ARIA de grid explicitamente, com aria-rowcount informando o
 * total real para o leitor de tela — que é o número que ele deve anunciar, não
 * a quantidade de linhas presentes no DOM.
 */
export function HourlyTable({ samples }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = [...samples].reverse()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div
      className="table"
      role="grid"
      aria-label="Leituras hora a hora"
      aria-rowcount={rows.length}
    >
      <div className="table__head" role="row">
        <span role="columnheader">Hora</span>
        <span role="columnheader" className="table__num">
          PM2,5
        </span>
        <span role="columnheader" className="table__num">
          PM10
        </span>
        <span role="columnheader" className="table__num">
          IQA
        </span>
      </div>

      <div ref={scrollRef} className="table__scroll" tabIndex={0}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const sample = rows[item.index]!
            const reading = aggregateAqi(sample)
            return (
              <div
                key={sample.time}
                role="row"
                aria-rowindex={item.index + 1}
                className="table__row"
                style={
                  {
                    transform: `translateY(${item.start}px)`,
                    '--band': bandColor(reading?.band.id),
                  } as React.CSSProperties
                }
              >
                <span role="gridcell">{formatDayHour(sample.time)}</span>
                <span role="gridcell" className="table__num">
                  {formatConcentration(sample.pm2_5)}
                </span>
                <span role="gridcell" className="table__num">
                  {formatConcentration(sample.pm10)}
                </span>
                <span role="gridcell" className="table__aqi">
                  {reading?.aqi ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
