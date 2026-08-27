import { createHmac } from "node:crypto"

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type Entry = {
  count: number
  expiresAt: number
}

const MAX_ENTRIES = 10_000

export function hashRateLimitKey(value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`public-inquiry-rate-limit:v1:${value}`)
    .digest("hex")
}

export function createMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number
  windowMs: number
  now?: () => number
}) {
  const entries = new Map<string, Entry>()

  function prune(currentTime: number): void {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= currentTime) {
        entries.delete(key)
      }
    }
    while (entries.size >= MAX_ENTRIES) {
      const oldestKey = entries.keys().next().value as string | undefined
      if (!oldestKey) {
        break
      }
      entries.delete(oldestKey)
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now()
      const current = entries.get(key)
      if (!current || current.expiresAt <= currentTime) {
        prune(currentTime)
        entries.set(key, { count: 1, expiresAt: currentTime + windowMs })
        return {
          allowed: true,
          remaining: Math.max(0, limit - 1),
          retryAfterSeconds: 0,
        }
      }

      current.count += 1
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - currentTime) / 1_000))
      return {
        allowed: current.count <= limit,
        remaining: Math.max(0, limit - current.count),
        retryAfterSeconds: current.count <= limit ? 0 : retryAfterSeconds,
      }
    },
  }
}

const globalForRateLimit = globalThis as unknown as {
  inquiryRateLimiter?: ReturnType<typeof createMemoryRateLimiter>
}

export const inquiryRateLimiter = globalForRateLimit.inquiryRateLimiter ??
  createMemoryRateLimiter({ limit: 5, windowMs: 15 * 60 * 1_000 })

export const adminLoginRateLimiter = createMemoryRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1_000,
})

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.inquiryRateLimiter = inquiryRateLimiter
}
