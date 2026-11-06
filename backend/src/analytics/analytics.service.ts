import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
const amount = (value: Prisma.Decimal | null | undefined) => Number(value?.toString() ?? 0);
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}
  async overview(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 29 * 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new BadRequestException('Invalid analytics date range');
    end.setHours(23, 59, 59, 999);
    const paidWhere: Prisma.OrderWhereInput = { paymentStatus: 'PAID', paidAt: { gte: start, lte: end } };
    const createdWhere: Prisma.OrderWhereInput = { createdAt: { gte: start, lte: end } };
    const [paid, orders, refunds, refundGroups, productGroups, trend] = await Promise.all([
      this.prisma.order.aggregate({ where: paidWhere, _sum: { totalAmount: true, subtotalAmount: true }, _count: { _all: true } }),
      this.prisma.order.aggregate({ where: createdWhere, _count: { _all: true } }),
      this.prisma.refundRequest.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.refundRequest.groupBy({ by: ['status'], where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.orderItem.groupBy({ by: ['productId', 'productName'], where: { order: paidWhere }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
      this.prisma.$queryRaw<Array<{ day: Date; revenue: Prisma.Decimal; orders: bigint }>>`
        SELECT DATE_TRUNC('day', "paidAt") AS day, COALESCE(SUM("totalAmount"), 0) AS revenue, COUNT(*)::bigint AS orders
        FROM "orders" WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${start} AND "paidAt" <= ${end}
        GROUP BY DATE_TRUNC('day', "paidAt") ORDER BY day ASC`,
    ]);
    const products = productGroups.length ? await this.prisma.product.findMany({
      where: { id: { in: productGroups.map((item) => item.productId) } }, select: { id: true, name: true, sku: true },
    }) : [];
    const productById = new Map(products.map((item) => [item.id, item]));
    return {
      range: { from: start.toISOString(), to: end.toISOString() },
      sales: { paidOrders: paid._count._all, grossRevenue: amount(paid._sum.totalAmount), merchandiseSales: amount(paid._sum.subtotalAmount) },
      orders: { total: orders._count._all },
      refunds: {
        requests: refunds._count._all, requestedAmount: amount(refunds._sum.amount),
        refundedAmount: amount(refundGroups.find((item) => item.status === 'REFUNDED')?._sum.amount),
        byStatus: refundGroups.map((item) => ({ status: item.status, count: item._count._all, amount: amount(item._sum.amount) })),
      },
      bestSellingProducts: productGroups.map((item) => ({
        productId: item.productId, name: productById.get(item.productId)?.name ?? item.productName,
        sku: productById.get(item.productId)?.sku ?? null, unitsSold: item._sum.quantity ?? 0, revenue: amount(item._sum.lineTotal),
      })),
      daily: trend.map((item) => ({ date: item.day.toISOString().slice(0, 10), revenue: amount(item.revenue), orders: Number(item.orders) })),
    };
  }
}