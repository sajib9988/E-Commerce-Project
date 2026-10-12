import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from './media.constants';
import { UpdateMediaDto, UploadMediaDto } from './media.dto';
import { MediaService } from './media.service';

// storage না দিলে multer memory storage ব্যবহার করে (buffer সরাসরি Cloudinary-তে যায়)
const uploadOptions: MulterOptions = {
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new BadRequestException('Unsupported file type'), false);
    }
    cb(null, true);
  },
};

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('cms/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  findAll() {
    return this.media.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.media.findOne(id);
  }

  @Get(':id/usage')
usage(@Param('id') id: string) {
  return this.media.findUsage(id);
}

@Delete(':id')
remove(@Param('id') id: string, @Query('force') force?: string) {
  return this.media.remove(id, force === 'true');
}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMediaDto,
  ) {
    return this.media.upload(file, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.media.update(id, dto);
  }


}