import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AiService } from '../ai.service';
import { ChatDto } from '../dto/chat.dto';

@Public()
@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto.message);
  }
}
