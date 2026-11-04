import { Body, Controller, Param, Post } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { ApliiqService } from './apliiq.service';

@Controller('admin/apliiq')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ApliiqAdminController {
  constructor(private readonly apliiq: ApliiqService) {}

  @Post('artworks')
  uploadArtwork(@Body() body: { Name: string; ImagePath: string }) {
    return this.apliiq.uploadArtwork(body);
  }

  @Post('products/:productId/designs')
  createDesign(
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.apliiq.createProductDesign(productId, body);
  }
}
