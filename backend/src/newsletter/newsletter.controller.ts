import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '../../generated/prisma/enums';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NewsletterSignupDto } from './dto/signup.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('signup')
  signup(@Body() dto: NewsletterSignupDto) {
    return this.newsletter.signup(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/subscribers')
  listSubscribers() {
    return this.newsletter.findSubscribers();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/subscribers/:id/unsubscribe')
  unsubscribe(@Param('id') id: string) {
    return this.newsletter.unsubscribe(id);
  }
}
