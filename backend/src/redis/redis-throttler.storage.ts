import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly fallback = new Map<string, { hits: number; expiresAt: number; blockedUntil: number }>();

  constructor(private readonly redis: RedisService) {}

  private incrementInMemory(key: string, ttl: number, limit: number, blockDuration: number): ThrottlerStorageRecord {
    const now = Date.now();
    let entry = this.fallback.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { hits: 0, expiresAt: now + ttl, blockedUntil: 0 };
      this.fallback.set(key, entry);
    }
    entry.hits += 1;
    if (entry.hits > limit && entry.blockedUntil <= now) {
      entry.blockedUntil = now + (blockDuration > 0 ? blockDuration : ttl);
    }
    const timeToExpire = Math.max(0, Math.ceil((entry.expiresAt - now) / 1000));
    const timeToBlockExpire = Math.max(0, Math.ceil((entry.blockedUntil - now) / 1000));
    return { totalHits: entry.hits, timeToExpire, isBlocked: timeToBlockExpire > 0, timeToBlockExpire };
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const base = `throttler:${throttlerName}:${key}`;
    const script = `
      local hits = redis.call('INCR', KEYS[1])
      if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
      local hitTtl = redis.call('PTTL', KEYS[1])
      local blockTtl = redis.call('PTTL', KEYS[2])
      if tonumber(ARGV[3]) > 0 and hits > tonumber(ARGV[2]) and blockTtl <= 0 then
        redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
        blockTtl = tonumber(ARGV[3])
      end
      if tonumber(ARGV[3]) <= 0 and hits > tonumber(ARGV[2]) then
        blockTtl = hitTtl
      end
      return { hits, hitTtl, blockTtl }
    `;
    try {
      const result = await this.redis.client.eval(
        script, 2, base, `${base}:blocked`,
        String(ttl), String(limit), String(blockDuration),
      ) as [number | string, number | string, number | string];
      const totalHits = Number(result[0]);
      // Nest's ThrottlerStorageRecord expresses both expiration values in seconds.
      const timeToExpire = Math.max(0, Math.ceil(Number(result[1]) / 1000));
      const timeToBlockExpire = Math.max(0, Math.ceil(Number(result[2]) / 1000));
      return { totalHits, timeToExpire, isBlocked: timeToBlockExpire > 0, timeToBlockExpire };
    } catch {
      // Single-instance degraded mode; Redis-backed distributed limits resume when Redis returns.
      return this.incrementInMemory(base, ttl, limit, blockDuration);
    }
  }
}
