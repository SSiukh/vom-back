import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ListProductsResponseDto } from './dto/list-products-response.dto';
import { ProductsService } from './products.service';
import { ParseObjectIdPipe } from '../shared/pipes/parse-object-id.pipe';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const PHOTO_FILE_TYPE_PATTERN = /^image\/(jpeg|png|webp)$/;

function buildPhotoFilePipe(fileIsRequired: boolean) {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: PHOTO_FILE_TYPE_PATTERN })
    .addMaxSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES })
    .build({ fileIsRequired });
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query() query: ListProductsQueryDto,
  ): Promise<ListProductsResponseDto> {
    return this.productsService.findAll(
      query.page ?? DEFAULT_PAGE,
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      query.typeId,
      query.name,
      query.sortOrder,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  @Post()
  create(
    @UploadedFile(buildPhotoFilePipe(true)) photo: Express.Multer.File,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(dto, photo);
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile(buildPhotoFilePipe(false))
    photo: Express.Multer.File | undefined,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto, photo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
