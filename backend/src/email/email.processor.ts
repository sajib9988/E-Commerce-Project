import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email.service';

type OtpEmailJob = { email: string; code: string; purpose: 'verify-email' | 'login' | 'reset-password' };

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  constructor(private readonly email: EmailService) { super(); }

  async process(job: Job<OtpEmailJob>): Promise<void> {
    if (job.name !== 'send-otp') throw new Error(`Unsupported email job: ${job.name}`);
    const { email, code, purpose } = job.data;
    await this.email.sendOtpNow(email, code, purpose);
  }
}
