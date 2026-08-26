import type { BandId } from './aqi'

const VARS: Record<BandId, string> = {
  boa: 'var(--band-boa)',
  moderada: 'var(--band-moderada)',
  sensiveis: 'var(--band-sensiveis)',
  ruim: 'var(--band-ruim)',
  'muito-ruim': 'var(--band-muito-ruim)',
  pessima: 'var(--band-pessima)',
}

/**
 * As cores vivem em CSS custom properties para que o tema escuro possa
 * clareá-las sem que nenhum componente saiba disso.
 */
export function bandColor(id: BandId | undefined | null): string {
  return id ? VARS[id] : 'var(--rule)'
}
