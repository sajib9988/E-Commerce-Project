import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SEARCHABLE_FIELDS = (term: string): Prisma.ProductWhereInput => ({
  OR: [
    { name: { contains: term, mode: 'insensitive' } },
    { description: { contains: term, mode: 'insensitive' } },
    { brand: { contains: term, mode: 'insensitive' } },
    { category: { name: { contains: term, mode: 'insensitive' } } },
    { subcategory: { name: { contains: term, mode: 'insensitive' } } },
    { artworks: { some: { name: { contains: term, mode: 'insensitive' } } } },
    { variants: { some: { colorName: { contains: term, mode: 'insensitive' }, isActive: true } } },
  ],
});

@Injectable()
export class ProductSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(keywords: string[]) {
    const terms = [...new Set(
      keywords
        .map((keyword) => keyword.trim().toLowerCase().slice(0, 50))
        .filter((keyword) => keyword.length >= 2),
    )].slice(0, 6);

    if (!terms.length) return [];

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        AND: terms.map((term) => SEARCHABLE_FIELDS(term)),
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
      description: (product.description ?? '').slice(0, 400),
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
