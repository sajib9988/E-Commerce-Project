
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Express } from 'express';
import type { MediaType } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { ALLOWED_MIME_TYPES } from './media.constants';
import type { UpdateMediaDto, UploadMediaDto } from './media.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // সব media list
  findAll() {
    return this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // একটি media খোঁজা
  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    return asset;
  }

  // Cloudinary-তে upload এবং database-এ save
  async upload(
    file: Express.Multer.File | undefined,
    dto: UploadMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    let uploaded;

    try {
      uploaded = await this.cloudinary.upload(file);
    } catch (error) {
      this.logger.error(
        'Cloudinary upload failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new BadGatewayException('Media upload failed');
    }

    const type: MediaType =
      uploaded.resource_type === 'video' ? 'VIDEO' : 'IMAGE';

    try {
      return await this.prisma.mediaAsset.create({
        data: {
          type,
          name: file.originalname,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          mimeType: file.mimetype,
          altText: dto.altText,
          width: uploaded.width,
          height: uploaded.height,
        },
      });
    } catch (error) {
  
      try {
        await this.cloudinary.destroy(uploaded.public_id, type);
      } catch (cleanupError) {
        this.logger.error(
          `Orphan cleanup failed: ${uploaded.public_id}`,
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }

      throw error;
    }
  }

  // Media metadata update
  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);

    return this.prisma.mediaAsset.update({
      where: { id },
      data: dto,
    });
  }

  // কোন কোন CMS page-এ media ব্যবহৃত হয়েছে
  async findUsage(id: string) {
    const asset = await this.findOne(id);
    const needle = asset.publicId ?? asset.url;

    const pages = await this.prisma.$queryRaw<
      { id: string; name: string; slug: string }[]
    >(
      Prisma.sql`
        SELECT DISTINCT p.id, p.name, p.slug
        FROM cms_pages p
        LEFT JOIN cms_sections s
          ON s."pageId" = p.id
        LEFT JOIN cms_blocks b
          ON b."sectionId" = s.id
        WHERE position(${needle}::text in b.content::text) > 0
           OR position(
             ${needle}::text in COALESCE(p."ogImage", '')
           ) > 0
      `,
    );

    return { asset, pages };
  }

  // Media delete
  async remove(id: string, force = false) {
    const asset = await this.findOne(id);
    const usage = await this.findUsage(id);

    if (usage.pages.length > 0 && !force) {
      throw new BadRequestException({
        message: 'Media is currently being used by CMS pages',
        pages: usage.pages,
      });
    }

    // Cloudinary-তে file থাকলে আগে delete
    if (asset.publicId) {
      try {
        await this.cloudinary.destroy(asset.publicId, asset.type);
      } catch (error) {
        this.logger.error(
          'Cloudinary delete failed',
          error instanceof Error ? error.stack : String(error),
        );

        throw new BadGatewayException('Media delete failed');
      }
    }

    await this.prisma.mediaAsset.delete({
      where: { id },
    });

    return { success: true };
  }
}
