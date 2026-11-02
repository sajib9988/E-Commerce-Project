import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  createPendingOrder(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateOrderDto) {
    return this.orders.createPendingOrder(user.sub, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthTokenPayload) {
    return this.orders.findMyOrders(user.sub);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.orders.findAllForAdmin(status, Number(page ?? 1), Number(limit ?? 25));
  }

  @Get('admin/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOneForAdmin(@Param('id') id: string) {
    return this.orders.findOneForAdmin(id);
  }

  @Patch('admin/:id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatusByAdmin(id, dto.status);
  }

  @Get(':id')
  findMineById(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.orders.findMyOrder(user.sub, id);
  }

  @Post(':id/cancel')
  cancelMine(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.orders.cancelMyOrder(user.sub, id);
  }
}
