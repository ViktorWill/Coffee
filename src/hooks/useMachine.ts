import { useCallback, useEffect, useState } from 'react'

export interface CoffeeBoilerState {
  targetTemperature: number | null
  currentTemperature: number | null
  status: string | null
  ready: boolean
  minTemperature: number
  maxTemperature: number
  step: number
}

export interface MachineStatus {
  configured: boolean
  mock: boolean
  serialNumber: string | null
  name: string | null
  model: string | null
  connected: boolean
  state: string | null
  mode: string | null
  powered: boolean
  brewing: boolean
  coffeeBoiler: CoffeeBoilerState
}

/**
 * La Marzocco machine state and controls.
 *
 * Commands are only *accepted* by La Marzocco's cloud, not confirmed applied —
 * so after every write we re-read status rather than assuming it took effect.
 */
export function useMachine() {
  const [status, setStatus] = useState<MachineStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/machine')
      if (!res.ok) {
        // 503 means the integration isn't set up — a normal state, not an error.
        setStatus(null)
        return
      }
      setStatus((await res.json()) as MachineStatus)
    } catch {
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const post = useCallback(
    async (path: string, body: unknown): Promise<boolean> => {
      setIsBusy(true)
      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        // Give the machine a moment before re-reading, since the command is
        // applied asynchronously on La Marzocco's side.
        await new Promise((r) => setTimeout(r, 1200))
        await refresh()
        return true
      } finally {
        setIsBusy(false)
      }
    },
    [refresh],
  )

  const setTemperature = useCallback(
    (targetTemperature: number) => post('/api/machine/temperature', { targetTemperature }),
    [post],
  )

  const setPower = useCallback(
    (enabled: boolean) => post('/api/machine/power', { enabled }),
    [post],
  )

  return {
    status,
    isLoading,
    isBusy,
    available: Boolean(status?.configured),
    refresh,
    setTemperature,
    setPower,
  }
}
