/**
 * One-time La Marzocco installation-key setup.
 *
 * Generates a key pair, registers it with La Marzocco, and prints the JSON to
 * store as the LM_INSTALLATION_KEY app setting. Run this ONCE — every run
 * registers another client against the account.
 *
 * Credentials are read from the environment and never printed:
 *
 *   LM_USERNAME=you@example.com LM_PASSWORD='...' node scripts/lm-register.mjs
 *
 * The output contains a private key. Treat it as a secret: put it in Key Vault
 * or app settings, never in git.
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'dist', 'lib', 'lamarzocco')

const { generateInstallationKey, serializeInstallationKey } = await import(join(dist, 'auth.js')).catch(
  () => {
    console.error('Could not load dist. Run "npm run build" first.')
    process.exit(1)
  },
)
const { LaMarzoccoClient } = await import(join(dist, 'client.js'))

const username = process.env.LM_USERNAME
const password = process.env.LM_PASSWORD

if (!username || !password) {
  console.error('Set LM_USERNAME and LM_PASSWORD in the environment first.')
  process.exit(1)
}

console.error('Generating installation key…')
const key = generateInstallationKey()

console.error('Registering with La Marzocco…')
const client = new LaMarzoccoClient(username, password, key)
await client.registerClient()

console.error('Verifying sign-in…')
await client.getAccessToken()

const things = await client.listThings()
console.error(`Devices on this account: ${things.length}`)
for (const thing of things) {
  console.error(`  • ${thing.name} (${thing.modelName}) serial=${thing.serialNumber} connected=${thing.connected}`)
}
if (things.length === 0) {
  console.error('  (none — add the machine in the La Marzocco Home app first)')
}

// stdout carries only the secret payload, so it can be piped safely.
console.error('\nSet this as LM_INSTALLATION_KEY:\n')
console.log(JSON.stringify(serializeInstallationKey(key)))
