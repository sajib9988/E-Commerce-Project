import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { MediaType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { ALLOWED_MIME_TYPES } from './media.constants';
import type { UpdateMediaDto, UploadMediaDto } from './media.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findAll() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);
    return asset;
  }

  async upload(file: Express.Multer.File | undefined, dto: UploadMediaDto) {
    if (!file) throw new BadRequestException('File is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    let uploaded;
    try {
      uploaded = await this.cloudinary.upload(file);
    } catch (error) {
      this.logger.error('Cloudinary upload failed', error as Error);
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
      // DB fail হলে Cloudinary-তে orphan file থেকে যাবে, তাই cleanup
      await this.cloudinary
        .destroy(uploaded.public_id, type)
        .catch((e: Error) =>
          this.logger.error(`Orphan cleanup failed: ${uploaded.public_id}`, e),
        );
      throw error;
    }
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);
    return this.prisma.mediaAsset.update({ where: { id }, data: dto });
  }

// কোন কোন page এই asset ব্যবহার করছে
async findUsage(id: string) {
  const asset = await this.findOne(id);
  const needle = asset.publicId ?? asset.url;

  const pages = await this.prisma.$queryRaw<
    { id: string; name: string; slug: string }[]
  >(Prisma.sql`
    SELECT DISTINCT p.id, p.name, p.slug
    FROM cms_pages p
    LEFT JOIN cms_sections s ON s."pageId" = p.id
    LEFT JOIN cms_blocks b ON b."sectionId" = s.id
    WHERE position(${needle}::text in b.content::text) > 0
       OR position(${needle}::text in COALESCE(p."ogImage", '')) > 0
  `);

  return { asset, pages };
}

// কোন কোন page এই asset ব্যবহার করছে
async findUsage(id: string) {
  const asset = await this.findOne(id);
  const needle = asset.publicId ?? asset.url;

  const pages = await this.prisma.$queryRaw<
    { id: string; name: string; slug: string }[]
  >(Prisma.sql`
    SELECT DISTINCT p.id, p.name, p.slug
    FROM cms_pages p
    LEFT JOIN cms_sections s ON s."pageId" = p.id
    LEFT JOIN cms_blocks b ON b."sectionId" = s.id
    WHERE position(${needle}::text in b.content::text) > 0
       OR position(${needle}::text in COALESCE(p."ogImage", '')) > 0
  `);

  return { asset, pages };
}

