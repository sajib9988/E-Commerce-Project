import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionService } from './promotion.service';

@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotions: PromotionService) {}

  @Public()
  @Get('active-popup')
  getActivePopup() {
    return this.promotions.findActivePopup();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.promotions.findAllForAdmin();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  disable(@Param('id') id: string) {
    return this.promotions.disable(id);
  }
}
