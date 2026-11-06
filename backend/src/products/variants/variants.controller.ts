import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductVariantDto, UpdateProductVariantDto } from './variants.dto';
import { VariantsService } from './variants.service';

@Controller()
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Public()
  @Get('products/:productId/variants')
  list(@Param('productId') productId: string) {
    return this.variantsService.listForProduct(productId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('products/:productId/variants/admin')
  listForAdmin(@Param('productId') productId: string) {
    return this.variantsService.listForProduct(productId, true);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('products/variants')
  create(@Body() dto: CreateProductVariantDto) {
    return this.variantsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('products/variants/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('products/variants/:id/archive')
  archive(@Param('id') id: string) {
    return this.variantsService.archive(id);
  }
}
