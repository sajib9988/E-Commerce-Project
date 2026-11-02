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
  findMyOrders(@CurrentUser() user: AuthTokenPayload, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.orders.findMyOrders(user.sub, page, limit);
  }

  @Get('me/:orderId')
  findMyOrder(@CurrentUser() user: AuthTokenPayload, @Param('orderId') orderId: string) {
    return this.orders.findMyOrder(user.sub, orderId);
  }

  @Post('me/:orderId/cancel')
  cancelMyOrder(@CurrentUser() user: AuthTokenPayload, @Param('orderId') orderId: string) {
    return this.orders.cancelMyOrder(user.sub, orderId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin')
  findAllForAdmin(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.orders.findAllForAdmin(page, limit, status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/:orderId')
  findOneForAdmin(@Param('orderId') orderId: string) {
    return this.orders.findOneForAdmin(orderId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/:orderId/status')
  updateOrderStatus(@CurrentUser() user: AuthTokenPayload, @Param('orderId') orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateOrderStatus(orderId, user.sub, dto.status, dto.note);
  }
}
