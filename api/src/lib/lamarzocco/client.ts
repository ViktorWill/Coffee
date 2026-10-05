/**
 * Minimal La Marzocco cloud client.
 *
 * Covers only what Bean Sheet needs — read machine state, set power, set the
 * coffee boiler target temperature. Endpoint shapes follow pylamarzocco.
 *
 * Note: the API rejects unsigned requests with 412, so every call goes through
 * restCall() which attaches the signing headers.
 */

import {
  buildRegistrationHeaders,
  buildRequestHeaders,
  publicKeyB64,
  type InstallationKey,
} from './auth.js'

export const CUSTOMER_APP_URL = 'https://lion.lamarzocco.io/api/customer-app'

/** Refresh a little before actual expiry to avoid racing the boundary. */
const TOKEN_LIFETIME_MS = 60 * 60 * 1000
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

export class LaMarzoccoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message)
    this.name = 'LaMarzoccoError'
  }
}

export class LaMarzoccoAuthError extends LaMarzoccoError {
  constructor(message: string, status?: number, body?: string) {
    super(message, status, body)
    this.name = 'LaMarzoccoAuthError'
  }
}

export interface Thing {
  serialNumber: string
  name?: string
  modelName?: string
  connected?: boolean
  [key: string]: unknown
}

/** Machine operating modes, mirroring pylamarzocco's MachineMode enum. */
export const MachineMode = {
  BrewingMode: 'BrewingMode',
  EcoMode: 'EcoMode',
  StandBy: 'StandBy',
} as const

export interface CommandAccepted {
  /** La Marzocco accepted the command. Not proof the machine applied it. */
  accepted: true
  commandId: string | null
}

interface StoredToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export class LaMarzoccoClient {
  private token: StoredToken | null = null

  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly installationKey: InstallationKey,
  ) {}

  /**
   * One-time registration of this installation key with La Marzocco.
   * Must be called once per key before any authenticated request will work.
   */
  async registerClient(): Promise<void> {
    const res = await fetch(`${CUSTOMER_APP_URL}/auth/init`, {
      method: 'POST',
      headers: {
        ...buildRegistrationHeaders(this.installationKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pk: publicKeyB64(this.installationKey) }),
    })

    if (res.ok) return

    const body = await res.text()
    if (res.status === 401) {
      throw new LaMarzoccoAuthError('Invalid username or password', res.status, body)
    }
    throw new LaMarzoccoError(`Registration failed (${res.status})`, res.status, body)
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now()

    if (this.token && this.token.expiresAt > now + TOKEN_REFRESH_MARGIN_MS) {
      return this.token.accessToken
    }

    // Try a refresh first; fall back to a full sign-in if it is rejected.
    if (this.token) {
      try {
        this.token = await this.fetchToken('/auth/refreshtoken', {
          username: this.username,
          refreshToken: this.token.refreshToken,
        })
        return this.token.accessToken
      } catch {
        this.token = null
      }
    }

    this.token = await this.fetchToken('/auth/signin', {
      username: this.username,
      password: this.password,
    })
    return this.token.accessToken
  }

  private async fetchToken(path: string, payload: Record<string, string>): Promise<StoredToken> {
    // The token endpoints are signed too — omitting these yields 412, not 401.
    const res = await fetch(`${CUSTOMER_APP_URL}${path}`, {
      method: 'POST',
      headers: {
        ...buildRequestHeaders(this.installationKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = await res.text()
    if (!res.ok) {
      const message = res.status === 401 ? 'Invalid username or password' : `Token request failed (${res.status})`
      throw new LaMarzoccoAuthError(message, res.status, body)
    }

    const data = JSON.parse(body) as { accessToken?: string; refreshToken?: string }
    if (!data.accessToken || !data.refreshToken) {
      throw new LaMarzoccoAuthError('Token response missing accessToken/refreshToken', res.status, body)
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + TOKEN_LIFETIME_MS,
    }
  }

  private async restCall<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown): Promise<T> {
    const accessToken = await this.getAccessToken()

    const res = await fetch(`${CUSTOMER_APP_URL}${path}`, {
      method,
      headers: {
        ...buildRequestHeaders(this.installationKey),
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15_000),
    })

    const body = await res.text()
    if (!res.ok) {
      // 412 means the signing headers were rejected — almost always a bug in
      // buildRequestHeaders rather than anything the caller did.
      const hint = res.status === 412 ? ' (request signature rejected)' : ''
      throw new LaMarzoccoError(`${method} ${path} failed (${res.status})${hint}`, res.status, body)
    }

    return (body ? JSON.parse(body) : null) as T
  }

  listThings(): Promise<Thing[]> {
    return this.restCall<Thing[]>('/things')
  }

  getDashboard(serialNumber: string): Promise<Record<string, unknown>> {
    return this.restCall(`/things/${serialNumber}/dashboard`)
  }

  getSettings(serialNumber: string): Promise<Record<string, unknown>> {
    return this.restCall(`/things/${serialNumber}/settings`)
  }

  /**
   * Send a command to the machine.
   *
   * Returns the command id. Note this only means La Marzocco *accepted* the
   * command — actual confirmation arrives asynchronously over their websocket,
   * which we deliberately don't subscribe to. Callers should treat success as
   * "queued", not "applied", and re-read the dashboard to confirm state.
   */
  private async executeCommand(
    serialNumber: string,
    command: string,
    data?: Record<string, unknown>,
  ): Promise<CommandAccepted> {
    const response = await this.restCall<Array<{ id?: string }>>(
      `/things/${serialNumber}/command/${command}`,
      'POST',
      data,
    )

    const id = Array.isArray(response) ? response[0]?.id : undefined
    return { accepted: true, commandId: id ?? null }
  }

  setPower(serialNumber: string, enabled: boolean): Promise<CommandAccepted> {
    return this.executeCommand(serialNumber, 'CoffeeMachineChangeMode', {
      mode: enabled ? MachineMode.BrewingMode : MachineMode.StandBy,
    })
  }

  setCoffeeTargetTemperature(
    serialNumber: string,
    targetTemperature: number,
    boilerIndex = 1,
  ): Promise<CommandAccepted> {
    return this.executeCommand(serialNumber, 'CoffeeMachineSettingCoffeeBoilerTargetTemperature', {
      boilerIndex,
      // The API expects at most one decimal place.
      targetTemperature: Math.round(targetTemperature * 10) / 10,
    })
  }

  setSteam(serialNumber: string, enabled: boolean, boilerIndex = 1): Promise<CommandAccepted> {
    return this.executeCommand(serialNumber, 'CoffeeMachineSettingSteamBoilerEnabled', {
      boilerIndex,
      enabled,
    })
  }
}
