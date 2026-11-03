import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findApproved(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.productReview.findMany({
      where: { productId, status: 'APPROVED' },
      select: { id: true, rating: true, title: true, body: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    const verifiedPurchase = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, paymentStatus: 'PAID', status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
      select: { id: true },
    });
    if (!verifiedPurchase) throw new BadRequestException('A paid purchase is required before reviewing this product');
    try {
      return await this.prisma.productReview.create({
        data: { productId, userId, rating: dto.rating, title: dto.title?.trim() || null, body: dto.body.trim(), status: 'PENDING' },
        select: { id: true, productId: true, rating: true, title: true, body: true, status: true, createdAt: true },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('You have already reviewed this product');
      throw error;
    }
  }

  async findPendingForAdmin() {
    return this.prisma.productReview.findMany({
      where: { status: 'PENDING' },
      include: { product: { select: { id: true, name: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderate(reviewId: string, adminId: string, status: 'APPROVED' | 'REJECTED', note?: string) {
    const review = await this.prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status !== 'PENDING') throw new ConflictException('Review has already been moderated');
    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status, moderatedBy: adminId, moderatedAt: new Date(), moderationNote: note?.trim() || null },
    });
  }
}
