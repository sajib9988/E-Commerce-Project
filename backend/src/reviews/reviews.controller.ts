import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:productId/reviews')
  findApproved(@Param('productId') productId: string) {
    return this.reviews.findApproved(productId);
  }

  @Post('products/:productId/reviews')
  create(@CurrentUser() user: AuthTokenPayload, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, productId, dto);
  }

  @Get('reviews/admin/pending')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findPending() {
    return this.reviews.findPendingForAdmin();
  }

  @Patch('reviews/admin/:id/moderate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  moderate(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(id, user.sub, dto.status, dto.note);
  }
}
