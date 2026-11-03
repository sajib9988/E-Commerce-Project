import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateSubcategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  private async uniqueError(error: unknown): Promise<never> {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A category or subcategory with this slug already exists');
    }
    throw error;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: {
        name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true,
      } });
    } catch (error) { return this.uniqueError(error); }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    try {
      return await this.prisma.category.update({ where: { id }, data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } });
    } catch (error) { return this.uniqueError(error); }
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { products: true, subcategories: true } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.products.length || category.subcategories.length) {
      throw new BadRequestException('Category has products or subcategories; deactivate it instead');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true, id };
  }

  async createSubcategory(categoryId: string, dto: CreateSubcategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    try {
      return await this.prisma.subcategory.create({ data: {
        categoryId, name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true,
      } });
    } catch (error) { return this.uniqueError(error); }
  }

  async updateSubcategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subcategory not found');
    try {
      return await this.prisma.subcategory.update({ where: { id }, data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } });
    } catch (error) { return this.uniqueError(error); }
  }

  async removeSubcategory(id: string) {
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id }, include: { products: true } });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    if (subcategory.products.length) throw new BadRequestException('Subcategory has products; deactivate it instead');
    await this.prisma.subcategory.delete({ where: { id } });
    return { success: true, id };
  }
}
