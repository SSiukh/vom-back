import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ListProductsResponseDto } from './dto/list-products-response.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(query: ListProductsQueryDto): Promise<ListProductsResponseDto>;
    findOne(id: string): Promise<ProductResponseDto>;
    create(photo: Express.Multer.File, dto: CreateProductDto): Promise<ProductResponseDto>;
    update(id: string, photo: Express.Multer.File | undefined, dto: UpdateProductDto): Promise<ProductResponseDto>;
    remove(id: string): Promise<void>;
}
