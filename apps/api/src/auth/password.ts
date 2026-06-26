import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const PASSWORD_HASH_ALGORITHM = 'scrypt'
const PASSWORD_HASH_VERSION = '1'
const SCRYPT_KEY_LENGTH = 64
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
}
const SALT_BYTES = 16

type ParsedPasswordHash = {
  algorithm: string
  version: string
  options: typeof SCRYPT_OPTIONS
  keyLength: number
  salt: string
  hash: string
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('base64url')
  const derivedKey = await deriveScryptKey(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_OPTIONS,
  )

  return [
    PASSWORD_HASH_ALGORITHM,
    `v=${PASSWORD_HASH_VERSION}`,
    `n=${SCRYPT_OPTIONS.N}`,
    `r=${SCRYPT_OPTIONS.r}`,
    `p=${SCRYPT_OPTIONS.p}`,
    `keylen=${SCRYPT_KEY_LENGTH}`,
    salt,
    derivedKey.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parsedHash = parsePasswordHash(storedHash)

  if (!parsedHash) {
    return false
  }

  if (
    parsedHash.algorithm !== PASSWORD_HASH_ALGORITHM ||
    parsedHash.version !== PASSWORD_HASH_VERSION
  ) {
    return false
  }

  const derivedKey = await deriveScryptKey(
    password,
    parsedHash.salt,
    parsedHash.keyLength,
    parsedHash.options,
  )
  const storedKey = Buffer.from(parsedHash.hash, 'base64url')

  if (derivedKey.byteLength !== storedKey.byteLength) {
    return false
  }

  return timingSafeEqual(derivedKey, storedKey)
}

function parsePasswordHash(storedHash: string): ParsedPasswordHash | null {
  const [algorithm, version, n, r, p, keyLength, salt, hash] =
    storedHash.split('$')

  if (!algorithm || !version || !n || !r || !p || !keyLength || !salt || !hash) {
    return null
  }

  return {
    algorithm,
    version: version.replace('v=', ''),
    options: {
      N: Number(n.replace('n=', '')),
      r: Number(r.replace('r=', '')),
      p: Number(p.replace('p=', '')),
    },
    keyLength: Number(keyLength.replace('keylen=', '')),
    salt,
    hash,
  }
}

function deriveScryptKey(
  password: string,
  salt: string,
  keyLength: number,
  options: typeof SCRYPT_OPTIONS,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}
