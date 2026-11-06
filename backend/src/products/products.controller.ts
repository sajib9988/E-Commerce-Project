import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { productImageUploadOptions } from './upload';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get()
  findAll(
    @Query('collection') collectionSlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.productsService.findAll({
      collectionSlug, page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit), search, categoryId, sortBy, sortOrder,
      minPrice: minPrice === undefined ? undefined : Number(minPrice),
      maxPrice: maxPrice === undefined ? undefined : Number(maxPrice),
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/list')
  findAllForAdmin(
    @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('search') search?: string, @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string, @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.productsService.findAllForAdmin({
      page: Number(page) || 1, limit: Number(limit) || 20, search, categoryId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      sortBy, sortOrder,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.productsService.findOneForAdmin(id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', productImageUploadOptions),
  )
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.create(dto, file);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', productImageUploadOptions),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, dto, file);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
