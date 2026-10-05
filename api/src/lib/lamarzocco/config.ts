/**
 * Credential resolution for the La Marzocco integration.
 *
 * Deliberately behind an interface. Today there is one machine and one set of
 * credentials in app settings; when Bean Sheet supports multiple users this is
 * the only module that changes — swap in a store that reads a per-user secret
 * from Key Vault, keyed by the SWA principal id.
 *
 * Credentials are never written to Cosmos. The KV store is user-writable data;
 * these unlock a heating appliance.
 */

import {
  deserializeInstallationKey,
  type InstallationKey,
  type SerializedInstallationKey,
} from './auth.js'

export interface LaMarzoccoCredentials {
  username: string
  password: string
  installationKey: InstallationKey
  /** Optional: pins a machine when the account has more than one. */
  serialNumber?: string
}

export interface CredentialStore {
  /** Returns null when the integration is not configured for this user. */
  getCredentials(userId: string): Promise<LaMarzoccoCredentials | null>
}

/**
 * Single-tenant store backed by app settings.
 *
 * LM_INSTALLATION_KEY holds the JSON produced by scripts/lm-register.mjs. It is
 * generated and registered once — regenerating it on every cold start would
 * register a new client against the account each time.
 *
 * Access is restricted to LM_OWNER_USER_ID. This matters: Static Web Apps grants
 * the built-in `authenticated` role to anyone who signs in with any configured
 * provider, so without this check every GitHub user on the internet could switch
 * on the owner's espresso machine. Fails closed — no owner configured means no
 * credentials, so a forgotten setting disables the feature rather than exposing it.
 *
 * Accepts a comma-separated list, because Static Web Apps issues a *different*
 * userId per login provider. Pinning a single id means signing in with Microsoft
 * rather than GitHub silently yields no controls and no explanation, so list every
 * id you sign in with.
 */
export class EnvCredentialStore implements CredentialStore {
  async getCredentials(userId: string): Promise<LaMarzoccoCredentials | null> {
    const username = process.env.LM_USERNAME
    const password = process.env.LM_PASSWORD
    const rawKey = process.env.LM_INSTALLATION_KEY

    const owners = (process.env.LM_OWNER_USER_ID ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (!username || !password || !rawKey) return null
    if (owners.length === 0 || !owners.includes(userId)) return null

    let parsed: SerializedInstallationKey
    try {
      parsed = JSON.parse(rawKey) as SerializedInstallationKey
    } catch {
      throw new Error('LM_INSTALLATION_KEY is not valid JSON. Regenerate it with scripts/lm-register.mjs')
    }

    return {
      username,
      password,
      installationKey: deserializeInstallationKey(parsed),
      serialNumber: process.env.LM_SERIAL || undefined,
    }
  }
}

/** True when the integration should return canned data instead of calling out. */
export const isMockMode = (): boolean => process.env.LM_MOCK === '1' || process.env.LM_MOCK === 'true'

export const credentialStore: CredentialStore = new EnvCredentialStore()
