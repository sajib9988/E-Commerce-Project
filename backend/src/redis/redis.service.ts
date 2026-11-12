import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      connectTimeout: 5_000,
      commandTimeout: 3_000,
      retryStrategy: (attempt) => Math.min(attempt * 500, 3_000),
    });
  }

  async get(key: string) {
    try { return await this.client.get(key); }
    catch { throw new ServiceUnavailableException('Redis is temporarily unavailable'); }
  }

  async del(key: string) {
    try { return await this.client.del(key); }
    catch { throw new ServiceUnavailableException('Redis is temporarily unavailable'); }
  }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    try {
      const result = await this.client.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
        1, key, String(ttlSeconds),
      );
      return Number(result);
    } catch {
      throw new ServiceUnavailableException('Redis is temporarily unavailable');
    }
  }

  async onModuleDestroy() {
    try { await this.client.quit(); }
    catch { this.client.disconnect(); }
  }
}
