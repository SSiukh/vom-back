"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const CLOUDINARY_FOLDER = 'products';
let ProductsService = ProductsService_1 = class ProductsService {
    prisma;
    cloudinary;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(prisma, cloudinary) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
    }
    async create(dto, photo) {
        await this.assertCatalogableType(dto.typeId);
        const uploaded = await this.cloudinary.uploadImage(photo.buffer, CLOUDINARY_FOLDER);
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
        }
        catch (error) {
            await this.cleanupOrphanedUpload(uploaded.publicId);
            throw error;
        }
    }
    async findAll(page, pageSize, typeId) {
        const where = typeId ? { typeId } : {};
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
    async findOne(id) {
        const product = await this.findOrThrow(id);
        return this.toResponseDto(product);
    }
    async update(id, dto, photo) {
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
        }
        catch (error) {
            if (uploaded) {
                await this.cleanupOrphanedUpload(uploaded.publicId);
            }
            throw error;
        }
    }
    async remove(id) {
        await this.findOrThrow(id);
        await this.prisma.product.delete({ where: { id } });
    }
    async findOrThrow(id) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async assertCatalogableType(typeId) {
        const type = await this.prisma.productType.findUnique({
            where: { id: typeId },
        });
        if (!type) {
            throw new common_1.BadRequestException('Unknown product type');
        }
        if (type.isCustom) {
            throw new common_1.BadRequestException('Cannot create or edit a catalog product with the custom product type');
        }
    }
    async cleanupOrphanedUpload(publicId) {
        try {
            await this.cloudinary.deleteImage(publicId);
        }
        catch (cleanupError) {
            this.logger.error(`Failed to clean up orphaned Cloudinary upload ${publicId}`, cleanupError instanceof Error ? cleanupError.stack : undefined);
        }
    }
    toResponseDto(product) {
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService])
], ProductsService);
//# sourceMappingURL=products.service.js.map