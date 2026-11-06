import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthTokenPayload } from '../common/types/auth-token-payload';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';
@Roles('SUPER_ADMIN')
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @Get() findAll() { return this.settings.findAll(); }
  @Put() update(@Body() dto: UpdateSettingDto, @CurrentUser() user: AuthTokenPayload) {
    return this.settings.update(dto.key, dto.value, user.sub);
  }
}