import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}
  @Public() @Get() findAll(
    @Query('featured') featured?: string, @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('search') search?: string, @Query('sortBy') sortBy?: string, @Query('sortOrder') sortOrder?: string,
  ) {
    return this.collections.findAll(featured === 'true', {
      page: page === undefined ? undefined : Number(page), limit: limit === undefined ? undefined : Number(limit),
      search, sortBy, sortOrder,
    });
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/list')
  findAllForAdmin(
    @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string,
    @Query('isActive') isActive?: string, @Query('isFeatured') isFeatured?: string,
    @Query('sortBy') sortBy?: string, @Query('sortOrder') sortOrder?: string,
  ) {
    return this.collections.findAllForAdmin({
      page: Number(page) || 1, limit: Number(limit) || 20, search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      isFeatured: isFeatured === undefined ? undefined : isFeatured === 'true', sortBy, sortOrder,
    });
  }
  @Public() @Get(':slug') findBySlug(@Param('slug') slug: string) { return this.collections.findBySlug(slug); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Post() create(@Body() dto: CreateCollectionDto) { return this.collections.create(dto); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) { return this.collections.update(id, dto); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Delete(':id') archive(@Param('id') id: string) { return this.collections.archive(id); }
}