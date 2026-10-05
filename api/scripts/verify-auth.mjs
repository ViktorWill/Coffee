/**
 * Golden-vector regression test for the La Marzocco auth port.
 *
 * The values below were produced by pylamarzocco (the reference implementation)
 * from the throwaway key embedded here. That key was never registered with
 * La Marzocco and unlocks nothing — it exists purely so this check can run
 * without credentials or network access.
 *
 * If this fails after an edit to auth.ts, the port has drifted from the
 * reference and requests will be rejected with 412.
 *
 *   npm run build && node scripts/verify-auth.mjs
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const authPath = join(here, '..', 'dist', 'lib', 'lamarzocco', 'auth.js')

const { deserializeInstallationKey, publicKeyB64, baseString, generateRequestProof, generateInstallationKey } =
  await import(authPath).catch(() => {
    console.error(`Could not import ${authPath}. Run "npm run build" first.`)
    process.exit(1)
  })

const FIXTURE_KEY = {
  installationId: '00000000-0000-4000-8000-000000000000',
  secret: 'ssMprZWMgkyWGV0flR0fHm9lbd0ADnkrf9T/wRgbfSY=',
  privateKeyDer:
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgjoPZu04c0v+++ykQaYj2962tnQTyKTOzAZxrIOr6PpChRANCAASpObRjl1q0coh3KwOVFkhWiTDVYun6WWS9q5Kco96kAZFWV3nUsX9rttj1i+lVcDijLG5JJMdEbaZQ1g2u+sGF',
}

const EXPECTED = {
  publicKeyB64:
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEqTm0Y5datHKIdysDlRZIVokw1WLp+llkvauSnKPepAGRVld51LF/a7bY9YvpVXA4oyxuSSTHRG2mUNYNrvrBhQ==',
  baseString: '00000000-0000-4000-8000-000000000000.79sQkdpjo+A3bm+277LZdu43DaZXfOJYAJ3YyjLTIRI=',
  proofOfBaseString: 'laJonIe+R9sZRKwntRjWUYu05i5h2dKPpQwzFZjrhyc=',
  proofEmpty: 'fBw0ybB3EAL2cewGTcd979wuiLcWOQLyiHp2omDz9rs=',
  proofSimple: 'jj7grAPcw8sjl7/dPEwtmGxhCkT4NnQ481BUm7MkJ9U=',
  proofLong: '9x4Ba22ol0AaigRJocS0OkY5s5Ia+2yp1tNuLagD2nI=',
  proofUnicode: 'xbgsOk6zh7CbXYmO1ytFjUWthwynv1e7kzCd4qiPaf4=',
}

const key = deserializeInstallationKey(FIXTURE_KEY)

const actual = {
  publicKeyB64: publicKeyB64(key),
  baseString: baseString(key),
  proofOfBaseString: generateRequestProof(baseString(key), key.secret),
  proofEmpty: generateRequestProof('', key.secret),
  proofSimple: generateRequestProof('hello.world.12345', key.secret),
  proofLong: generateRequestProof('a'.repeat(100), key.secret),
  proofUnicode: generateRequestProof('café.ünïcode.日本', key.secret),
}

let failures = 0
for (const [field, want] of Object.entries(EXPECTED)) {
  const got = actual[field]
  if (got === want) {
    console.log(`  ok    ${field}`)
  } else {
    failures++
    console.error(`  FAIL  ${field}\n        expected ${want}\n        got      ${got}`)
  }
}

// A freshly generated key must yield a 32-byte secret; the proof rejects anything else.
const freshSecretLength = generateInstallationKey().secret.length
if (freshSecretLength === 32) {
  console.log('  ok    fresh key secret is 32 bytes')
} else {
  failures++
  console.error(`  FAIL  fresh key secret is ${freshSecretLength} bytes, expected 32`)
}

console.log(failures === 0 ? '\nauth port matches the Python reference' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
