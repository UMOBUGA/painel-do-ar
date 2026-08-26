const hourFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

const dayHourFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const weekdayHourFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  hour: '2-digit',
})

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * A API devolve horários locais sem fuso ("2026-08-14T13:00"). O `Date` do
 * JavaScript interpreta isso como horário local do navegador, que é justamente
 * o que queremos exibir — mas só porque pedimos a série já convertida para o
 * fuso da cidade. Não trate essas strings como UTC.
 */
export function parseLocal(iso: string): Date {
  return new Date(iso)
}

export const formatHour = (iso: string) => hourFormat.format(parseLocal(iso))
export const formatDayHour = (iso: string) => dayHourFormat.format(parseLocal(iso))
export const formatWeekdayHour = (iso: string) => weekdayHourFormat.format(parseLocal(iso))

export function formatConcentration(value: number | null): string {
  return value == null ? '—' : decimal.format(value)
}

export function formatRelativeMinutes(from: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - from) / 60_000))
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return `há ${days} d`
}
