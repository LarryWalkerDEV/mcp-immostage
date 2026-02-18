import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'mcp:rl',
    analytics: true,
  });

  return limiter;
}

export async function checkRateLimit(apiKey: string): Promise<RateLimitResult> {
  const rl = getLimiter();

  // If no Redis configured, allow all (development mode)
  if (!rl) {
    return { allowed: true, limit: 100, remaining: 100, reset: Date.now() + 60000 };
  }

  try {
    const { success, limit, remaining, reset } = await rl.limit(apiKey);
    return { allowed: success, limit, remaining, reset };
  } catch {
    // Fail open in case of Redis errors
    return { allowed: true, limit: 100, remaining: 100, reset: Date.now() + 60000 };
  }
}
