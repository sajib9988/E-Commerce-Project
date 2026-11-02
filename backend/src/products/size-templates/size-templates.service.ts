import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddSizeDto, CreateSizeTemplateDto, UpdateSizeTemplateDto } from './size-templates.dto';

@Injectable()
export class SizeTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = true) {
    return this.prisma.sizeTemplate.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: { sizes: { where: activeOnly ? { isActive: true } : {}, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateSizeTemplateDto) {
    const labels = dto.sizes.map((size) => size.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) throw new BadRequestException('Size labels must be unique within a template');
    return this.prisma.sizeTemplate.create({
      data: {
        name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null, isActive: dto.isActive ?? true,
        sizes: { create: dto.sizes.map((size, index) => ({ label: size.label.trim(), normalizedKey: size.label.trim().toLowerCase(), sortOrder: size.sortOrder ?? index })) },
      },
      include: { sizes: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateSizeTemplateDto) {
    const existing = await this.prisma.sizeTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Size template not found');
    return this.prisma.sizeTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { sizes: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async addSize(templateId: string, dto: AddSizeDto) {
    const template = await this.prisma.sizeTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Size template not found');
    const label = dto.label.trim();
    return this.prisma.productSize.create({
      data: { templateId, label, normalizedKey: label.toLowerCase(), sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async archiveSize(templateId: string, sizeId: string) {
    const size = await this.prisma.productSize.findFirst({ where: { id: sizeId, templateId } });
    if (!size) throw new NotFoundException('Size not found in this template');
    return this.prisma.productSize.update({ where: { id: sizeId }, data: { isActive: false } });
  }
}
