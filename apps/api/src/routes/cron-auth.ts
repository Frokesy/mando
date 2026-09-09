import { createHash, timingSafeEqual } from 'node:crypto'

export function isAuthorizedCronRequest(authorization: string | undefined, secret: string) {
  if (!authorization?.startsWith('Bearer ')) return false
  const suppliedSecret = authorization.slice('Bearer '.length)
  const suppliedHash = createHash('sha256').update(suppliedSecret).digest()
  const expectedHash = createHash('sha256').update(secret).digest()
  return timingSafeEqual(suppliedHash, expectedHash)
}
