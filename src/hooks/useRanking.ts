import { useQuery } from '@tanstack/react-query'
import type { BandId } from '@/lib/aqi'

export interface RankingEntry {
  cityId: string
  name: string
  state: string
  date: string
  aqi: number
  band: BandId
  dominant: 'pm2_5' | 'pm10'
}

interface RankingResponse {
  capitals: number
  entries: RankingEntry[]
}

/**
 * Ranking das 27 capitais é o único dado do produto que não dá para buscar
 * direto do cliente sem custo — comparar 27 cidades ao vivo seria 27
 * requisições paralelas por visitante. `/api/ranking` lê de uma tabela
 * populada 1x/dia pelo cron (`api/cron/snapshot.ts`), então o endpoint é
 * barato e cacheável.
 */
export function useRanking() {
  return useQuery<RankingResponse>({
    queryKey: ['ranking'],
    staleTime: 15 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/ranking', { signal })
      if (!response.ok) throw new Error('Não foi possível carregar o ranking nacional.')
      return (await response.json()) as RankingResponse
    },
  })
}
