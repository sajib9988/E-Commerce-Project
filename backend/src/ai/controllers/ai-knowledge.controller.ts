import { Controller, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiKnowledgeService } from '../services/ai-knowledge.service';

@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('ai/knowledge')
export class AiKnowledgeController {
  constructor(private readonly knowledge: AiKnowledgeService) {}

  @Post('cms/:pageId/sync')
  syncCmsPage(@Param('pageId') pageId: string) {
    return this.knowledge.syncCmsPage(pageId);
  }
}
