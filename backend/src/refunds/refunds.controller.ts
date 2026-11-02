import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ResolveRefundRequestDto } from './dto/resolve-refund-request.dto';
import { RefundsService } from './refunds.service';

@Controller()
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('orders/:orderId/refund-requests')
  create(@CurrentUser() user: AuthTokenPayload, @Param('orderId') orderId: string, @Body() dto: CreateRefundRequestDto) {
    return this.refunds.createRequest(user.sub, orderId, dto.reason, dto.customerNote);
  }

  @Get('refund-requests/me')
  findMine(@CurrentUser() user: AuthTokenPayload) {
    return this.refunds.findMine(user.sub);
  }

  @Get('refund-requests/:id')
  findMineById(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.refunds.findMineById(user.sub, id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/refund-requests')
  findAllForAdmin(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'REFUNDED' | 'FAILED') {
    return this.refunds.findAllForAdmin(status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/refund-requests/:id/approve')
  approve(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: ResolveRefundRequestDto) {
    return this.refunds.approve(id, user.sub, dto.adminNote);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/refund-requests/:id/reject')
  reject(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: ResolveRefundRequestDto) {
    return this.refunds.reject(id, user.sub, dto.adminNote ?? '');
  }
}
