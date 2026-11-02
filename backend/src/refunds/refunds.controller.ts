import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ResolveRefundRequestDto } from './dto/resolve-refund-request.dto';
import { RefundsService } from './refunds.service';

@Controller('refund-requests')
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}
  @Post(':orderId') create(@CurrentUser() user: AuthTokenPayload, @Param('orderId') orderId: string, @Body() dto: CreateRefundRequestDto) {
    return this.refunds.createRequest(user.sub, orderId, dto.reason, dto.note);
  }
  @Get('me') findMine(@CurrentUser() user: AuthTokenPayload) { return this.refunds.findMine(user.sub); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/pending') findPending() { return this.refunds.findPending(); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/:requestId/resolve') resolve(@CurrentUser() user: AuthTokenPayload, @Param('requestId') id: string, @Body() dto: ResolveRefundRequestDto) {
    return this.refunds.resolve(id, user.sub, dto.decision, dto.note);
  }
}
