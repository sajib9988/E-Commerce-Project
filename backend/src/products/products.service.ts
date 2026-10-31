import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll() {
    return this.prisma.product.findMany({
      include: { category: true, subcategory: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async validateCategory(
    categoryId: string,
    subcategoryId: string,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });
    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    if (subcategory.categoryId !== categoryId) {
      throw new BadRequestException(
        'Subcategory does not belong to this category',
      );
    }
  }

  async create(dto: CreateProductDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Product image is required');
    }

    await this.validateCategory(dto.categoryId, dto.subcategoryId);

    const image = await this.cloudinaryService.uploadImage(file);

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          brand: dto.brand,
          sizes: dto.sizes ?? [],
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          imageUrl: image.secure_url,
          imagePublicId: image.public_id,
        },
        include: { category: true, subcategory: true },
      });
    } catch (error) {
      try {
        await this.cloudinaryService.deleteImage(image.public_id);
      } catch {
        // Production: log cleanup failure and retry later.
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.findOne(id);
    const categoryId = dto.categoryId ?? existing.categoryId;
    const subcategoryId =
      dto.subcategoryId ?? existing.subcategoryId;

    if (dto.categoryId !== undefined ||
        dto.subcategoryId !== undefined) {
      await this.validateCategory(categoryId, subcategoryId);
    }

    const newImage = file
      ? await this.cloudinaryService.uploadImage(file)
      : null;

    let updatedProduct;
    try {
      updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.brand !== undefined && { brand: dto.brand }),
          ...(dto.sizes !== undefined && { sizes: dto.sizes }),
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId,
          }),
          ...(dto.subcategoryId !== undefined && {
            subcategoryId: dto.subcategoryId,
          }),
          ...(newImage && {
            imageUrl: newImage.secure_url,
            imagePublicId: newImage.public_id,
          }),
        },
        include: { category: true, subcategory: true },
      });
    } catch (error) {
      if (newImage) {
        try {
          await this.cloudinaryService.deleteImage(newImage.public_id);
        } catch {
          // Production: log cleanup failure and retry later.
        }
      }
      throw error;
    }

    if (newImage && existing.imagePublicId) {
      try {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      } catch {
        // Production: log cleanup failure and retry later.
      }
    }

    return updatedProduct;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });

    if (existing.imagePublicId) {
      try {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      } catch {
        // Production: log cleanup failure and retry later.
      }
    }

    return {
      message: 'Product deleted successfully',
      id: deletedProduct.id,
    };
  }
}
