import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiKnowledgeService {
  private readonly embeddings: OpenAIEmbeddings;
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
      model: config.get<string>('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
    });
  }

  private extractText(value: unknown, key = ''): string[] {
    const ignoredKeys = new Set([
      'url', 'href', 'src', 'image', 'imageUrl', 'publicId',
      'desktopImage', 'mobileImage', 'videoUrl',
    ]);

    if (ignoredKeys.has(key)) return [];

    if (typeof value === 'string') {
      return value.trim() ? [value.trim()] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractText(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([childKey, childValue]) =>
        this.extractText(childValue, childKey),
      );
    }

    return [];
  }

  async syncCmsPage(pageId: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id: pageId },
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

    const source = `cms:${pageId}`;

    if (!page) {
      await this.deleteSource(source);
      return { message: 'CMS page no longer exists. Existing knowledge removed.' };
    }
    const isPublished =
      page.status === 'PUBLISHED' &&
      (!page.publishAt || page.publishAt <= new Date());

    if (!isPublished) {
      await this.deleteSource(source);
      return { message: 'Page is not published. Existing knowledge removed.' };
    }

    const content = [
      page.name,
      page.description,
      ...page.sections.flatMap((section) => [
        section.name,
        ...section.blocks.flatMap((block) => this.extractText(block.content)),
      ]),
    ].filter(Boolean).join('\n');

    if (!content.trim()) {
      await this.deleteSource(source);
      return { message: 'No readable CMS content found.' };
    }

    const chunks = await this.splitter.splitText(content);
    const vectors = await this.embeddings.embedDocuments(chunks);

    if (vectors.some((vector) => vector.length !== 1536)) {
      throw new Error('Expected 1536-dimensional embeddings.');
    }

    // Generate embeddings before opening the transaction. The transaction only
    // replaces rows, so the database connection is not held during OpenAI calls.
    const rows = chunks.map((chunk, index) => ({
      id: randomUUID(),
      source,
      content: chunk,
      embedding: `[${vectors[index].join(',')}]`,
      metadata: JSON.stringify({
        pageId: page.id,
        slug: page.slug,
        title: page.name,
        chunkIndex: index,
      }),
    }));

    // A single INSERT avoids one database round-trip per chunk and keeps the
    // delete + insert replacement atomic.
    const rowsJson = JSON.stringify(rows);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          DELETE FROM ai_knowledge_chunks WHERE source = ${source}
        `;

        await tx.$executeRaw`
          INSERT INTO ai_knowledge_chunks
            (id, source, content, embedding, metadata)
          SELECT
            item.id,
            item.source,
            item.content,
            item.embedding::vector,
            item.metadata::jsonb
          FROM jsonb_to_recordset(${rowsJson}::jsonb) AS item(
            id text,
            source text,
            content text,
            embedding text,
            metadata text
          )
        `;
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    return { message: 'CMS page indexed.', pageId, chunks: chunks.length };
  }

  async searchKnowledge(question: string) {
    const vector = await this.embeddings.embedQuery(question);

    if (vector.length !== 1536) {
      throw new Error('Expected 1536-dimensional query embedding.');
    }

    const queryVector = `[${vector.join(',')}]`;

    const results = await this.prisma.$queryRaw<
      Array<{
        content: string;
        metadata: { title?: string; slug?: string; pageId?: string };
        distance: number;
      }>
    >`
      SELECT
        content,
        metadata,
        (embedding <=> ${queryVector}::vector) AS distance
      FROM ai_knowledge_chunks
      ORDER BY embedding <=> ${queryVector}::vector
      LIMIT 5
    `;

    return results
      .filter((item) => item.distance < 0.65)
      .map((item) => ({
        content: item.content,
        title: item.metadata?.title,
        slug: item.metadata?.slug,
        distance: item.distance,
      }));
  }

  async deleteSource(source: string) {
    await this.prisma.$executeRaw`
      DELETE FROM ai_knowledge_chunks WHERE source = ${source}
    `;
  }
}
