import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { artworkImageUploadOptions } from '../products/upload';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { ApliiqService } from './apliiq.service';

@Controller('admin/apliiq')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ApliiqAdminController {
  constructor(private readonly apliiq: ApliiqService) {}

  @Post('orders/:orderId/cancel-request')
  requestCancellation(@Param('orderId') orderId: string) {
    return this.apliiq.requestCancellation(orderId);
  }

  @Post('orders/:orderId/reconcile')
  reconcileOrder(@Param('orderId') orderId: string) {
    return this.apliiq.reconcileOrder(orderId);
  }

  @Post('products/:productId/artworks')
  @UseInterceptors(FileInterceptor('image', artworkImageUploadOptions))
  createArtwork(
    @Param('productId') productId: string,
    @Body('name') name: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.apliiq.createProductArtwork(productId, name, file as Express.Multer.File);
  }

  @Post('products/:productId/artworks/use-product-image')
  registerProductImage(
    @Param('productId') productId: string,
    @Body('name') name?: string,
  ) {
    return this.apliiq.registerProductImageAsArtwork(productId, name);
  }

  @Post('artworks/:artworkId/placements')
  addPlacement(
    @Param('artworkId') artworkId: string,
    @Body() body: { locationId: string; service: string; printColors?: string; boxId?: number; note?: string; widthInches?: number; heightInches?: number },
  ) {
    return this.apliiq.addArtworkPlacement(artworkId, body);
  }

  @Post('products/:productId/designs')
  createDesign(
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.apliiq.createProductDesign(productId, body);
  }
}
