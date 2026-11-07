import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiChatController } from './controllers/ai-chat.controller';
import { AiKnowledgeController } from './controllers/ai-knowledge.controller';
import { ProductSearchService } from './services/product-search.service';
import { AiKnowledgeService } from './services/ai-knowledge.service';

@Module({
  controllers: [AiChatController, AiKnowledgeController],
  providers: [AiService, ProductSearchService, AiKnowledgeService],
  exports: [AiService, AiKnowledgeService],
})
export class AiModule {}
