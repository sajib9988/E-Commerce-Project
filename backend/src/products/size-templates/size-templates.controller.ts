import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AddSizeDto, CreateSizeTemplateDto, UpdateSizeTemplateDto } from './size-templates.dto';
import { SizeTemplatesService } from './size-templates.service';

@Controller('size-templates')
export class SizeTemplatesController {
  constructor(private readonly service: SizeTemplatesService) {}

  @Public()
  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.service.list(includeInactive === 'true');
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateSizeTemplateDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSizeTemplateDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/sizes')
  addSize(@Param('id') id: string, @Body() dto: AddSizeDto) {
    return this.service.addSize(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/sizes/:sizeId/archive')
  archiveSize(@Param('id') id: string, @Param('sizeId') sizeId: string) {
    return this.service.archiveSize(id, sizeId);
  }
}
