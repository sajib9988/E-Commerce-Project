import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('overview') overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.overview(from, to);
  }
}