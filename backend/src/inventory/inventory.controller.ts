import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { InventoryService } from './inventory.service';

@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}
  @Get('adjustments')
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.inventoryService.listAdjustments(Number(page) || 1, Number(limit) || 50);
  }
  @Post('adjustments')
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryService.createAdjustment(user.sub, dto);
  }
}