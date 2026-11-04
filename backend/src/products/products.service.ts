import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly cloudinaryService: CloudinaryService) {}

  async findAll(filters: { collectionSlug?: string } = {}) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(filters.collectionSlug && { collections: { some: { collection: { slug: filters.collectionSlug, isActive: true } } } }),
      },
      include: {
        category: true, subcategory: true,
        variants: { where: { isActive: true }, include: { size: true } },
        collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } },
        artworks: { include: { placements: true }, orderBy: { isPrimary: 'desc' } },
        apliiqDesigns: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        category: true, subcategory: true,
        variants: { where: { isActive: true }, include: { size: true } },
        collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async validateCategory(categoryId: string, subcategoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id: subcategoryId } });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    if (subcategory.categoryId !== categoryId) throw new BadRequestException('Subcategory does not belong to this category');
  }

  private async validateCollections(ids?: string[]) {
    if (!ids?.length) return;
    const uniqueIds = [...new Set(ids)];
    const count = await this.prisma.collection.count({ where: { id: { in: uniqueIds }, isActive: true } });
    if (count !== uniqueIds.length) throw new BadRequestException('One or more collections are missing or inactive');
  }

  private createCollectionLinks(ids: string[]) {
    return ids.map((collectionId, sortOrder) => ({ collectionId, sortOrder }));
  }

  private validatePrices(regularPrice: number, salePrice?: number | null) {
    if (salePrice !== undefined && salePrice !== null && salePrice >= regularPrice) {
      throw new BadRequestException('Sale price must be lower than regular price');
    }
  }

  async create(dto: CreateProductDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Product image is required');
    await this.validateCategory(dto.categoryId, dto.subcategoryId);
    await this.validateCollections(dto.collectionIds);
    this.validatePrices(dto.regularPrice, dto.salePrice);
    const image = await this.cloudinaryService.uploadImage(file);
    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name.trim(), description: dto.description,
          regularPrice: dto.regularPrice, salePrice: dto.salePrice ?? null,
          brand: dto.brand, sizes: dto.sizes ?? [], sku: dto.sku?.trim() || null,
          apliiqDesignSku: dto.apliiqDesignSku?.trim() || null,
          stockQuantity: dto.stockQuantity ?? 0, isActive: dto.isActive ?? true,
          categoryId: dto.categoryId, subcategoryId: dto.subcategoryId,
          imageUrl: image.secure_url, imagePublicId: image.public_id,
          ...(dto.collectionIds?.length && { collections: { create: this.createCollectionLinks(dto.collectionIds) } }),
        },
        include: { category: true, subcategory: true, collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      try { await this.cloudinaryService.deleteImage(image.public_id); } catch { /* log and retry cleanup */ }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, file?: Express.Multer.File) {
    const existing = await this.findOne(id);
    const categoryId = dto.categoryId ?? existing.categoryId;
    const subcategoryId = dto.subcategoryId ?? existing.subcategoryId;
    if (dto.regularPrice !== undefined || dto.salePrice !== undefined) {
      this.validatePrices(dto.regularPrice ?? Number(existing.regularPrice.toString()),
        dto.salePrice === undefined ? existing.salePrice?.toNumber() ?? null : dto.salePrice);
    }
    if (dto.categoryId !== undefined || dto.subcategoryId !== undefined) await this.validateCategory(categoryId, subcategoryId);
    if (dto.collectionIds !== undefined) await this.validateCollections(dto.collectionIds);
    const newImage = file ? await this.cloudinaryService.uploadImage(file) : null;
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.collectionIds !== undefined) await tx.productCollection.deleteMany({ where: { productId: id } });
        return tx.product.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name.trim() }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.regularPrice !== undefined && { regularPrice: dto.regularPrice }),
            ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
            ...(dto.brand !== undefined && { brand: dto.brand }),
            ...(dto.sizes !== undefined && { sizes: dto.sizes }),
            ...(dto.sku !== undefined && { sku: dto.sku?.trim() || null }),
            ...(dto.apliiqDesignSku !== undefined && { apliiqDesignSku: dto.apliiqDesignSku?.trim() || null }),
            ...(dto.stockQuantity !== undefined && { stockQuantity: dto.stockQuantity }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
            ...(dto.subcategoryId !== undefined && { subcategoryId: dto.subcategoryId }),
            ...(dto.collectionIds !== undefined && { collections: { create: this.createCollectionLinks(dto.collectionIds) } }),
            ...(newImage && { imageUrl: newImage.secure_url, imagePublicId: newImage.public_id }),
          },
          include: { category: true, subcategory: true, collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } } },
        });
      });
      if (newImage && existing.imagePublicId) {
        try { await this.cloudinaryService.deleteImage(existing.imagePublicId); } catch { /* log and retry cleanup */ }
      }
      return updated;
    } catch (error) {
      if (newImage) {
        try { await this.cloudinaryService.deleteImage(newImage.public_id); } catch { /* log and retry cleanup */ }
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { message: 'Product archived successfully', id };
  }
}