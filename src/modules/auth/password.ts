import { createHash } from "node:crypto"

import { compare, hash } from "bcryptjs"

const PASSWORD_COST = 12

function prehashPassword(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("base64")
}

export function hashPassword(password: string): Promise<string> {
  return hash(prehashPassword(password), PASSWORD_COST)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (await compare(prehashPassword(password), passwordHash)) {
    return true
  }
  // Existing accounts may still contain direct bcrypt hashes from before the pre-hash contract.
  // Direct bcrypt verification is exact only up to bcrypt's 72-byte input boundary.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return false
  }
  return compare(password, passwordHash)
}
