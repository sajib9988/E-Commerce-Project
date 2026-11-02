import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, productId: string, dto: { rating: number; title?: string; comment: string }) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    const eligible = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, paymentStatus: 'PAID', status: 'DELIVERED' } },
      select: { id: true },
    });
    if (!eligible) throw new BadRequestException('Only customers with a delivered purchase can review this product');
    try {
      return await this.prisma.productReview.create({ data: {
        productId, userId, rating: dto.rating, title: dto.title?.trim() || null,
        comment: dto.comment.trim(), status: 'PENDING',
      }, select: { id: true, productId: true, rating: true, title: true, comment: true, status: true, createdAt: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw error;
    }
  }

  async findApproved(productId: string, pageRaw?: string, limitRaw?: string) {
    const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitRaw ?? '10', 10) || 10));
    const where = { productId, status: 'APPROVED' as const };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' }, select: { id: true, rating: true, title: true, comment: true,
          createdAt: true, user: { select: { name: true } } } }),
      this.prisma.productReview.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findPending() {
    return this.prisma.productReview.findMany({ where: { status: 'PENDING' },
      include: { product: { select: { id: true, name: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' } });
  }

  async moderate(reviewId: string, adminId: string, decision: string, note?: string) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw new BadRequestException('Decision must be APPROVED or REJECTED');
    const result = await this.prisma.productReview.updateMany({
      where: { id: reviewId, status: 'PENDING' },
      data: { status: decision, moderatedBy: adminId, moderatedAt: new Date(), moderationNote: note?.trim() || null },
    });
    if (!result.count) {
      const review = await this.prisma.productReview.findUnique({ where: { id: reviewId }, select: { id: true } });
      if (!review) throw new NotFoundException('Review not found');
      throw new ConflictException('Review has already been moderated');
    }
    return this.prisma.productReview.findUnique({ where: { id: reviewId } });
  }
}
