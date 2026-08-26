import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AirQualitySeries } from '@/types/air'

const series: AirQualitySeries = {
  cityId: 'curitiba',
  fetchedAt: Date.now(),
  units: { pm2_5: 'µg/m³' },
  samples: [
    {
      time: '2026-08-14T13:00',
      pm2_5: 12,
      pm10: null,
      ozone: null,
      nitrogen_dioxide: null,
      sulphur_dioxide: null,
      carbon_monoxide: null,
    },
  ],
}

describe('db', () => {
  afterEach(() => {
    vi.doUnmock('idb')
    vi.resetModules()
  })

  it('grava e lê de volta a mesma série', async () => {
    const { readSeries, writeSeries } = await import('@/lib/db')
    await writeSeries(series)
    expect(await readSeries('curitiba')).toEqual(series)
  })

  it('lê null para cidade sem cache', async () => {
    const { readSeries } = await import('@/lib/db')
    expect(await readSeries('cidade-nunca-buscada')).toBeNull()
  })

  it('clearCache esvazia o store', async () => {
    const { readSeries, writeSeries, clearCache } = await import('@/lib/db')
    await writeSeries(series)
    await clearCache()
    expect(await readSeries('curitiba')).toBeNull()
  })

  it('isStale é falso logo após o fetch e verdadeiro depois de STALE_AFTER_MS', async () => {
    const { isStale, STALE_AFTER_MS } = await import('@/lib/db')
    const fresh: AirQualitySeries = { ...series, fetchedAt: 1_000_000 }
    expect(isStale(fresh, 1_000_000)).toBe(false)
    expect(isStale(fresh, 1_000_000 + STALE_AFTER_MS + 1)).toBe(true)
  })

  it('readSeries devolve null em vez de lançar quando o IndexedDB falha', async () => {
    vi.doMock('idb', () => ({
      openDB: () => Promise.reject(new Error('storage bloqueado')),
    }))
    vi.resetModules()
    const { readSeries } = await import('@/lib/db')
    await expect(readSeries('curitiba')).resolves.toBeNull()
  })

  it('writeSeries não lança quando o IndexedDB falha', async () => {
    vi.doMock('idb', () => ({
      openDB: () => Promise.reject(new Error('storage bloqueado')),
    }))
    vi.resetModules()
    const { writeSeries } = await import('@/lib/db')
    await expect(writeSeries(series)).resolves.toBeUndefined()
  })

  it('clearCache não lança quando o IndexedDB falha', async () => {
    vi.doMock('idb', () => ({
      openDB: () => Promise.reject(new Error('storage bloqueado')),
    }))
    vi.resetModules()
    const { clearCache } = await import('@/lib/db')
    await expect(clearCache()).resolves.toBeUndefined()
  })
})
