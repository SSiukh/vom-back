import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ListProductsResponseDto } from './dto/list-products-response.dto';
export declare class ProductsService {
    private readonly prisma;
    private readonly cloudinary;
    private readonly logger;
    constructor(prisma: PrismaService, cloudinary: CloudinaryService);
    create(dto: CreateProductDto, photo: Express.Multer.File): Promise<ProductResponseDto>;
    findAll(page: number, pageSize: number, typeId?: string): Promise<ListProductsResponseDto>;
    findOne(id: string): Promise<ProductResponseDto>;
    update(id: string, dto: UpdateProductDto, photo: Express.Multer.File | undefined): Promise<ProductResponseDto>;
    remove(id: string): Promise<void>;
    private findOrThrow;
    private assertCatalogableType;
    private cleanupOrphanedUpload;
    private toResponseDto;
}
