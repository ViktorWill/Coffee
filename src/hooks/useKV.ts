import { useState, useEffect, useCallback, useRef } from 'react'

type SetValueFn<T> = T | ((current: T) => T)

export function useKV<T>(key: string, defaultValue: T): [T, (value: SetValueFn<T>) => void] {
  const [value, setValueState] = useState<T>(defaultValue)
  const valueRef = useRef<T>(defaultValue)
  const initializedRef = useRef(false)

  // Fetch initial value from API
  useEffect(() => {
    let cancelled = false

    const fetchValue = async () => {
      try {
        const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.value !== undefined && data.value !== null) {
          setValueState(data.value as T)
          valueRef.current = data.value as T
        }
      } catch (error) {
        console.error(`useKV: Failed to fetch key "${key}":`, error)
      } finally {
        if (!cancelled) {
          initializedRef.current = true
        }
      }
    }

    fetchValue()
    return () => { cancelled = true }
  }, [key])

  // Persist to API whenever value changes (after initialization)
  const setValue = useCallback((newValue: SetValueFn<T>) => {
    const resolvedValue = typeof newValue === 'function'
      ? (newValue as (current: T) => T)(valueRef.current)
      : newValue

    valueRef.current = resolvedValue
    setValueState(resolvedValue)

    // Fire-and-forget persist to API
    fetch('/api/kv', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: resolvedValue }),
    }).catch((error) => {
      console.error(`useKV: Failed to persist key "${key}":`, error)
    })
  }, [key])

  return [value, setValue]
}
