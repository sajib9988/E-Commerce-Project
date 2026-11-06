import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { CustomersService } from './customers.service';

@Controller('admin/customers')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customers.findAll({
      search,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }
}
