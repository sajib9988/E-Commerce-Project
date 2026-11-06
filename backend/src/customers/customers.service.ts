import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PaymentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Math.floor(params.page || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit || 20)));
    const search = params.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: UserRole.USER,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, emailVerified: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const ids = customers.map((customer) => customer.id);
    const spendRows = ids.length ? await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, paymentStatus: PaymentStatus.PAID },
      _sum: { totalAmount: true },
    }) : [];
    const spendByUser = new Map(spendRows.map((row) => [row.userId, row._sum.totalAmount?.toString() ?? '0']));

    return {
      success: true,
      data: customers.map((customer) => ({
        ...customer,
        orderCount: customer._count.orders,
        paidSpend: spendByUser.get(customer.id) ?? '0',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: UserRole.USER },
      select: {
        id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true,
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const [orders, orderCount, paidOrderCount, paidAggregate] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId: id },
        include: {
          items: true,
          paymentAttempts: { select: { id: true, status: true, amount: true, currency: true, paidAt: true } },
          fulfillments: { select: { id: true, provider: true, submissionStatus: true, providerStatus: true, trackingNumbers: true, trackingUrls: true, shippedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.order.count({ where: { userId: id } }),
      this.prisma.order.count({ where: { userId: id, paymentStatus: PaymentStatus.PAID } }),
      this.prisma.order.aggregate({
        where: { userId: id, paymentStatus: PaymentStatus.PAID },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      success: true,
      data: {
        customer,
        stats: {
          orderCount,
          paidSpend: paidAggregate._sum.totalAmount?.toString() ?? '0',
          paidOrderCount,
        },
        orders,
      },
    };
  }
}
