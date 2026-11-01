import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  createPendingOrder(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.createPendingOrder(user.sub, dto);
  }
}
