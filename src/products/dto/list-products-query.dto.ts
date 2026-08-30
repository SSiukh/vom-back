import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_PAGE_SIZE = 100;
const MAX_NAME_QUERY_LENGTH = 100;

export class ListProductsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Фільтр за типом товару' })
  @IsOptional()
  @IsMongoId()
  typeId?: string;

  @ApiPropertyOptional({
    description: 'Пошук за назвою товару (без урахування регістру)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_QUERY_LENGTH)
  name?: string;
}
