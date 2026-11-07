import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(query: string) {
    const search = query.trim();
    if (!search) return [];

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          {
            category: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            subcategory: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            artworks: {
              some: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        variants: {
          where: { isActive: true },
          include: { size: { select: { label: true } } },
        },
        artworks: {
          include: {
            placements: {
              select: { service: true, note: true },
            },
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      regularPrice: product.regularPrice.toString(),
      salePrice: product.salePrice?.toString() ?? null,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl,
      category: product.category.name,
      subcategory: product.subcategory.name,
      variants: product.variants.map((variant) => ({
        size: variant.size.label,
        color: variant.colorName,
        regularPrice: variant.regularPrice.toString(),
        salePrice: variant.salePrice?.toString() ?? null,
        stockQuantity: variant.stockQuantity,
      })),
      artworks: product.artworks.map((artwork) => ({
        name: artwork.name,
        style: artwork.style,
        placements: artwork.placements,
      })),
    }));
  }
}
