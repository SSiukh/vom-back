import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Ref довідника product_types (не кастомний тип)',
  })
  @IsMongoId()
  typeId: string;

  @ApiProperty({ description: 'Назва товару' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Базова ціна' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Акційна ціна (фіксована сума), опційно',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number;

  @ApiProperty({ description: 'Кількість на складі' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity: number;
}
