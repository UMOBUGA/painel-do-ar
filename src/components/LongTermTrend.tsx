import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCityHistory, type DailyHistoryEntry } from '@/hooks/useCityHistory'
import { formatDateOnly } from '@/lib/format'

interface Props {
  cityId: string
}

interface TooltipPayload {
  active?: boolean
  payload?: { payload: DailyHistoryEntry }[]
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  const entry = payload?.[0]?.payload
  if (!active || !entry) return null
  return (
    <div className="chart-tooltip">
      <p>{formatDateOnly(entry.date)}</p>
      <p>IQA {entry.aqi}</p>
    </div>
  )
}

/**
 * Complementa o `TrendChart` de 48h (que busca direto da Open-Meteo): aqui a
 * série é a média diária dos últimos 30 dias, agregada no servidor a partir
 * do mesmo snapshot que alimenta o ranking nacional — dado que a API pública
 * não entrega pronto numa granularidade diária.
 */
export function LongTermTrend({ cityId }: Props) {
  const { data, isPending, error } = useCityHistory(cityId, 30)

  if (isPending) return null
  if (error || !data || data.entries.length < 2) {
    return (
      <p className="section__note">
        Ainda não há histórico de 30 dias suficiente para {data?.name ?? 'esta cidade'} — a série
        cresce um dia por vez.
      </p>
    )
  }

  return (
    <>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.entries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateOnly}
              interval="preserveStartEnd"
              tick={{ fill: 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              stroke="var(--rule)"
            />
            <YAxis
              tick={{ fill: 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              stroke="var(--rule)"
              width={36}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="var(--band-sensiveis)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="visually-hidden">
        <caption>
          IQA médio diário de {data.name} nos últimos {data.days} dias
        </caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">IQA</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.date}>
              <th scope="row">{formatDateOnly(entry.date)}</th>
              <td>{entry.aqi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
