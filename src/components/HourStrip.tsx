import { useEffect, useRef, useState } from 'react'
import { aggregateAqi } from '@/lib/aqi'
import { bandColor } from '@/lib/bandColor'
import { formatDayHour, formatWeekdayHour } from '@/lib/format'
import type { HourlySample } from '@/types/air'

interface Props {
  samples: HourlySample[]
}

/** Altura relativa da barra. 200 no IQA já é "ruim"; acima disso satura. */
function heightFor(aqi: number): string {
  return `${Math.min(100, 12 + (aqi / 200) * 88)}%`
}

/**
 * Assinatura do painel: as últimas 48 horas lidas como estratos. Cada barra é
 * uma hora, a cor é a faixa do IQA e a altura é o valor. Dá para ver de relance
 * se o ar piorou de madrugada ou no pico da tarde — coisa que nem o número
 * grande nem a tabela mostram.
 *
 * Navegação por teclado usa roving tabindex: 48 paradas de Tab seria hostil,
 * então só a barra selecionada entra na ordem de foco e as setas percorrem o
 * resto, como num grupo de rádio.
 */
export function HourStrip({ samples }: Props) {
  const window48 = samples.slice(-48)
  const [selected, setSelected] = useState(window48.length - 1)
  const listRef = useRef<HTMLDivElement>(null)

  // Identifica a série: primeira hora + tamanho. Ao trocar de cidade voltamos
  // a selecionar a hora mais recente em vez de manter um índice que agora
  // aponta para outro momento.
  const seriesKey = `${window48[0]?.time ?? ''}:${window48.length}`
  const lastIndex = window48.length - 1
  useEffect(() => {
    setSelected(lastIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey])

  const readings = window48.map((sample) => ({ sample, reading: aggregateAqi(sample) }))
  const current = readings[selected]

  function move(delta: number) {
    const next = Math.min(Math.max(selected + delta, 0), window48.length - 1)
    setSelected(next)
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('.strip__bar')
    buttons?.[next]?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 6,
      PageDown: -6,
    }
    if (event.key in moves) {
      event.preventDefault()
      move(moves[event.key]!)
    } else if (event.key === 'Home') {
      event.preventDefault()
      move(-window48.length)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(window48.length)
    }
  }

  if (window48.length === 0) return null

  return (
    <section className="strip" aria-labelledby="strip-title">
      <div className="strip__caption">
        <h2 id="strip-title" className="strip__caption-title">
          Últimas 48 horas
        </h2>
        <span aria-hidden="true">
          {formatWeekdayHour(window48[0]!.time)} → {formatWeekdayHour(window48.at(-1)!.time)}
        </span>
      </div>

      <div
        ref={listRef}
        className="strip__bars"
        role="group"
        aria-label="Índice de qualidade do ar hora a hora. Use as setas para percorrer."
        onKeyDown={onKeyDown}
      >
        {readings.map(({ sample, reading }, i) => (
          <button
            key={sample.time}
            type="button"
            className="strip__bar"
            style={{ '--i': i, '--band': bandColor(reading?.band.id) } as React.CSSProperties}
            tabIndex={i === selected ? 0 : -1}
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
            onFocus={() => setSelected(i)}
          >
            <span className="visually-hidden">
              {formatDayHour(sample.time)}:{' '}
              {reading ? `IQA ${reading.aqi}, ${reading.band.label}` : 'sem leitura'}
            </span>
            <i style={{ height: reading ? heightFor(reading.aqi) : '4%' }} />
          </button>
        ))}
      </div>

      <p className="strip__detail" aria-live="polite">
        {current?.reading ? (
          <>
            <b>{formatDayHour(current.sample.time)}</b> · IQA {current.reading.aqi} ·{' '}
            {current.reading.band.label}
          </>
        ) : (
          'Sem leitura para esta hora.'
        )}
      </p>
    </section>
  )
}
