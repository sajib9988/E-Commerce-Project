import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(featuredOnly = false, params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string } = {}) {
    const where: Prisma.CollectionWhereInput = {
      isActive: true,
      ...(featuredOnly && { isFeatured: true }),
      ...(params.search?.trim() && { OR: [
        { name: { contains: params.search.trim(), mode: 'insensitive' } },
        { description: { contains: params.search.trim(), mode: 'insensitive' } },
      ] }),
    };
    const include = { _count: { select: { products: true } }, products: { where: { product: { isActive: true } }, orderBy: { sortOrder: 'asc' as const }, include: { product: { include: { category: true, subcategory: true, variants: { where: { isActive: true }, include: { size: true } }, apliiqDesigns: { orderBy: { createdAt: 'asc' as const } } } } } } } as const;
    const sortBy = params.sortBy === 'name' || params.sortBy === 'createdAt' ? params.sortBy : 'sortOrder';
    const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.CollectionOrderByWithRelationInput[] = [
      sortBy === 'name' ? { name: sortOrder } : sortBy === 'createdAt' ? { createdAt: sortOrder } : { sortOrder },
      { name: 'asc' },
    ];
    if (params.page === undefined && params.limit === undefined) {
      return this.prisma.collection.findMany({ where, orderBy, include });
    }
    const page = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page!)) : 1;
    const limit = Number.isFinite(params.limit) ? Math.min(100, Math.max(1, Math.floor(params.limit!))) : 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({ where, orderBy, include, skip: (page - 1) * limit, take: limit }),
      this.prisma.collection.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findAllForAdmin(params: { page?: number; limit?: number; search?: string; isActive?: boolean; isFeatured?: boolean; sortBy?: string; sortOrder?: string } = {}) {
    const where: Prisma.CollectionWhereInput = {
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
      ...(params.search?.trim() && { OR: [
        { name: { contains: params.search.trim(), mode: 'insensitive' } },
        { description: { contains: params.search.trim(), mode: 'insensitive' } },
      ] }),
    };
    const page = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page!)) : 1;
    const limit = Number.isFinite(params.limit) ? Math.min(100, Math.max(1, Math.floor(params.limit!))) : 20;
    const sortBy = params.sortBy === 'name' || params.sortBy === 'createdAt' ? params.sortBy : 'sortOrder';
    const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.CollectionOrderByWithRelationInput[] = [
      sortBy === 'name' ? { name: sortOrder } : sortBy === 'createdAt' ? { createdAt: sortOrder } : { sortOrder },
      { name: 'asc' },
    ];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit,
        include: { _count: { select: { products: true } }, products: { include: { product: { include: { variants: { include: { size: true } } } } } } } }),
      this.prisma.collection.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { slug, isActive: true },
      include: { products: { where: { product: { isActive: true } }, orderBy: { sortOrder: 'asc' }, include: { product: { include: { category: true, subcategory: true, variants: { where: { isActive: true }, include: { size: true } }, apliiqDesigns: { orderBy: { createdAt: 'asc' } } } } } } },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }
  async create(dto: CreateCollectionDto) {
    try { return await this.prisma.collection.create({ data: {
      name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(), description: dto.description?.trim() || null,
      bannerImage: dto.bannerImage || null, thumbnail: dto.thumbnail || null,
      isActive: dto.isActive ?? true, isFeatured: dto.isFeatured ?? false, sortOrder: dto.sortOrder ?? 0,
    } }); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Collection slug already exists');
      throw error;
    }
  }
  async update(id: string, dto: UpdateCollectionDto) {
    if (!await this.prisma.collection.findUnique({ where: { id } })) throw new NotFoundException('Collection not found');
    try { return await this.prisma.collection.update({ where: { id }, data: {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage || null }),
      ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail || null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    } }); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Collection slug already exists');
      throw error;
    }
  }
  async archive(id: string) {
    if (!await this.prisma.collection.findUnique({ where: { id } })) throw new NotFoundException('Collection not found');
    await this.prisma.collection.update({ where: { id }, data: { isActive: false, isFeatured: false } });
    return { success: true, id, archived: true };
  }
}