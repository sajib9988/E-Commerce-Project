import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress?: string;

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {
    const {
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN,
      GMAIL_USER,
      GMAIL_FROM,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
    } = process.env;

    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_USER) {
      // Gmail via OAuth2 — no app password to manage/rotate, standard
      // nodemailer + Gmail API pattern.
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: GMAIL_USER,
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN,
        },
      });
      this.fromAddress = GMAIL_FROM || GMAIL_USER;
    } else if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      this.fromAddress = SMTP_FROM || SMTP_USER;
    } else {
      this.transporter = null;
    }
  }

  async sendOtp(email: string, code: string, purpose: 'verify-email' | 'login' | 'reset-password' = 'login'): Promise<void> {
    await this.emailQueue.add('send-otp', { email, code, purpose }, {
      attempts: 5, backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500, removeOnFail: 2_000,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.transporter && this.fromAddress);
  }

  async sendWelcomeCoupon(payload: { email: string; couponCode: string; discountValue: string; expiresAt: string }) {
    await this.emailQueue.add('welcome-coupon', payload, {
      jobId: `welcome-coupon:${payload.couponCode}`,
      attempts: 5, backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500, removeOnFail: 2_000,
    });
  }

  async sendWelcomeCouponNow(payload: { email: string; couponCode: string; discountValue: string; expiresAt: string }) {
    if (!this.transporter || !this.fromAddress) {
      throw new Error('Email provider is not configured for welcome coupon delivery');
    }
    const expires = new Date(payload.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: payload.email,
      subject: `Your ${payload.discountValue}% welcome discount is here!`,
      text: [
        'Thanks for signing up!',
        `Use code ${payload.couponCode} at checkout to get ${payload.discountValue}% off your first order.`,
        `This one-time code expires on ${expires}.`,
        'If you did not request this offer, you can ignore this email.',
      ].join('\\n\\n'),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717"><h1>Enjoy ${payload.discountValue}% OFF</h1><p>Thanks for signing up. Use your unique welcome code on your first order.</p><div style="padding:18px;text-align:center;background:#f4f4f5;border-radius:10px;font-size:24px;font-weight:700;letter-spacing:2px">${payload.couponCode}</div><p>This one-time code expires on <strong>${expires}</strong>.</p><p style="color:#666;font-size:12px">If you did not request this offer, you can ignore this email.</p></div>`,
    });
  }

  async sendOrderConfirmation(payload: { email: string; orderNumber: string; customerName?: string | null; totalAmount: string; currency: string }) {
    await this.emailQueue.add('order-confirmation', payload, {
      attempts: 5, backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500, removeOnFail: 2_000,
    });
  }

  async sendShippingUpdate(payload: { email: string; orderNumber: string; trackingCompany?: string | null; trackingNumbers: string[]; trackingUrls: string[] }) {
    await this.emailQueue.add('shipping-update', payload, {
      attempts: 5, backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500, removeOnFail: 2_000,
    });
  }

  async sendNotificationNow(jobName: 'order-confirmation' | 'shipping-update', payload: Record<string, unknown>) {
    if (!this.transporter) {
      this.logger.warn(`Email provider is not configured; skipped ${jobName} notification.`);
      return;
    }
    const email = String(payload.email ?? '');
    const orderNumber = String(payload.orderNumber ?? '');
    if (jobName === 'order-confirmation') {
      const total = String(payload.totalAmount ?? '');
      const currency = String(payload.currency ?? 'USD').toUpperCase();
      await this.transporter.sendMail({
        from: this.fromAddress, to: email,
        subject: `Order ${orderNumber} confirmed`,
        text: `Thank you for your order ${orderNumber}. Payment received: ${total} ${currency}. We will email you when it ships.`,
      });
      return;
    }
    const company = typeof payload.trackingCompany === 'string' ? payload.trackingCompany : 'Carrier';
    const numbers = Array.isArray(payload.trackingNumbers) ? payload.trackingNumbers.join(', ') : '';
    const urls = Array.isArray(payload.trackingUrls) ? payload.trackingUrls.join('\n') : '';
    await this.transporter.sendMail({
      from: this.fromAddress, to: email,
      subject: `Your order ${orderNumber} has shipped`,
      text: `Your order ${orderNumber} has shipped via ${company}. Tracking: ${numbers}\n${urls}`,
    });
  }

  async sendOtpNow(email: string, code: string, purpose: 'verify-email' | 'login' | 'reset-password' = 'login'): Promise<void> {
    const subject = purpose === 'verify-email'
      ? 'Verify your email address'
      : purpose === 'reset-password'
        ? 'Your password reset code'
        : 'Your admin sign-in code';
    const action = purpose === 'verify-email'
      ? 'verify your email address'
      : purpose === 'reset-password'
        ? 'reset your password'
        : 'sign in';
    const text = `Your code to ${action} is ${code}. It expires in 5 minutes.`;

    if (!this.transporter) {
      // No email provider configured — fall back to logging so local
      // dev/testing isn't blocked on having real email credentials.
      this.logger.warn(
        `No email provider configured — OTP for ${email}: ${code} (dev fallback)`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject,
      text,
    });
  }
}
