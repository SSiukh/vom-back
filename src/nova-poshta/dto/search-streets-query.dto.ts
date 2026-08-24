import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchStreetsQueryDto {
  @ApiProperty({ description: 'Ref населеного пункту з довідника Нової Пошти' })
  @IsString()
  @IsNotEmpty()
  cityRef: string;

  @ApiPropertyOptional({ description: 'Пошуковий рядок для назви вулиці' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  query?: string;
}
