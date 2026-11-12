import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { escapeHtml, isEmailConfigured, sendEmail } from './email.helper';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  // OTP is sent immediately. Never persist raw OTP values in BullMQ/Redis jobs.
  async sendOtp(
    email: string,
    code: string,
    purpose: 'verify-email' | 'login' | 'reset-password' = 'login',
  ): Promise<void> {
    await this.sendOtpNow(email, code, purpose);
  }

  isConfigured(): boolean {
    return isEmailConfigured();
  }

  async sendWelcomeCoupon(payload: {
    email: string;
    couponCode: string;
    discountValue: string;
    expiresAt: string;
  }) {
    await this.emailQueue.add('welcome-coupon', payload, {
      // BullMQ custom job IDs must not contain ":".
      jobId: `welcome-coupon-${payload.couponCode}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 2_000,
    });
  }

  async sendWelcomeCouponNow(payload: {
    email: string;
    couponCode: string;
    discountValue: string;
    expiresAt: string;
  }) {
    const expires = new Date(payload.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const couponCode = escapeHtml(payload.couponCode);
    const discountValue = escapeHtml(payload.discountValue);
    const safeExpires = escapeHtml(expires);

    await sendEmail({
      to: payload.email,
      subject: `Your ${payload.discountValue}% welcome discount is here!`,
      text: [
        'Thanks for signing up!',
        `Use code ${payload.couponCode} at checkout to get ${payload.discountValue}% off your first order.`,
        `This one-time code expires on ${expires}.`,
        'If you did not request this offer, you can ignore this email.',
      ].join('\n\n'),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717"><h1>Enjoy ${discountValue}% OFF</h1><p>Thanks for signing up. Use your unique welcome code on your first order.</p><div style="padding:18px;text-align:center;background:#f4f4f5;border-radius:10px;font-size:24px;font-weight:700;letter-spacing:2px">${couponCode}</div><p>This one-time code expires on <strong>${safeExpires}</strong>.</p><p style="color:#666;font-size:12px">If you did not request this offer, you can ignore this email.</p></div>`,
    });
  }

  async sendOrderConfirmation(payload: {
    email: string;
    orderNumber: string;
    customerName?: string | null;
    totalAmount: string;
    currency: string;
  }) {
    await this.emailQueue.add('order-confirmation', payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 2_000,
    });
  }

  async sendShippingUpdate(payload: {
    email: string;
    orderNumber: string;
    trackingCompany?: string | null;
    trackingNumbers: string[];
    trackingUrls: string[];
  }) {
    await this.emailQueue.add('shipping-update', payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 2_000,
    });
  }

  async sendNotificationNow(
    jobName: 'order-confirmation' | 'shipping-update',
    payload: Record<string, unknown>,
  ) {
    if (!isEmailConfigured()) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        this.logger.warn(`Email provider is not configured; skipped ${jobName} notification.`);
        return;
      }
      // Throwing lets BullMQ retry instead of marking an undelivered email complete.
      throw new Error('Email provider is not configured for notification delivery');
    }

    const email = String(payload.email ?? '');
    const orderNumber = String(payload.orderNumber ?? '');

    if (jobName === 'order-confirmation') {
      const total = String(payload.totalAmount ?? '');
      const currency = String(payload.currency ?? 'USD').toUpperCase();
      const customerName = String(payload.customerName ?? 'there');

      await sendEmail({
        to: email,
        subject: `Order ${orderNumber} confirmed`,
        text: `Hello ${customerName}, thank you for your order ${orderNumber}. Payment received: ${total} ${currency}. We will email you when it ships.`,
      });
      return;
    }

    const company = typeof payload.trackingCompany === 'string'
      ? payload.trackingCompany
      : 'Carrier';
    const numbers = Array.isArray(payload.trackingNumbers)
      ? payload.trackingNumbers.map(String).join(', ')
      : '';
    const urls = Array.isArray(payload.trackingUrls)
      ? payload.trackingUrls.map(String).join('\n')
      : '';

    await sendEmail({
      to: email,
      subject: `Your order ${orderNumber} has shipped`,
      text: `Your order ${orderNumber} has shipped via ${company}. Tracking: ${numbers}\n${urls}`,
    });
  }

  async sendOtpNow(
    email: string,
    code: string,
    purpose: 'verify-email' | 'login' | 'reset-password' = 'login',
  ): Promise<void> {
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

    if (!isEmailConfigured()) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        this.logger.warn(`Email provider is not configured; OTP delivery skipped for ${email} (${purpose}).`);
        return;
      }
      throw new Error('Email provider is not configured for OTP delivery');
    }

    await sendEmail({ to: email, subject, text });
  }
}
