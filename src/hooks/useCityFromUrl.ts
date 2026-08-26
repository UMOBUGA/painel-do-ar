import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_CITY_ID, findCity } from '@/data/capitals'

function read(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('cidade')
  return fromUrl && findCity(fromUrl) ? fromUrl : DEFAULT_CITY_ID
}

/**
 * A cidade vive na URL para que o link seja compartilhável e o botão voltar
 * do navegador funcione como o usuário espera.
 */
export function useCityFromUrl(): [string, (id: string) => void] {
  const [cityId, setCityId] = useState(read)

  useEffect(() => {
    const onPop = () => setCityId(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const select = useCallback((id: string) => {
    if (!findCity(id)) return
    const url = new URL(window.location.href)
    url.searchParams.set('cidade', id)
    window.history.pushState({}, '', url)
    setCityId(id)
  }, [])

  return [cityId, select]
}
