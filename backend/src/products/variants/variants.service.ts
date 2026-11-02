import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductVariantDto, UpdateProductVariantDto } from './variants.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProduct(productId: string, includeInactive = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.productVariant.findMany({
      where: { productId, ...(includeInactive ? {} : { isActive: true }), size: { isActive: true, template: { isActive: true } } },
      include: { size: { include: { template: true } } },
      orderBy: [{ size: { sortOrder: 'asc' } }, { sku: 'asc' }],
    });
  }

  async create(dto: CreateProductVariantDto) {
    if (dto.salePrice != null && dto.salePrice >= dto.regularPrice) {
      throw new BadRequestException('Sale price must be lower than regular price');
    }
    const [product, size] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.productId }, select: { id: true } }),
      this.prisma.productSize.findUnique({ where: { id: dto.sizeId }, include: { template: true } }),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    if (!size || !size.isActive || !size.template.isActive) throw new BadRequestException('An active size from an active template is required');
    return this.prisma.productVariant.create({
      data: {
        productId: dto.productId, sizeId: dto.sizeId, sku: dto.sku.trim(),
        regularPrice: dto.regularPrice, salePrice: dto.salePrice ?? null,
        stockQuantity: dto.stockQuantity ?? 0, apliiqVariantSku: dto.apliiqVariantSku?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      include: { size: { include: { template: true } } },
    });
  }

  async update(id: string, dto: UpdateProductVariantDto) {
    const current = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Product variant not found');
    const regularPrice = dto.regularPrice ?? Number(current.regularPrice.toString());
    const salePrice = dto.salePrice === undefined ? current.salePrice?.toNumber() ?? null : dto.salePrice;
    if (salePrice != null && salePrice >= regularPrice) throw new BadRequestException('Sale price must be lower than regular price');
    return this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku.trim() }),
        ...(dto.regularPrice !== undefined && { regularPrice: dto.regularPrice }),
        ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
        ...(dto.stockQuantity !== undefined && { stockQuantity: dto.stockQuantity }),
        ...(dto.apliiqVariantSku !== undefined && { apliiqVariantSku: dto.apliiqVariantSku?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { size: { include: { template: true } } },
    });
  }

  async archive(id: string) {
    const current = await this.prisma.productVariant.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Product variant not found');
    return this.prisma.productVariant.update({ where: { id }, data: { isActive: false } });
  }
}
