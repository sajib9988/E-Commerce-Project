import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../common/types/auth-token-payload';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../../generated/prisma/enums';
import { CreateReviewDto, ModerateReviewDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('products/:productId/reviews')
  create(@CurrentUser() user: AuthTokenPayload, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, productId, dto);
  }

  @Get('products/:productId/reviews')
  findApproved(@Param('productId') productId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviews.findApproved(productId, page, limit);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/reviews/pending')
  findPending() { return this.reviews.findPending(); }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/reviews/:reviewId/moderate')
  moderate(@CurrentUser() user: AuthTokenPayload, @Param('reviewId') reviewId: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(reviewId, user.sub, dto.decision, dto.note);
  }
}
