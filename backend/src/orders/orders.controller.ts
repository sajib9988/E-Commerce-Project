import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  createPendingOrder(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateOrderDto) {
    return this.orders.createPendingOrder(user.sub, dto);
  }

  @Get('orders/me')
  findMine(@CurrentUser() user: AuthTokenPayload, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.orders.findMyOrders(user.sub, Number(page) || 1, Number(limit) || 20);
  }

  @Get('orders/:id')
  findMineById(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.orders.findMyOrder(user.sub, id);
  }

  @Post('orders/:id/cancel')
  cancelMine(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.orders.cancelMyOrder(user.sub, id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/orders')
  findAllForAdmin(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.orders.findAllForAdmin(Number(page) || 1, Number(limit) || 20, status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/orders/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.orders.findOneForAdmin(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/orders/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orders.updateStatusByAdmin(id, status);
  }
}
