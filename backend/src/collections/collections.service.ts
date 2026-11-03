import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(featuredOnly = false) {
    return this.prisma.collection.findMany({
      where: { isActive: true, ...(featuredOnly && { isFeatured: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } }, products: { where: { product: { isActive: true } }, orderBy: { sortOrder: 'asc' }, include: { product: { include: { category: true, subcategory: true, variants: { where: { isActive: true }, include: { size: true } } } } } } },
    });
  }
  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { slug, isActive: true },
      include: { products: { where: { product: { isActive: true } }, orderBy: { sortOrder: 'asc' }, include: { product: { include: { category: true, subcategory: true, variants: { where: { isActive: true }, include: { size: true } } } } } } },
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