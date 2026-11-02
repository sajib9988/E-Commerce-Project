import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ProductsController, ReviewsController],
  providers: [ProductsService, ReviewsService],
})
export class ProductsModule {}
