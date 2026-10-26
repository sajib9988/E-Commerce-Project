import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  validate(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.validatePreview(user.sub, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.couponsService.findAllForAdmin();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOneForAdmin(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  disable(@Param('id') id: string) {
    return this.couponsService.disable(id);
  }
}
