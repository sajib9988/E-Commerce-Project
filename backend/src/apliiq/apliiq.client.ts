import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';

@Injectable()
export class ApliiqClient {
  private readonly mode: 'mock' | 'live';
  private readonly appId?: string;
  private readonly sharedSecret?: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    const configuredMode = (config.get<string>('APLIIQ_MODE') ?? 'mock').toLowerCase();
    if (configuredMode !== 'mock' && configuredMode !== 'live') {
      throw new Error('APLIIQ_MODE must be either mock or live');
    }
    this.mode = configuredMode;
    // Mock mode intentionally does not require or read live credentials.
    if (this.mode === 'live') {
      this.appId = config.getOrThrow<string>('APLIIQ_APP_ID');
      this.sharedSecret = config.getOrThrow<string>('APLIIQ_SHARED_SECRET');
    }
    this.baseUrl = (
      config.get<string>('APLIIQ_API_BASE_URL') ?? 'https://api.apliiq.com'
    ).replace(/\/$/, '');
  }

  private authorizationHeader(bodyJson: string): string {
    if (!this.appId || !this.sharedSecret) {
      throw new ServiceUnavailableException('Apliiq live credentials are not configured');
    }
    const rts = Math.floor(Date.now() / 1000).toString();
    const state = randomUUID().replaceAll('-', '');
    const bodyBase64 = Buffer.from(bodyJson, 'utf8').toString('base64');
    const signedText = `${this.appId}${rts}${state}${bodyBase64}`;
    const signature = createHmac('sha256', this.sharedSecret)
      .update(signedText, 'utf8')
      .digest('base64');

    return `x-apliiq-auth ${rts}:${signature}:${this.appId}:${state}`;
  }

  async postOrder<T>(payload: unknown): Promise<T> {
    return this.post<T>('Order', payload);
  }
}
