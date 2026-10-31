import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CmsSectionDto, CreateCmsPageDto, UpdateCmsPageDto } from './cms-page.dto';
import { assertSafeBlockContent } from '../common/utils/cms-block-content.validator';

;


const fullTree = {
  sections: {
    orderBy: { sortOrder: 'asc' },
    include: { blocks: { orderBy: { sortOrder: 'asc' } } },
  },
} satisfies Prisma.CmsPageInclude;

type Json = Prisma.InputJsonObject;

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin list: tree chara, halka
  findAll() {
    return this.prisma.cmsPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { sections: true } } },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id }, include: fullTree });
    if (!page) throw new NotFoundException(`Page ${id} not found`);
    return page;
  }

  // Public: shudhu published + schedule shesh + visible content
  async findPublicBySlug(slug: string) {
    const page = await this.prisma.cmsPage.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            blocks: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  create(dto: CreateCmsPageDto) {
    return this.withSlugConflict(() =>
      this.prisma.cmsPage.create({
        data: {
          ...dto,
          publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        },
        include: fullTree,
      }),
    );
  }

async update(id: string, dto: UpdateCmsPageDto) {
  const existing = await this.prisma.cmsPage.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) throw new NotFoundException(`Page ${id} not found`);

  const { sections, publishAt, ...fields } = dto;

  return this.withSlugConflict(() =>
    this.prisma.$transaction(async (tx) => {
      if (sections) await tx.cmsSection.deleteMany({ where: { pageId: id } });

      return tx.cmsPage.update({
        where: { id },
        data: {
          ...fields,
          ...(publishAt !== undefined && {
            publishAt: publishAt === null ? null : new Date(publishAt),
          }),
          ...(fields.status === 'PUBLISHED' &&
            !existing.publishedAt && { publishedAt: new Date() }),
          ...(sections && { sections: { create: this.buildTree(sections) } }),
        },
        include: fullTree,
      });
    }),
  );
}

async publish(id: string) {
  const page = await this.prisma.cmsPage.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!page) throw new NotFoundException(`Page ${id} not found`);

  return this.prisma.cmsPage.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: page.publishedAt ?? new Date() },
    include: fullTree,
  });
}

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.cmsPage.delete({ where: { id } });
    return { success: true };
  }

  // sortOrder client theke na niye array index theke ney (trust kora jay na)
  private buildTree(sections: CmsSectionDto[]) {
    return sections.map((s, i) => ({
      name: s.name,
      sortOrder: i,
      isVisible: s.isVisible ?? true,
      settings: (s.settings ?? {}) as Json,
   
blocks: {
  create: s.blocks.map((b, j) => {
    // Database-এ save করার আগে URL নিরাপদ কি না যাচাই
    assertSafeBlockContent(b.type, b.content);

    return {
      type: b.type,
      content: b.content as Json,
      settings: (b.settings ?? {}) as Json,
      sortOrder: j,
      isVisible: b.isVisible ?? true,
    };
  }),
},

    }));
  }

  private async withSlugConflict<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A page with this slug already exists');
      }
      throw e;
    }
  }
}