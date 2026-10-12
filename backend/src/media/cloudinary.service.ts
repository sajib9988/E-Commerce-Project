import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { CLOUDINARY_FOLDER } from './media.constants';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor() {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
      process.env;

    this.configured = Boolean(
      CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET,
    );

    if (this.configured) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
      });
    } else {
      this.logger.warn('Cloudinary env vars missing — media upload disabled');
    }
  }

  upload(file: Express.Multer.File): Promise<UploadApiResponse> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: CLOUDINARY_FOLDER, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            return reject(error ?? new Error('Empty Cloudinary response'));
          }
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
  }

  // 'not found' মানে asset আগেই নেই, সেটা success ধরা হয় (idempotent delete)
  async destroy(publicId: string, type: 'IMAGE' | 'VIDEO'): Promise<void> {
    this.assertConfigured();

    const res = (await cloudinary.uploader.destroy(publicId, {
      resource_type: type === 'VIDEO' ? 'video' : 'image',
      invalidate: true,
    })) as { result: string };

    if (res.result !== 'ok' && res.result !== 'not found') {
      throw new Error(`Cloudinary destroy failed: ${res.result}`);
    }
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException('Media storage is not configured');
    }
  }
}