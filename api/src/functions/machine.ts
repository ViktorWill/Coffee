/**
 * La Marzocco machine control endpoints.
 *
 *   GET  /api/machine              current status
 *   POST /api/machine/power        { enabled: boolean }
 *   POST /api/machine/temperature  { targetTemperature: number }
 *
 * These drive a real heating appliance, so both write endpoints validate input
 * and the temperature is bounded by the machine's own reported limits.
 *
 * Access control comes from staticwebapp.config.json (/api/* requires an
 * authenticated role). The principal is read here so per-user credentials can
 * be introduced later without reworking the handlers.
 */

import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import {
  assertTemperatureInRange,
  getMachineStatus,
  setCoffeeTemperature,
  setMachinePower,
} from '../lib/lamarzocco/service.js'

/** Read the SWA client principal injected by the platform. */
function getUserId(request: HttpRequest): string {
  const header = request.headers.get('x-ms-client-principal')
  if (!header) return 'local-dev'

  try {
    const principal = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as {
      userId?: string
    }
    return principal.userId || 'local-dev'
  } catch {
    return 'local-dev'
  }
}

function errorResponse(error: unknown): HttpResponseInit {
  const message = error instanceof Error ? error.message : 'Internal server error'
  console.error('Machine API error:', error)

  // Surface the unconfigured case distinctly so the UI can hide the controls
  // rather than showing a scary failure.
  if (message.includes('not configured')) {
    return { status: 503, jsonBody: { error: message, configured: false } }
  }
  return { status: 500, jsonBody: { error: message } }
}

app.http('machine-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machine',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      // ?raw=1 dumps the unparsed dashboard — for verifying widget shapes
      // against the real machine.
      const includeRaw = request.query.get('raw') === '1'
      return { jsonBody: await getMachineStatus(getUserId(request), includeRaw) }
    } catch (error) {
      return errorResponse(error)
    }
  },
})

app.http('machine-power', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'machine/power',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const body = (await request.json()) as { enabled?: unknown }
      if (typeof body.enabled !== 'boolean') {
        return { status: 400, jsonBody: { error: 'Body must be { "enabled": boolean }' } }
      }

      const result = await setMachinePower(getUserId(request), body.enabled)
      return { jsonBody: { ...result, enabled: body.enabled } }
    } catch (error) {
      return errorResponse(error)
    }
  },
})

app.http('machine-temperature', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'machine/temperature',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const body = (await request.json()) as { targetTemperature?: unknown }
      const target = Number(body.targetTemperature)

      if (!Number.isFinite(target)) {
        return { status: 400, jsonBody: { error: 'Body must be { "targetTemperature": number }' } }
      }

      const userId = getUserId(request)

      // Prefer the machine's own limits over our conservative defaults.
      let bounds: { min: number; max: number } | undefined
      try {
        const status = await getMachineStatus(userId)
        if (status.configured) {
          bounds = {
            min: status.coffeeBoiler.minTemperature,
            max: status.coffeeBoiler.maxTemperature,
          }
        }
      } catch {
        // Fall back to the defaults in assertTemperatureInRange.
      }

      try {
        assertTemperatureInRange(target, bounds)
      } catch (validationError) {
        return {
          status: 400,
          jsonBody: { error: (validationError as Error).message },
        }
      }

      const result = await setCoffeeTemperature(userId, target)
      return { jsonBody: { ...result, targetTemperature: target } }
    } catch (error) {
      return errorResponse(error)
    }
  },
})
