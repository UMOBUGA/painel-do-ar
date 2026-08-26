import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AirQualitySeries } from '@/types/air'

/**
 * Cache offline. Guardar em IndexedDB (e não em localStorage) importa aqui por
 * dois motivos: a série horária de uma cidade passa fácil de 100 KB, e o acesso
 * é assíncrono, então não trava a thread principal enquanto a lista virtualizada
 * está rolando.
 */

interface AirDB extends DBSchema {
  series: {
    key: string
    value: AirQualitySeries
    indexes: { 'by-fetched-at': number }
  }
}

const DB_NAME = 'painel-do-ar'
const DB_VERSION = 1
const STORE = 'series'

/** Depois disso o dado em cache ainda é exibido, mas marcado como antigo. */
export const STALE_AFTER_MS = 60 * 60 * 1000

let dbPromise: Promise<IDBPDatabase<AirDB>> | null = null

function getDb(): Promise<IDBPDatabase<AirDB>> {
  dbPromise ??= openDB<AirDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'cityId' })
      store.createIndex('by-fetched-at', 'fetchedAt')
    },
  })
  return dbPromise
}

/**
 * Falhas de IndexedDB (aba anônima no Safari, cota estourada, storage
 * bloqueado) nunca devem derrubar a tela: o cache é otimização, não requisito.
 */
export async function readSeries(cityId: string): Promise<AirQualitySeries | null> {
  try {
    return (await (await getDb()).get(STORE, cityId)) ?? null
  } catch {
    return null
  }
}

export async function writeSeries(series: AirQualitySeries): Promise<void> {
  try {
    await (await getDb()).put(STORE, series)
  } catch {
    /* cache indisponível: seguimos sem ele */
  }
}

export async function clearCache(): Promise<void> {
  try {
    await (await getDb()).clear(STORE)
  } catch {
    /* nada a limpar */
  }
}

export function isStale(series: AirQualitySeries, now = Date.now()): boolean {
  return now - series.fetchedAt > STALE_AFTER_MS
}
