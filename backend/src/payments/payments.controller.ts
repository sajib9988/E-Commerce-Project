import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ReviewRefundRequestDto } from './dto/review-refund-request.dto';
import { PaymentsService } from './payments.service';
import { ResolveManualReviewDto } from './dto/resolve-manual-review.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('manual-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAttemptsForManualReview() {
    return this.payments.findAttemptsForManualReview();
  }

  @Post('manual-review/:attemptId/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resolveManualReview(@CurrentUser() user: AuthTokenPayload, @Param('attemptId') attemptId: string, @Body() dto: ResolveManualReviewDto) {
    return this.payments.resolveManualReview(attemptId, user.sub, dto.decision, dto.note);
  }

  @Post('checkout')
  createCheckout(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(user.sub, dto.orderId);
  }

  @Post('refund-requests')
  createRefundRequest(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateRefundRequestDto) {
    return this.payments.createCustomerRefundRequest(user.sub, dto.orderId, dto.reason);
  }

  @Get('refund-requests/me')
  findMyRefundRequests(@CurrentUser() user: AuthTokenPayload) {
    return this.payments.findMyRefundRequests(user.sub);
  }

  @Get('admin/refund-requests')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findRefundRequestsForAdmin(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED') {
    return this.payments.findRefundRequestsForAdmin(status);
  }

  @Post('admin/refund-requests/:id/review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewRefundRequest(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: ReviewRefundRequestDto) {
    return this.payments.reviewRefundRequest(id, user.sub, dto.decision, dto.note);
  }
}
