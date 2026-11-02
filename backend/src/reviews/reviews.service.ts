import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');

    const purchase = await this.prisma.order.findFirst({
      where: { userId, paymentStatus: 'PAID', items: { some: { productId } } },
      orderBy: { paidAt: 'desc' },
      select: { id: true },
    });
    if (!purchase) throw new BadRequestException('Only verified purchasers can review this product');

    try {
      return await this.prisma.productReview.create({
        data: { userId, productId, orderId: purchase.id, rating: dto.rating,
          title: dto.title?.trim(), body: dto.body.trim() },
        select: { id: true, productId: true, rating: true, title: true, body: true, status: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw error;
    }
  }

  findApproved(productId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    return this.prisma.productReview.findMany({
      where: { productId, status: 'APPROVED' },
      select: { id: true, rating: true, title: true, body: true, createdAt: true,
        user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, skip, take,
    });
  }

  async updateOwn(userId: string, reviewId: string, dto: CreateReviewDto) {
    const review = await this.prisma.productReview.findFirst({ where: { id: reviewId, userId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === 'REJECTED') throw new ConflictException('Rejected reviews cannot be edited; contact support');
    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { rating: dto.rating, title: dto.title?.trim(), body: dto.body.trim(), status: 'PENDING',
        moderatedAt: null, moderatedBy: null, moderationNote: null },
      select: { id: true, productId: true, rating: true, title: true, body: true, status: true, updatedAt: true },
    });
  }

  async deleteOwn(userId: string, reviewId: string) {
    const result = await this.prisma.productReview.deleteMany({ where: { id: reviewId, userId } });
    if (!result.count) throw new NotFoundException('Review not found');
    return { message: 'Review deleted' };
  }

  findAllForAdmin(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.productReview.findMany({
      where: status ? { status } : {},
      include: { product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, paymentStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(reviewId: string, adminId: string, status: 'APPROVED' | 'REJECTED', note?: string) {
    const review = await this.prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status !== 'PENDING') throw new ConflictException('Only pending reviews can be moderated');
    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status, moderatedAt: new Date(), moderatedBy: adminId, moderationNote: note?.trim() },
    });
  }
}
