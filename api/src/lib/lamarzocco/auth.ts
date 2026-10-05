/**
 * La Marzocco cloud authentication.
 *
 * Port of the auth layer from pylamarzocco (https://github.com/zweckj/pylamarzocco),
 * which reverse-engineered La Marzocco's undocumented customer-app API. Ported to
 * TypeScript so the whole Bean Sheet API can stay on a single Node runtime.
 *
 * Uses only Node's built-in crypto. Cross-validated against the Python
 * implementation — see scripts/verify-lm-auth.ts.
 *
 * The API rejects unsigned requests with 412 Precondition Failed, so every call
 * must carry the four X-* headers produced by buildRequestHeaders().
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign as cryptoSign,
  type KeyObject,
} from 'node:crypto'

export interface InstallationKey {
  installationId: string
  /** 32-byte derived secret used by the proof algorithm. */
  secret: Buffer
  privateKey: KeyObject
}

/** Serialisable form, safe to persist as JSON. */
export interface SerializedInstallationKey {
  installationId: string
  secret: string
  privateKeyDer: string
}

const b64 = (data: Buffer): string => data.toString('base64')

const sha256 = (data: Buffer | string): Buffer =>
  createHash('sha256').update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data).digest()

/** Public key as DER/SPKI bytes — the exact form La Marzocco hashes and registers. */
function publicKeyDer(privateKey: KeyObject): Buffer {
  return createPublicKey(privateKey).export({ type: 'spki', format: 'der' }) as Buffer
}

export function publicKeyB64(key: InstallationKey): string {
  return b64(publicKeyDer(key.privateKey))
}

/** `installationId.base64(sha256(publicKeyDer))` — proof input for registration. */
export function baseString(key: InstallationKey): string {
  return `${key.installationId}.${b64(sha256(publicKeyDer(key.privateKey)))}`
}

/**
 * La Marzocco's custom proof algorithm.
 *
 * Walks the UTF-8 bytes of `input`, mutating a copy of the 32-byte secret in
 * place: each byte selects a slot, XORs into it, then rotates left by an amount
 * taken from the neighbouring slot. The SHA-256 of the final state is the proof.
 *
 * Ported byte-for-byte from pylamarzocco's generate_request_proof.
 */
export function generateRequestProof(input: string, secret32: Buffer): string {
  if (secret32.length !== 32) {
    throw new Error(`secret must be 32 bytes, got ${secret32.length}`)
  }

  const work = Buffer.from(secret32)

  for (const byteVal of Buffer.from(input, 'utf8')) {
    const idx = byteVal % 32
    const shiftIdx = (idx + 1) % 32
    const shiftAmount = work[shiftIdx] & 7

    const xored = byteVal ^ work[idx]
    // Rotate left within a single byte. At shiftAmount 0 this is identity:
    // `xored >>> 8` is 0 for any byte value, matching Python's behaviour.
    work[idx] = ((xored << shiftAmount) | (xored >>> (8 - shiftAmount))) & 0xff
  }

  return b64(sha256(work))
}

/**
 * Derive key material from an installation ID.
 *
 * The secret is bound to the public key, so a key pair and its secret can never
 * be mixed and matched across installations.
 */
export function generateInstallationKey(installationId: string = randomUUID()): InstallationKey {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })

  const pubDer = publicKeyDer(privateKey)
  const triple = `${installationId}.${b64(pubDer)}.${b64(sha256(installationId))}`

  return { installationId, secret: sha256(triple), privateKey }
}

export function serializeInstallationKey(key: InstallationKey): SerializedInstallationKey {
  return {
    installationId: key.installationId,
    secret: key.secret.toString('base64'),
    privateKeyDer: (key.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64'),
  }
}

export function deserializeInstallationKey(data: SerializedInstallationKey): InstallationKey {
  return {
    installationId: data.installationId,
    secret: Buffer.from(data.secret, 'base64'),
    privateKey: createPrivateKey({
      key: Buffer.from(data.privateKeyDer, 'base64'),
      format: 'der',
      type: 'pkcs8',
    }),
  }
}

/**
 * Per-request signing headers. A fresh nonce and timestamp each call, signed
 * with ECDSA/SHA-256 (DER encoded, matching the Python cryptography default).
 */
export function buildRequestHeaders(key: InstallationKey): Record<string, string> {
  const nonce = randomUUID().toLowerCase()
  const timestamp = String(Date.now())

  const proofInput = `${key.installationId}.${nonce}.${timestamp}`
  const proof = generateRequestProof(proofInput, key.secret)
  const signature = cryptoSign('sha256', Buffer.from(`${proofInput}.${proof}`, 'utf8'), key.privateKey)

  return {
    'X-App-Installation-Id': key.installationId,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Request-Signature': signature.toString('base64'),
  }
}

/** Headers for the one-time registration call, which predates having a token. */
export function buildRegistrationHeaders(key: InstallationKey): Record<string, string> {
  return {
    'X-App-Installation-Id': key.installationId,
    'X-Request-Proof': generateRequestProof(baseString(key), key.secret),
  }
}
