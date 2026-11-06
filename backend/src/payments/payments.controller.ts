import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';
import { ResolveManualReviewDto } from './dto/resolve-manual-review.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.payments.findAllForAdmin(Number(page) || 1, Number(limit) || 30, status);
  }

  @Get('manual-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAttemptsForManualReview() {
    return this.payments.findAttemptsForManualReview();
  }

  @Post('manual-review/:attemptId/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resolveManualReview(
    @CurrentUser() user: AuthTokenPayload,
    @Param('attemptId') attemptId: string,
    @Body() dto: ResolveManualReviewDto,
  ) {
    return this.payments.resolveManualReview(attemptId, user.sub, dto.decision, dto.note);
  }

  @Post('checkout')
  createCheckout(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(user.sub, dto.orderId);
  }
}
