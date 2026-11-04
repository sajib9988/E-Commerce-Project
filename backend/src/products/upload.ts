import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const productImageUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Only JPEG, PNG and WebP images are allowed',
        ),
        false,
      );
    }

    callback(null, true);
  },
};

export const artworkImageUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Only JPEG, PNG and WebP artwork files are allowed'),
        false,
      );
    }
    callback(null, true);
  },
};
