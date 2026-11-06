import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
    if (this.mode === 'live') {
      this.appId = config.getOrThrow<string>('APLIIQ_APP_ID');
      this.sharedSecret = config.getOrThrow<string>('APLIIQ_SHARED_SECRET');
    }
    this.baseUrl = (config.get<string>('APLIIQ_API_BASE_URL') ?? 'https://api.apliiq.com').replace(/\/$/, '');
  }

  get isMockMode(): boolean {
    return this.mode === 'mock';
  }

  private authorizationHeader(bodyJson: string): string {
    if (!this.appId || !this.sharedSecret) {
      throw new ServiceUnavailableException('Apliiq live credentials are not configured');
    }
    const rts = Math.floor(Date.now() / 1000).toString();
    const state = randomUUID().replaceAll('-', '');
    const bodyBase64 = Buffer.from(bodyJson, 'utf8').toString('base64');
    const signedText = `${this.appId}${rts}${state}${bodyBase64}`;
    const signature = createHmac('sha256', this.sharedSecret).update(signedText, 'utf8').digest('base64');
    return `x-apliiq-auth ${rts}:${signature}:${this.appId}:${state}`;
  }

  private async post<T>(resource: string, payload: unknown): Promise<T> {
    if (this.mode === 'mock') {
      const id = `mock_${randomUUID()}`;
      return { Id: id, id, Variants: [], mock: true, acceptedAt: new Date().toISOString() } as T;
    }
    const bodyJson = JSON.stringify(payload);
    const response = await fetch(`${this.baseUrl}/v1/${resource}`, {
      method: 'POST',
      headers: {
        Authorization: this.authorizationHeader(bodyJson),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyJson,
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {
      throw new ServiceUnavailableException(`Apliiq ${resource} API request failed`);
    });
    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { message: 'Apliiq returned a non-JSON response' };
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: `Apliiq rejected the ${resource} request`,
        providerStatus: response.status,
        providerResponse: data,
      });
    }
    return data as T;
  }

  async getOrder<T>(orderId: string): Promise<T> {
    if (this.mode === 'mock') {
      throw new ServiceUnavailableException('Apliiq order reconciliation is available only in live mode');
    }
    const response = await fetch(`${this.baseUrl}/v1/Order/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        Authorization: this.authorizationHeader(''),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {
      throw new ServiceUnavailableException('Apliiq Get Order API request failed');
    });
    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { message: 'Apliiq returned a non-JSON response' };
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: 'Apliiq rejected the Get Order request',
        providerStatus: response.status,
        providerResponse: data,
      });
    }
    return data as T;
  }

  async getRecentOrders<T>(): Promise<T> {
    if (this.mode === 'mock') {
      throw new ServiceUnavailableException('Apliiq order reconciliation is available only in live mode');
    }
    const response = await fetch(`${this.baseUrl}/v1/Order?yearOrlastNoMonth=1`, {
      method: 'GET',
      headers: {
        Authorization: this.authorizationHeader(''),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {
      throw new ServiceUnavailableException('Apliiq Get Orders API request failed');
    });
    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { message: 'Apliiq returned a non-JSON response' };
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: 'Apliiq rejected the Get Orders request',
        providerStatus: response.status,
        providerResponse: data,
      });
    }
    return data as T;
  }

  postArtwork<T>(payload: unknown): Promise<T> {
    return this.post<T>('Artwork', payload);
  }

  postDesign<T>(payload: unknown): Promise<T> {
    return this.post<T>('Design', payload);
  }

  postOrder<T>(payload: unknown): Promise<T> {
    return this.post<T>('Order', payload);
  }
}
