import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CmsService } from './cms.service';
import { CreateCmsPageDto, UpdateCmsPageDto } from './cms-page.dto';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('cms/pages')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  // ':id'-er age declare korte hobe, na hole "slug" id hishebe match hobe
  @Public()
  @Roles() // class-level role clear (services.controller-er moto)
  @Get('slug/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.cms.findPublicBySlug(slug);
  }

  @Get() findAll() { return this.cms.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.cms.findOne(id); }
  @Post() create(@Body() dto: CreateCmsPageDto) { return this.cms.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCmsPageDto) { return this.cms.update(id, dto); }
  @Patch(':id/publish') publish(@Param('id') id: string) { return this.cms.publish(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.cms.remove(id); }
}