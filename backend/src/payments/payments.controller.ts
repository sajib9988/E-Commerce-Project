import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('manual-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAttemptsForManualReview() {
    return this.payments.findAttemptsForManualReview();
  }

  @Post('checkout')
  createCheckout(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(user.sub, dto.orderId);
  }
}
