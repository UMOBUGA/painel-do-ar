import { useQuery } from '@tanstack/react-query'
import { fetchAirQuality } from '@/lib/api'
import { readSeries, writeSeries } from '@/lib/db'
import { findCity } from '@/data/capitals'
import type { AirQualitySeries } from '@/types/air'

export const airQualityKey = (cityId: string) => ['air-quality', cityId] as const

/**
 * Estratégia offline-first: o IndexedDB alimenta o estado inicial da query, de
 * modo que a tela já aparece preenchida na segunda visita, e a rede atualiza
 * por cima. Se a rede falhar mas houver cache, mostramos o cache com um aviso
 * em vez de uma tela de erro — dado antigo é mais útil que dado nenhum.
 */
export function useAirQuality(cityId: string) {
  return useQuery<AirQualitySeries>({
    queryKey: airQualityKey(cityId),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const city = findCity(cityId)
      if (!city) throw new Error(`Cidade desconhecida: ${cityId}`)

      try {
        const fresh = await fetchAirQuality(city, { signal })
        void writeSeries(fresh)
        return fresh
      } catch (error) {
        const cached = await readSeries(cityId)
        if (cached) return cached
        throw error
      }
    },
  })
}

/** Lê o cache antes de a query rodar, para pintar a tela sem esperar a rede. */
export async function preloadFromCache(cityId: string): Promise<AirQualitySeries | null> {
  return readSeries(cityId)
}
