import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [AiModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
