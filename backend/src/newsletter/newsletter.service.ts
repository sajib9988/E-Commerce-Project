import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { CouponType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NewsletterSignupDto } from './dto/signup.dto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async signup(dto: NewsletterSignupDto) {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();
    const offer = await this.prisma.promotion.findFirst({
      where: {
        type: 'POPUP', isSignupOffer: true, isActive: true,
        startsAt: { lte: now }, endsAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!offer || offer.discountType !== 'PERCENTAGE' || !offer.discountValue) {
      throw new ServiceUnavailableException('The welcome offer is not available right now');
    }

    const existing = await this.prisma.newsletterSubscription.findUnique({ where: { email }, include: { welcomeCoupon: true } });
    if (existing) {
      if (dto.marketingConsent && !existing.marketingConsent) {
        await this.prisma.newsletterSubscription.update({
          where: { id: existing.id },
          data: { marketingConsent: true, consentedAt: now, unsubscribedAt: null },
        });
      }
      if (existing.welcomeCoupon?.isActive && existing.welcomeCoupon.expiresAt && existing.welcomeCoupon.expiresAt > now) {
        await this.email.sendWelcomeCoupon({
          email,
          couponCode: existing.welcomeCoupon.code,
          discountValue: existing.welcomeCoupon.value.toString(),
          expiresAt: existing.welcomeCoupon.expiresAt.toISOString(),
        });
      }
      return { success: true, message: 'If eligible, your welcome offer will arrive by email shortly.' };
    }

    if (!this.email.isConfigured()) {
      throw new ServiceUnavailableException('Email provider is not configured. Welcome offers are temporarily unavailable.');
    }

    const discountValue = new Prisma.Decimal(offer.discountValue.toString());
    const expiry = new Date(Math.min(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
      offer.endsAt.getTime(),
    ));
    if (expiry <= now) throw new ServiceUnavailableException('The welcome offer has expired');

    const couponCode = `WELCOME-${randomBytes(4).toString('hex').toUpperCase()}`;
    let subscription;
    try {
      subscription = await this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupon.create({
          data: {
            code: couponCode,
            type: CouponType.PERCENT,
            value: discountValue,
            startsAt: now,
            expiresAt: expiry,
            isActive: true,
            usageLimit: 1,
            perUserLimit: 1,
            assignedEmail: email,
          },
        });
        return tx.newsletterSubscription.create({
          data: {
            email,
            marketingConsent: dto.marketingConsent ?? false,
            consentedAt: dto.marketingConsent ? now : null,
            welcomeCouponId: coupon.id,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { success: true, message: 'If eligible, your welcome offer will arrive by email shortly.' };
      }
      throw error;
    }

    try {
      await this.email.sendWelcomeCoupon({
        email,
        couponCode,
        discountValue: discountValue.toString(),
        expiresAt: expiry.toISOString(),
      });
    } catch (error) {
      this.logger.error('Welcome coupon was created but email could not be queued', error);
      // Do not expose the coupon in the API response; keep it bound to this email.
      throw new ServiceUnavailableException('Your offer was created but email delivery is temporarily unavailable. Please contact support.');
    }

    return {
      success: true,
      message: 'If eligible, your welcome offer will arrive by email shortly.',
    };
  }
}
