import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SizeTemplatesController } from './size-templates.controller';
import { SizeTemplatesService } from './size-templates.service';

@Module({
  imports: [PrismaModule],
  controllers: [SizeTemplatesController],
  providers: [SizeTemplatesService],
  exports: [SizeTemplatesService],
})
export class SizeTemplatesModule {}
