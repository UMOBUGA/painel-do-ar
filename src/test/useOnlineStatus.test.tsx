import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

describe('useOnlineStatus', () => {
  it('reflete navigator.onLine e reage a eventos online/offline', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })
})
