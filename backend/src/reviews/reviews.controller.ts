import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Public } from '../common/decorators/public.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('products/:productId/reviews')
  create(@CurrentUser() user: AuthTokenPayload, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, productId, dto);
  }

  @Public()
  @Get('products/:productId/reviews')
  findApproved(@Param('productId') productId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviews.findApproved(productId, Number(page) || 1, Number(limit) || 20);
  }

  @Get('reviews/me')
  findOwn(@CurrentUser() user: AuthTokenPayload) {
    return this.reviews.findOwn(user.sub);
  }

  @Patch('reviews/:id')
  updateOwn(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.reviews.updateOwn(user.sub, id, dto);
  }

  @Delete('reviews/:id')
  deleteOwn(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.reviews.deleteOwn(user.sub, id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/reviews')
  findAllForAdmin(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.reviews.findAllForAdmin(status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/reviews/:id/moderate')
  moderate(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(id, user.sub, dto.status, dto.note);
  }
}