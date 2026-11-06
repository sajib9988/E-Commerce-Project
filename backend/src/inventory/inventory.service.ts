import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';

const include = {
  actor: { select: { id: true, name: true, email: true } },
  product: { select: { id: true, name: true, sku: true } },
  variant: { select: { id: true, sku: true, colorName: true, size: { select: { label: true } }, product: { select: { id: true, name: true } } } },
} satisfies Prisma.InventoryAdjustmentInclude;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}
  async createAdjustment(actorId: string, dto: CreateInventoryAdjustmentDto) {
    if (Boolean(dto.productId) === Boolean(dto.variantId)) throw new BadRequestException('Provide exactly one productId or variantId');
    const delta = dto.direction === 'INCREASE' ? dto.quantity : -dto.quantity;
    const reason = dto.reason.trim();
    if (reason.length < 3) throw new BadRequestException('A reason is required');
    return this.prisma.$transaction(async (tx) => {
      let before: number, after: number;
      if (dto.variantId) {
        await tx.$queryRaw`SELECT "id" FROM "product_variants" WHERE "id" = ${dto.variantId} FOR UPDATE`;
        const current = await tx.productVariant.findUnique({ where: { id: dto.variantId }, select: { stockQuantity: true } });
        if (!current) throw new NotFoundException('Product variant not found');
        before = current.stockQuantity;
        if (delta < 0 && before < -delta) throw new BadRequestException('Adjustment would make variant stock negative');
        const updated = await tx.productVariant.update({ where: { id: dto.variantId }, data: { stockQuantity: delta > 0 ? { increment: delta } : { decrement: -delta } }, select: { stockQuantity: true } });
        after = updated.stockQuantity;
      } else {
        await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${dto.productId!} FOR UPDATE`;
        const current = await tx.product.findUnique({ where: { id: dto.productId! }, select: { stockQuantity: true } });
        if (!current) throw new NotFoundException('Product not found');
        before = current.stockQuantity;
        if (delta < 0 && before < -delta) throw new BadRequestException('Adjustment would make product stock negative');
        const updated = await tx.product.update({ where: { id: dto.productId! }, data: { stockQuantity: delta > 0 ? { increment: delta } : { decrement: -delta } }, select: { stockQuantity: true } });
        after = updated.stockQuantity;
      }
      return tx.inventoryAdjustment.create({
        data: { productId: dto.productId ?? null, variantId: dto.variantId ?? null, actorId, quantityDelta: delta, quantityBefore: before, quantityAfter: after, reason },
        include,
      });
    });
  }
  async listAdjustments(page = 1, limit = 50) {
    const safePage = Math.max(1, Math.floor(page)), safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.findMany({ include, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
      this.prisma.inventoryAdjustment.count(),
    ]);
    return { items, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }
}