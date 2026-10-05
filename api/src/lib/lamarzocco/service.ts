/**
 * Machine state normalisation and the mock used until real hardware arrives.
 *
 * The dashboard returns a `widgets` array whose exact shape for a Linea Mini R
 * we cannot verify without the machine, so parsing here is deliberately
 * defensive: unknown shapes degrade to nulls rather than throwing, and the raw
 * dashboard is passed through so the real structure can be inspected on day one.
 */

import { LaMarzoccoClient, MachineMode, type CommandAccepted } from './client.js'
import { credentialStore, isMockMode } from './config.js'

export interface CoffeeBoilerState {
  targetTemperature: number | null
  /**
   * Live boiler temperature. Always null on a Linea Mini R — the dashboard
   * exposes only the setpoint and a coarse `status`. Kept because the field may
   * be populated on other models or over the websocket feed we don't subscribe to.
   */
  currentTemperature: number | null
  /** BoilerStatus: StandBy | HeatingUp | Ready | NoWater | Off */
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
  /** MachineState: StandBy | PoweredOn | Brewing | Off */
  state: string | null
  mode: string | null
  powered: boolean
  brewing: boolean
  coffeeBoiler: CoffeeBoilerState
  /** Unparsed dashboard, for verifying widget shape against real hardware. */
  raw?: unknown
}

/** Conservative fallbacks, replaced by the machine's own limits when present. */
const DEFAULT_TEMP_BOUNDS = { min: 85, max: 96, step: 0.1 }

const NOT_CONFIGURED: MachineStatus = {
  configured: false,
  mock: false,
  serialNumber: null,
  name: null,
  model: null,
  connected: false,
  state: null,
  mode: null,
  powered: false,
  brewing: false,
  coffeeBoiler: {
    targetTemperature: null,
    currentTemperature: null,
    status: null,
    ready: false,
    minTemperature: DEFAULT_TEMP_BOUNDS.min,
    maxTemperature: DEFAULT_TEMP_BOUNDS.max,
    step: DEFAULT_TEMP_BOUNDS.step,
  },
}

/**
 * Mutable mock state.
 *
 * Deliberately stateful: a static mock would always report the old setpoint,
 * so the UI could never be verified past "command sent". In-process only, so it
 * resets on restart — fine, since this exists purely for pre-hardware development.
 */
const mockState = {
  powered: true,
  targetTemperature: 93.0,
}

function mockStatus(): MachineStatus {
  return {
    configured: true,
    mock: true,
    serialNumber: 'MOCK-LMR-0001',
    name: 'Linea Mini R',
    model: 'Linea Mini R',
    connected: true,
    state: mockState.powered ? 'PoweredOn' : 'StandBy',
    mode: mockState.powered ? MachineMode.BrewingMode : MachineMode.StandBy,
    powered: mockState.powered,
    brewing: false,
    coffeeBoiler: {
      targetTemperature: mockState.targetTemperature,
      // Pretend the boiler tracks the setpoint closely once powered.
      currentTemperature: mockState.powered ? mockState.targetTemperature - 0.4 : 21.0,
      status: mockState.powered ? 'Ready' : 'StandBy',
      ready: mockState.powered,
      minTemperature: 85,
      maxTemperature: 96,
      step: 0.1,
    },
  }
}

