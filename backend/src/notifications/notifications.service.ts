import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly email: EmailService) {}

  orderConfirmed(payload: { email: string; orderNumber: string; customerName?: string | null; totalAmount: string; currency: string }) {
    return this.email.sendOrderConfirmation(payload);
  }

  orderShipped(payload: { email: string; orderNumber: string; trackingCompany?: string | null; trackingNumbers: string[]; trackingUrls: string[] }) {
    return this.email.sendShippingUpdate(payload);
  }
}
