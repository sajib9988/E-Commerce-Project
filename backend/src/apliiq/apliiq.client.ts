import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';

@Injectable()
export class ApliiqClient {
  private readonly appId: string;
  private readonly sharedSecret: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.appId = config.getOrThrow<string>('APLIIQ_APP_ID');
    this.sharedSecret = config.getOrThrow<string>('APLIIQ_SHARED_SECRET');
    this.baseUrl = (
      config.get<string>('APLIIQ_API_BASE_URL') ?? 'https://api.apliiq.com'
    ).replace(/\/$/, '');
  }

  private authorizationHeader(bodyJson: string): string {
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
    // Sign the exact JSON string that is sent in the request body.
    const bodyJson = JSON.stringify(payload);
    const response = await fetch(`${this.baseUrl}/v1/Order`, {
      method: 'POST',
      headers: {
        Authorization: this.authorizationHeader(bodyJson),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyJson,
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {
      throw new ServiceUnavailableException('Apliiq API request failed');
    });

    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { message: 'Apliiq returned a non-JSON response' };
    }

    if (!response.ok) {
      // Do not log credentials, HMAC headers, addresses, or full payloads.
      throw new ServiceUnavailableException({
        message: 'Apliiq rejected the order request',
        providerStatus: response.status,
        providerResponse: data,
      });
    }

    return data as T;
  }
}
