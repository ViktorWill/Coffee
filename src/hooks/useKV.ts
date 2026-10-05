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

type PersistResult = { ok: true } | { ok: false; reason?: string; silent?: boolean }

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const data = await res.json()
    return typeof data?.error === 'string' ? data.error : undefined
  } catch {
    return undefined
  }
}

async function persistWithRetry(key: string, value: unknown): Promise<PersistResult> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('/api/kv', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) return { ok: true }
      if (res.status === 401 || res.status === 403) {
        triggerReauth()
        return { ok: false, silent: true }
      }
      const serverMessage = await readErrorMessage(res)
      lastError = new Error(serverMessage ? `HTTP ${res.status}: ${serverMessage}` : `HTTP ${res.status}`)
      // 4xx responses (other than throttling) won't succeed on retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        console.error(`useKV: Failed to persist key "${key}":`, lastError)
        return { ok: false, reason: serverMessage }
      }
    } catch (error) {
      lastError = error
    }
    // Exponential backoff: 200ms, 400ms, 800ms
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)))
    }
  }
  console.error(`useKV: Failed to persist key "${key}" after ${MAX_RETRIES} attempts:`, lastError)
  return { ok: false, reason: lastError instanceof Error ? lastError.message : undefined }
}

export interface UseKVCodec<T> {
  // Transform the in-memory (rich) value into the compact shape actually sent
  // to the server. Used e.g. to split large embedded data (like photos) out
  // into their own KV entries so the main document stays small.
  serialize?: (value: T) => T | Promise<T>
  // Reverse of serialize: rehydrate a value fetched from the server back into
  // its rich in-memory shape before it's exposed to consumers.
  deserialize?: (value: T) => T | Promise<T>
}

export function useKV<T>(
  key: string,
  defaultValue: T,
  codec?: UseKVCodec<T>
): [T, (value: SetValueFn<T>) => void, boolean] {
  const [value, setValueState] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const valueRef = useRef<T>(defaultValue)
  const dirtyRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codecRef = useRef<UseKVCodec<T> | undefined>(codec)
  codecRef.current = codec

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
          const deserialize = codecRef.current?.deserialize
          const hydrated = deserialize ? await deserialize(data.value as T) : (data.value as T)
          if (cancelled || dirtyRef.current) return
          setValueState(hydrated)
          valueRef.current = hydrated
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

    // Allow external code (e.g. a Refresh button) to ask every useKV instance
    // to re-pull from the server. We flush any pending local write first so
    // unsynced changes aren't silently overwritten by the refetch.
    const handleRefresh = async () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        const serialize = codecRef.current?.serialize
        const toPersist = serialize ? await serialize(valueRef.current) : valueRef.current
        const result = await persistWithRetry(key, toPersist)
        if (result.ok) {
          try { localStorage.removeItem(RECOVERY_PREFIX + key) } catch { /* ignore */ }
        }
      }
      dirtyRef.current = false
      setIsLoading(true)
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
          const deserialize = codecRef.current?.deserialize
          const hydrated = deserialize ? await deserialize(data.value as T) : (data.value as T)
          if (cancelled || dirtyRef.current) return
          setValueState(hydrated)
          valueRef.current = hydrated
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`useKV: Failed to refresh key "${key}":`, error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    window.addEventListener('kv:refresh', handleRefresh)

    return () => {
      cancelled = true
      window.removeEventListener('kv:refresh', handleRefresh)
      // Flush any pending debounced write so we don't drop data on unmount/key-change.
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        const flushKey = key
        const flushValue = valueRef.current
        const serialize = codecRef.current?.serialize
        void (async () => {
          const toPersist = serialize ? await serialize(flushValue) : flushValue
          const result = await persistWithRetry(flushKey, toPersist)
          if (result.ok) {
            try { localStorage.removeItem(RECOVERY_PREFIX + flushKey) } catch { /* ignore */ }
          }
        })()
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
      void (async () => {
        const serialize = codecRef.current?.serialize
        const persistedValue = serialize ? await serialize(valueToPersist) : valueToPersist
        const result = await persistWithRetry(key, persistedValue)
        if (result.ok) {
          try { localStorage.removeItem(RECOVERY_PREFIX + key) } catch { /* ignore */ }
        } else if (!result.silent) {
          toast.error(result.reason ?? "Couldn't save your changes. Check your connection and try again.", {
            id: `usekv-save-failed:${key}`,
          })
        }
      })()
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
