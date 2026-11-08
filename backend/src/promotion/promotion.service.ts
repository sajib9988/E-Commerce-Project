import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PromotionDiscountType, PromotionType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(input: {
    type?: string; discountType?: string | null; discountValue?: number | null;
    isSignupOffer?: boolean; startsAt?: Date; endsAt?: Date;
  }) {
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      throw new BadRequestException('Promotion end date must be after start date');
    }
    if (input.discountValue !== undefined && input.discountValue !== null) {
      if (!Number.isFinite(input.discountValue) || input.discountValue < 0) {
        throw new BadRequestException('Discount value must be a non-negative number');
      }
      if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100');
      }
    }
    if (input.isSignupOffer && (input.type !== 'POPUP' || input.discountType !== 'PERCENTAGE' || !input.discountValue)) {
      throw new BadRequestException('Signup popup must be a POPUP with a percentage discount');
    }
  }

  findAllForAdmin() {
    return this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findActivePopup() {
    const now = new Date();
    return this.prisma.promotion.findFirst({
      where: {
        type: 'POPUP', isSignupOffer: true, isActive: true,
        startsAt: { lte: now }, endsAt: { gt: now },
      },
      select: {
        id: true, title: true, description: true, bannerImage: true,
        discountType: true, discountValue: true, couponRequired: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreatePromotionDto) {
    this.validate(dto);
    if (dto.isSignupOffer && dto.isActive !== false) {
      await this.prisma.promotion.updateMany({
        where: { isSignupOffer: true, isActive: true },
        data: { isActive: false },
      });
    }
    return this.prisma.promotion.create({
      data: {
        name: dto.name.trim(),
        type: dto.type as PromotionType,
        discountType: dto.discountType as PromotionDiscountType | undefined,
        discountValue: dto.discountValue == null ? null : new Prisma.Decimal(dto.discountValue),
        couponRequired: dto.couponRequired ?? Boolean(dto.isSignupOffer),
        isSignupOffer: dto.isSignupOffer ?? false,
        title: dto.title?.trim() || null,
        description: dto.description?.trim() || null,
        bannerImage: dto.bannerImage ?? null,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');
    const next = {
      type: dto.type ?? existing.type,
      discountType: dto.discountType ?? existing.discountType,
      discountValue: dto.discountValue ?? (existing.discountValue ? Number(existing.discountValue.toString()) : null),
      isSignupOffer: dto.isSignupOffer ?? existing.isSignupOffer,
      startsAt: dto.startsAt ?? existing.startsAt,
      endsAt: dto.endsAt ?? existing.endsAt,
    };
    this.validate(next);
    if (next.isSignupOffer && dto.isActive !== false) {
      await this.prisma.promotion.updateMany({
        where: { id: { not: id }, isSignupOffer: true, isActive: true },
        data: { isActive: false },
      });
    }
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.type !== undefined && { type: dto.type as PromotionType }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType as PromotionDiscountType }),
        ...(dto.discountValue !== undefined && { discountValue: new Prisma.Decimal(dto.discountValue) }),
        ...(dto.couponRequired !== undefined && { couponRequired: dto.couponRequired }),
        ...(dto.isSignupOffer !== undefined && { isSignupOffer: dto.isSignupOffer }),
        ...(dto.title !== undefined && { title: dto.title.trim() || null }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
        ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage || null }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async disable(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Promotion not found');
    return this.prisma.promotion.update({ where: { id }, data: { isActive: false } });
  }
}
