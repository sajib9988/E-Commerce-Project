import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email.service';

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  constructor(private readonly email: EmailService) { super(); }

  async process(job: Job<OtpEmailJob | Record<string, unknown>>): Promise<void> {
    if (job.name === 'welcome-coupon') {
      await this.email.sendWelcomeCouponNow(job.data as {
        email: string; couponCode: string; discountValue: string; expiresAt: string;
      });
      return;
    }
    if (job.name === 'order-confirmation' || job.name === 'shipping-update') {
      await this.email.sendNotificationNow(job.name, job.data as Record<string, unknown>);
      return;
    }
    throw new Error(`Unsupported email job: ${job.name}`);
  }
}
