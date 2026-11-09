import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AiKnowledgeService } from '../ai/services/ai-knowledge.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CmsSectionDto,
  CreateCmsPageDto,
  UpdateCmsPageDto,
} from './cms-page.dto';
import { assertSafeBlockContent } from '../common/utils/cms-block-content.validator';

const fullTree = {
  sections: {
    orderBy: { sortOrder: 'asc' },
    include: { blocks: { orderBy: { sortOrder: 'asc' } } },
  },
} satisfies Prisma.CmsPageInclude;

type Json = Prisma.InputJsonObject;

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiKnowledge: AiKnowledgeService,
  ) {}

  findAll() {
    return this.prisma.cmsPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { sections: true } } },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
      include: fullTree,
    });

    if (!page) throw new NotFoundException(`Page ${id} not found`);
    return page;
  }

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
            blocks: {
              where: { isVisible: true },
              orderBy: { sortOrder: 'asc' },
            },
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

    if (sections) await this.validateCollectionBlocks(sections);

    const updatedPage = await this.withSlugConflict(() =>
      this.prisma.$transaction(async (tx) => {
        if (sections) {
          await tx.cmsSection.deleteMany({ where: { pageId: id } });
        }

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

    // A draft/archived page causes syncCmsPage to remove its old embeddings.
    // A published page is re-embedded using the updated CMS content.
    await this.aiKnowledge.syncCmsPage(id);

    return updatedPage;
  }

  async publish(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
      select: { publishedAt: true },
    });

    if (!page) throw new NotFoundException(`Page ${id} not found`);

    const publishedPage = await this.prisma.cmsPage.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: page.publishedAt ?? new Date(),
      },
      include: fullTree,
    });

    await this.aiKnowledge.syncCmsPage(id);
    return publishedPage;
  }

  async unpublish(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const page = await tx.cmsPage.updateMany({
        where: { id },
        data: { status: 'DRAFT' },
      });

      if (!page.count) throw new NotFoundException(`Page ${id} not found`);

      await tx.$executeRaw`
        DELETE FROM ai_knowledge_chunks WHERE source = ${`cms:${id}`}
      `;
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cmsPage.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) throw new NotFoundException(`Page ${id} not found`);

      await tx.cmsPage.delete({ where: { id } });
      await tx.$executeRaw`
        DELETE FROM ai_knowledge_chunks WHERE source = ${`cms:${id}`}
      `;
    });

    return { success: true };
  }

  private async validateCollectionBlocks(sections: CmsSectionDto[]) {
    const slugs = [...new Set(
      sections.flatMap((section) =>
        section.blocks
          .filter((block) => block.type === 'PRODUCT_COLLECTION')
          .map((block) => block.content.collectionSlug)
          .filter((slug): slug is string => typeof slug === 'string'),
      ),
    )];

    if (!slugs.length) return;

    const active = await this.prisma.collection.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: { slug: true },
    });

    const allowed = new Set(active.map((item) => item.slug));
    const invalid = slugs.filter((slug) => !allowed.has(slug));

    if (invalid.length) {
      throw new BadRequestException(
        `CMS Product Collection block references missing or inactive collection(s): ${invalid.join(', ')}`,
      );
    }
  }

  private buildTree(sections: CmsSectionDto[]) {
    return sections.map((section, sectionIndex) => ({
      name: section.name,
      sortOrder: sectionIndex,
      isVisible: section.isVisible ?? true,
      settings: (section.settings ?? {}) as Json,
      blocks: {
        create: section.blocks.map((block, blockIndex) => {
          assertSafeBlockContent(block.type, block.content);

          return {
            type: block.type,
            content: block.content as Json,
            settings: (block.settings ?? {}) as Json,
            sortOrder: blockIndex,
            isVisible: block.isVisible ?? true,
          };
        }),
      },
    }));
  }

  private async withSlugConflict<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A page with this slug already exists');
      }

      throw error;
    }
  }
}
