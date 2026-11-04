import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    this.client = new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });
  }

  get(key: string) { return this.client.get(key); }
  del(key: string) { return this.client.del(key); }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.client.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
      1, key, String(ttlSeconds),
    );
    return Number(result);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
