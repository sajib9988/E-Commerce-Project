import type { ThrottlerStorage, ThrottlerStorageRecord } from '@nestjs/throttler';
import { RedisService } from './redis.service';

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

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
      if hits > tonumber(ARGV[2]) and blockTtl <= 0 then
        redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
        blockTtl = tonumber(ARGV[3])
      end
      return { hits, hitTtl, blockTtl }
    `;
    const result = await this.redis.client.eval(
      script, 2, base, `${base}:blocked`,
      String(ttl), String(limit), String(blockDuration),
    ) as [number | string, number | string, number | string];
    const totalHits = Number(result[0]);
    const timeToExpire = Math.max(0, Number(result[1]));
    const timeToBlockExpire = Math.max(0, Number(result[2]));
    return {
      totalHits,
      timeToExpire,
      isBlocked: timeToBlockExpire > 0,
      timeToBlockExpire,
    };
  }
}
