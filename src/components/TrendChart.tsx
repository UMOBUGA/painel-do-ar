import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatConcentration, formatDayHour, formatWeekdayHour } from '@/lib/format'
import type { HourlySample } from '@/types/air'

interface Props {
  samples: HourlySample[]
}

interface TooltipPayload {
  active?: boolean
  payload?: { payload: HourlySample }[]
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  const sample = payload?.[0]?.payload
  if (!active || !sample) return null
  return (
    <div className="chart-tooltip">
      <p>{formatDayHour(sample.time)}</p>
      <p>PM2,5 {formatConcentration(sample.pm2_5)} µg/m³</p>
      <p>PM10 {formatConcentration(sample.pm10)} µg/m³</p>
    </div>
  )
}

/**
 * Gráfico com equivalente textual: o SVG do Recharts é invisível para leitor de
 * tela, então a mesma série vai numa tabela escondida visualmente. É o padrão
 * que o WCAG chama de alternativa não-visual, e custa dez linhas.
 */
export function TrendChart({ samples }: Props) {
  const data = samples.slice(-48)

  return (
    <>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={formatWeekdayHour}
              interval={7}
              tick={{ fill: 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              stroke="var(--rule)"
            />
            <YAxis
              tick={{ fill: 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              stroke="var(--rule)"
              width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="pm2_5"
              stroke="var(--band-ruim)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="pm10"
              stroke="var(--ink-soft)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="visually-hidden">
        <caption>Concentração de material particulado nas últimas 48 horas</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th scope="col">PM2,5 em µg/m³</th>
            <th scope="col">PM10 em µg/m³</th>
          </tr>
        </thead>
        <tbody>
          {data.map((sample) => (
            <tr key={sample.time}>
              <th scope="row">{formatDayHour(sample.time)}</th>
              <td>{formatConcentration(sample.pm2_5)}</td>
              <td>{formatConcentration(sample.pm10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
