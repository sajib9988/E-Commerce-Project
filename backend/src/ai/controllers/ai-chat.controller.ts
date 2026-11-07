import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AiService } from '../ai.service';
import { ChatDto } from '../dto/chat.dto';

@Public()
@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto.message);
  }
}
