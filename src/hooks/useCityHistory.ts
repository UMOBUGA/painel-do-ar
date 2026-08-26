import { useQuery } from '@tanstack/react-query'
import type { BandId } from '@/lib/aqi'

export interface DailyHistoryEntry {
  date: string
  aqi: number
  band: BandId
  dominant: 'pm2_5' | 'pm10'
  pm25: number | null
  pm10: number | null
}

interface CityHistoryResponse {
  cityId: string
  name: string
  state: string
  days: number
  entries: DailyHistoryEntry[]
}

/**
 * Média diária dos últimos N dias de uma capital, agregada no servidor a
 * partir da mesma tabela que alimenta `/api/ranking` — não custa nada de
 * infraestrutura extra reaproveitar o mesmo snapshot para os dois usos.
 * Complementa (não substitui) o `TrendChart` de 48h que já busca direto da
 * Open-Meteo: aqui a fonte é o snapshot diário do servidor, não a leitura
 * horária.
 */
export function useCityHistory(cityId: string, days = 30) {
  return useQuery<CityHistoryResponse>({
    queryKey: ['city-history', cityId, days],
    staleTime: 15 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/history/${cityId}?days=${days}`, { signal })
      if (!response.ok) throw new Error('Não foi possível carregar o histórico da cidade.')
      return (await response.json()) as CityHistoryResponse
    },
  })
}
