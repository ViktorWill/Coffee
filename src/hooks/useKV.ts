import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

type SetValueFn<T> = T | ((current: T) => T)

const DEBOUNCE_MS = 250
const MAX_RETRIES = 3
const RECOVERY_PREFIX = 'useKV:recovery:'

let reauthTriggered = false
function triggerReauth(): void {
  if (reauthTriggered) return
  reauthTriggered = true
  toast.error('Your session expired. Please sign in again.', {
    duration: 8000,
    action: {
      label: 'Sign in',
      onClick: () => {
        window.location.href = '/.auth/login/aad?post_login_redirect_uri=' +
          encodeURIComponent(window.location.pathname + window.location.search)
      },
    },
  })
}

async function persistWithRetry(key: string, value: unknown): Promise<boolean> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('/api/kv', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) return true
      if (res.status === 401) {
        triggerReauth()
        return false
      }
      lastError = new Error(`HTTP ${res.status}`)
    } catch (error) {
      lastError = error
    }
    // Exponential backoff: 200ms, 400ms, 800ms
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)))
    }
  }
  if (import.meta.env.DEV) {
    console.error(`useKV: Failed to persist key "${key}" after ${MAX_RETRIES} attempts:`, lastError)
  }
  return false
}

export function useKV<T>(
  key: string,
  defaultValue: T
): [T, (value: SetValueFn<T>) => void, boolean] {
  const [value, setValueState] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const valueRef = useRef<T>(defaultValue)
  const dirtyRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch initial value from API. If a local write happens before the GET
  // resolves, the response is discarded (dirtyRef) so we don't clobber user data.
  useEffect(() => {
    let cancelled = false
    dirtyRef.current = false
    setIsLoading(true)

    const fetchValue = async () => {
      try {
        const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`)
        if (cancelled || dirtyRef.current) return
        if (res.status === 401) {
          triggerReauth()
          return
        }
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || dirtyRef.current) return
        if (data.value !== undefined && data.value !== null) {
          setValueState(data.value as T)
          valueRef.current = data.value as T
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`useKV: Failed to fetch key "${key}":`, error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchValue()
    return () => {
      cancelled = true
      // Flush any pending debounced write so we don't drop data on unmount/key-change.
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        const flushKey = key
        const flushValue = valueRef.current
        void persistWithRetry(flushKey, flushValue).then((ok) => {
          if (ok) {
            try { localStorage.removeItem(RECOVERY_PREFIX + flushKey) } catch { /* ignore */ }
          }
        })
      }
    }
  }, [key])

  const schedulePersist = useCallback((latestValue: T) => {
    // Snapshot to localStorage as a recovery net before any network attempt.
    try {
      localStorage.setItem(RECOVERY_PREFIX + key, JSON.stringify(latestValue))
    } catch {
      // localStorage may be unavailable (private mode, quota); ignore.
    }

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      const valueToPersist = valueRef.current
      void persistWithRetry(key, valueToPersist).then((ok) => {
        if (ok) {
          try { localStorage.removeItem(RECOVERY_PREFIX + key) } catch { /* ignore */ }
        } else {
          toast.error("Couldn't save your changes. We'll keep retrying.", {
            id: `usekv-save-failed:${key}`,
          })
        }
      })
    }, DEBOUNCE_MS)
  }, [key])

  const setValue = useCallback((newValue: SetValueFn<T>) => {
    const resolvedValue = typeof newValue === 'function'
      ? (newValue as (current: T) => T)(valueRef.current)
      : newValue

    // Mark dirty so a still-in-flight initial GET won't clobber this write.
    dirtyRef.current = true
    valueRef.current = resolvedValue
    setValueState(resolvedValue)
    schedulePersist(resolvedValue)
  }, [schedulePersist])

  return [value, setValue, isLoading]
}
