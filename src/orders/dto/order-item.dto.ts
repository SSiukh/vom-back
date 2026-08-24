import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ description: 'Ref довідника product_types для цієї позиції' })
  @IsMongoId()
  productTypeId: string;

  @ApiPropertyOptional({
    description:
      'Товар з каталогу — обов’язковий, якщо тип товару не кастомний',
  })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiPropertyOptional({
    description:
      'Назва позиції — обов’язкова лише для кастомної наклейки (немає рядка в products)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Ціна — обов’язкова лише для кастомної наклейки',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Кількість' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Продаж за акційною ціною товару (лише якщо вона є)',
  })
  @IsOptional()
  @IsBoolean()
  isPromo?: boolean;
}
