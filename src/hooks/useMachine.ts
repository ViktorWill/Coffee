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

/** Confirmation window: ~6s observed on real hardware, with headroom. */
const POLL_ATTEMPTS = 8
const POLL_INTERVAL_MS = 1500

/**
 * La Marzocco machine state and controls.
 *
 * Commands are only *accepted* by La Marzocco's cloud, not confirmed applied —
 * so after every write we poll status until the change is observed rather than
 * assuming it took effect.
 */
export function useMachine() {
  const [status, setStatus] = useState<MachineStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)

  /** Returns null when unreachable or not configured (the API answers 503). */
  const fetchStatus = useCallback(async (): Promise<MachineStatus | null> => {
    try {
      const res = await fetch('/api/machine')
      if (!res.ok) return null
      return (await res.json()) as MachineStatus
    } catch {
      return null
    }
  }, [])

  const refresh = useCallback(async () => {
    setStatus(await fetchStatus())
    setIsLoading(false)
  }, [fetchStatus])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * Send a command, then poll until the machine actually reports the change.
   *
   * La Marzocco only *accepts* commands over REST — confirmation comes later.
   * Measured against a real Linea Mini R, a boiler setpoint takes about 4–6
   * seconds to show up, so a single delayed re-read reports stale state and the
   * UI looks like the command was ignored.
   */
  const post = useCallback(
    async (path: string, body: unknown, applied: (s: MachineStatus) => boolean): Promise<boolean> => {
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

        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
          const next = await fetchStatus()
          if (next) {
            setStatus(next)
            if (applied(next)) return true
          }
        }

        // Accepted but not observed — the machine may still apply it, so this
        // is reported as unconfirmed rather than as a failure.
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [fetchStatus],
  )

  const setTemperature = useCallback(
    (targetTemperature: number) =>
      post(
        '/api/machine/temperature',
        { targetTemperature },
        (s) =>
          s.coffeeBoiler.targetTemperature !== null &&
          Math.abs(s.coffeeBoiler.targetTemperature - targetTemperature) < 0.05,
      ),
    [post],
  )

  const setPower = useCallback(
    (enabled: boolean) => post('/api/machine/power', { enabled }, (s) => s.powered === enabled),
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
