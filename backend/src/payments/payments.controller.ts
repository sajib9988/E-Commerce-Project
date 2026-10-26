import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';

type AuthRequest = Request & { user: { id: string } };

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  createCheckout(@Req() req: AuthRequest, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(req.user.id, dto.orderId);
  }
}
