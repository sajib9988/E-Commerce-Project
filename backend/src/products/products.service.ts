import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

function sanitizePublicProduct(product: any) {
  const publicProduct = { ...product };
  delete publicProduct.imagePublicId;
  delete publicProduct.apliiqDesignSku;

  return {
    ...publicProduct,
    variants: product.variants?.map((variant: any) => {
      const publicVariant = { ...variant };
      delete publicVariant.apliiqVariantSku;
      delete publicVariant.apliiqDesignId;
      delete publicVariant.apliiqColorId;
      return publicVariant;
    }),
    artworks: product.artworks?.map((artwork: any) => {
      const publicArtwork = { ...artwork };
      delete publicArtwork.imagePublicId;
      delete publicArtwork.apliiqArtworkId;
      if (Array.isArray(publicArtwork.placements)) {
        publicArtwork.placements = publicArtwork.placements.map((placement: any) => {
          const publicPlacement = { ...placement };
          delete publicPlacement.id;
          delete publicPlacement.artworkId;
          delete publicPlacement.locationId;
          delete publicPlacement.boxId;
          return publicPlacement;
        });
      }
      return publicArtwork;
    }),
    apliiqDesigns: product.apliiqDesigns?.map(({ mockupUrl, mockupUrls }: any) => ({
      mockupUrl,
      mockupUrls,
    })),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly cloudinaryService: CloudinaryService) {}

  async findAll(filters: { collectionSlug?: string; page?: number; limit?: number; search?: string; categoryId?: string; sortBy?: string; sortOrder?: string; minPrice?: number; maxPrice?: number } = {}) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(filters.collectionSlug && { collections: { some: { collection: { slug: filters.collectionSlug, isActive: true } } } }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.search?.trim() && { OR: [
        { name: { contains: filters.search.trim(), mode: 'insensitive' } },
        { description: { contains: filters.search.trim(), mode: 'insensitive' } },
        { brand: { contains: filters.search.trim(), mode: 'insensitive' } },
      ] }),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined ? {
        regularPrice: {
          ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
          ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
        },
      } : {}),
    };
    const sortField = ['createdAt', 'updatedAt', 'name', 'regularPrice'].includes(filters.sortBy ?? '')
      ? filters.sortBy as 'createdAt' | 'updatedAt' | 'name' | 'regularPrice' : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = sortField === 'name'
      ? { name: sortOrder } : sortField === 'updatedAt'
        ? { updatedAt: sortOrder } : sortField === 'regularPrice'
          ? { regularPrice: sortOrder } : { createdAt: sortOrder };
    const include = {
      category: true, subcategory: true,
      variants: { where: { isActive: true }, include: { size: true } },
      collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' as const } },
      artworks: { include: { placements: true }, orderBy: { isPrimary: 'desc' as const } },
      apliiqDesigns: true,
    } as const;
    // Keep the legacy array response when pagination is not requested.
    if (filters.page === undefined && filters.limit === undefined) {
      const products = await this.prisma.product.findMany({ where, include, orderBy });
      return products.map(sanitizePublicProduct);
    }
    const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page!)) : 1;
    const limit = Number.isFinite(filters.limit) ? Math.min(100, Math.max(1, Math.floor(filters.limit!))) : 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(sanitizePublicProduct), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findAllForAdmin(params: { page?: number; limit?: number; search?: string; categoryId?: string; isActive?: boolean; sortBy?: string; sortOrder?: string } = {}) {
    const where: Prisma.ProductWhereInput = {
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.search?.trim() && { OR: [
        { name: { contains: params.search.trim(), mode: 'insensitive' } },
        { description: { contains: params.search.trim(), mode: 'insensitive' } },
        { brand: { contains: params.search.trim(), mode: 'insensitive' } },
      ] }),
    };
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
    const sortField = ['createdAt', 'updatedAt', 'name', 'regularPrice'].includes(params.sortBy ?? '')
      ? params.sortBy as 'createdAt' | 'updatedAt' | 'name' | 'regularPrice' : 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = sortField === 'name'
      ? { name: sortOrder } : sortField === 'updatedAt'
        ? { updatedAt: sortOrder } : sortField === 'regularPrice'
          ? { regularPrice: sortOrder } : { createdAt: sortOrder };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: { category: true, subcategory: true, variants: { include: { size: true } },
          collections: { include: { collection: true } }, artworks: { include: { placements: true } }, apliiqDesigns: true },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        category: true, subcategory: true,
        variants: { where: { isActive: true }, include: { size: true } },
        collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } },
        artworks: { include: { placements: true }, orderBy: { isPrimary: 'desc' } },
        apliiqDesigns: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return sanitizePublicProduct(product);
  }

  async findOneForAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true, subcategory: true,
        variants: { include: { size: true } },
        collections: { include: { collection: true }, orderBy: { sortOrder: 'asc' } },
        artworks: { include: { placements: true }, orderBy: { isPrimary: 'desc' } },
        apliiqDesigns: true,
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
    const existing = await this.findOneForAdmin(id);
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
        const artworkStillUsesImage = await this.prisma.productArtwork.count({ where: { productId: id, imagePublicId: existing.imagePublicId } });
        if (artworkStillUsesImage === 0) {
          try { await this.cloudinaryService.deleteImage(existing.imagePublicId); } catch { /* log and retry cleanup */ }
        }
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