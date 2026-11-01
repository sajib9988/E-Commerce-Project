import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  createCheckout(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(user.sub, dto.orderId);
  }
}
