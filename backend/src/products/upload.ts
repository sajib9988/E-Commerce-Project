import { BadRequestException } from '@nestjs/common';
import { memoryStorage, MulterOptions } from 'multer';

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
