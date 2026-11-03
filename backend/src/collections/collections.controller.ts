import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}
  @Public() @Get() findAll(@Query('featured') featured?: string) { return this.collections.findAll(featured === 'true'); }
  @Public() @Get(':slug') findBySlug(@Param('slug') slug: string) { return this.collections.findBySlug(slug); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Post() create(@Body() dto: CreateCollectionDto) { return this.collections.create(dto); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) { return this.collections.update(id, dto); }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Delete(':id') archive(@Param('id') id: string) { return this.collections.archive(id); }
}