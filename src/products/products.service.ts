import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { escapeRegExp } from '../shared/utils/escape-regexp';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ListProductsResponseDto } from './dto/list-products-response.dto';
import { Product } from './entities/product.entity';

const CLOUDINARY_FOLDER = 'products';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    dto: CreateProductDto,
    photo: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    await this.assertCatalogableType(dto.typeId);
    const uploaded = await this.cloudinary.uploadImage(
      photo.buffer,
      CLOUDINARY_FOLDER,
    );

    try {
      const product = await this.prisma.product.create({
        data: {
          typeId: dto.typeId,
          name: dto.name,
          photoUrl: uploaded.secureUrl,
          price: dto.price,
          promoPrice: dto.promoPrice ?? null,
          stockQuantity: dto.stockQuantity,
        },
      });

      return this.toResponseDto(product);
    } catch (error) {
      await this.cleanupOrphanedUpload(uploaded.publicId);
      throw error;
    }
  }

  async findAll(
    page: number,
    pageSize: number,
    typeId?: string,
    name?: string,
  ): Promise<ListProductsResponseDto> {
    const where = {
      ...(typeId && { typeId }),
      ...(name && {
        name: { contains: escapeRegExp(name), mode: 'insensitive' as const },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((product) => this.toResponseDto(product)),
      total,
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.findOrThrow(id);

    return this.toResponseDto(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    photo: Express.Multer.File | undefined,
  ): Promise<ProductResponseDto> {
    await this.findOrThrow(id);

    if (dto.typeId !== undefined) {
      await this.assertCatalogableType(dto.typeId);
    }

    const uploaded = photo
      ? await this.cloudinary.uploadImage(photo.buffer, CLOUDINARY_FOLDER)
      : undefined;

    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.typeId !== undefined && { typeId: dto.typeId }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(uploaded !== undefined && { photoUrl: uploaded.secureUrl }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.promoPrice !== undefined && { promoPrice: dto.promoPrice }),
          ...(dto.stockQuantity !== undefined && {
            stockQuantity: dto.stockQuantity,
          }),
        },
      });

      return this.toResponseDto(updated);
    } catch (error) {
      if (uploaded) {
        await this.cleanupOrphanedUpload(uploaded.publicId);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);

    await this.prisma.product.delete({ where: { id } });
  }

  private async findOrThrow(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async assertCatalogableType(typeId: string): Promise<void> {
    const type = await this.prisma.productType.findUnique({
      where: { id: typeId },
    });

    if (!type) {
      throw new BadRequestException('Unknown product type');
    }

    if (type.isCustom) {
      throw new BadRequestException(
        'Cannot create or edit a catalog product with the custom product type',
      );
    }
  }

  private async cleanupOrphanedUpload(publicId: string): Promise<void> {
    try {
      await this.cloudinary.deleteImage(publicId);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to clean up orphaned Cloudinary upload ${publicId}`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
    }
  }

  private toResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id,
      typeId: product.typeId,
      name: product.name,
      photoUrl: product.photoUrl,
      price: product.price,
      promoPrice: product.promoPrice,
      stockQuantity: product.stockQuantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
