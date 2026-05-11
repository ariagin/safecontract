// lib/hash.ts
import { createHash } from 'crypto'

export function sha256Base64(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}