/** Pull a widget's payload out of the dashboard by its WidgetType code. */
function findWidget(dashboard: Record<string, unknown>, code: string): Record<string, unknown> | null {
  const widgets = dashboard?.widgets
  if (!Array.isArray(widgets)) return null

  const match = widgets.find((w) => (w as Record<string, unknown>)?.code === code) as
    | Record<string, unknown>
    | undefined
  if (!match) return null

  // Widgets carry their data under `output`; fall back to the widget itself in
  // case the shape differs on this model.
  const output = match.output
  return (output && typeof output === 'object' ? output : match) as Record<string, unknown>
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

export function normalizeDashboard(dashboard: Record<string, unknown>, includeRaw = false): MachineStatus {
  const machine = findWidget(dashboard, 'CMMachineStatus')
  const boiler = findWidget(dashboard, 'CMCoffeeBoiler')

  const state = str(machine?.status)
  const mode = str(machine?.mode)
  const boilerStatus = str(boiler?.status)

  return {
    configured: true,
    mock: false,
    serialNumber: str(dashboard.serialNumber),
    name: str(dashboard.name),
    model: str(dashboard.modelName),
    connected: dashboard.connected === true,
    state,
    mode,
    powered: state === 'PoweredOn' || state === 'Brewing',
    brewing: state === 'Brewing' || machine?.brewingStartTime != null,
    coffeeBoiler: {
      targetTemperature: num(boiler?.targetTemperature),
      currentTemperature: num(boiler?.currentTemperature) ?? num(boiler?.temperature),
      status: boilerStatus,
      ready: boilerStatus === 'Ready',
      minTemperature: num(boiler?.targetTemperatureMin) ?? DEFAULT_TEMP_BOUNDS.min,
      maxTemperature: num(boiler?.targetTemperatureMax) ?? DEFAULT_TEMP_BOUNDS.max,
      step: num(boiler?.targetTemperatureStep) ?? DEFAULT_TEMP_BOUNDS.step,
    },
    ...(includeRaw ? { raw: dashboard } : {}),
  }
}

/** Resolve credentials and the target serial, or null when unconfigured. */
async function connect(
  userId: string,
): Promise<{ client: LaMarzoccoClient; serialNumber: string } | null> {
  const creds = await credentialStore.getCredentials(userId)
  if (!creds) return null

  const client = new LaMarzoccoClient(creds.username, creds.password, creds.installationKey)

  if (creds.serialNumber) return { client, serialNumber: creds.serialNumber }

  const things = await client.listThings()
  if (things.length === 0) return null

  return { client, serialNumber: things[0].serialNumber }
}

export async function getMachineStatus(userId: string, includeRaw = false): Promise<MachineStatus> {
  if (isMockMode()) return mockStatus()

  const conn = await connect(userId)
  if (!conn) return NOT_CONFIGURED

  const dashboard = await conn.client.getDashboard(conn.serialNumber)
  return normalizeDashboard(dashboard, includeRaw)
}

export async function setMachinePower(userId: string, enabled: boolean): Promise<CommandAccepted> {
  if (isMockMode()) {
    mockState.powered = enabled
    return { accepted: true, commandId: 'mock-power' }
  }

  const conn = await connect(userId)
  if (!conn) throw new Error('La Marzocco integration is not configured')

  return conn.client.setPower(conn.serialNumber, enabled)
}

export async function setCoffeeTemperature(
  userId: string,
  targetTemperature: number,
): Promise<CommandAccepted> {
  if (isMockMode()) {
    mockState.targetTemperature = Math.round(targetTemperature * 10) / 10
    return { accepted: true, commandId: 'mock-temp' }
  }

  const conn = await connect(userId)
  if (!conn) throw new Error('La Marzocco integration is not configured')

  return conn.client.setCoffeeTargetTemperature(conn.serialNumber, targetTemperature)
}

/**
 * Guard against sending a nonsensical setpoint to a boiler.
 *
 * Bounds come from the machine when known; these are a backstop for the case
 * where the dashboard has not been read yet.
 */
export function assertTemperatureInRange(
  target: number,
  bounds: { min: number; max: number } = DEFAULT_TEMP_BOUNDS,
): void {
  if (!Number.isFinite(target)) {
    throw new Error('targetTemperature must be a number')
  }
  if (target < bounds.min || target > bounds.max) {
    throw new Error(`targetTemperature ${target}°C is outside the allowed ${bounds.min}–${bounds.max}°C range`)
  }
}
