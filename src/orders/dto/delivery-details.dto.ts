import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeliveryDetailsDto {
  @ApiProperty({ description: 'Ref населеного пункту з довідника Нової Пошти' })
  @IsString()
  @IsNotEmpty()
  cityRef: string;

  @ApiPropertyOptional({
    description:
      'Ref відділення — обов’язковий, якщо спосіб доставки "Відділення"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  warehouseRef?: string;

  @ApiPropertyOptional({
    description: 'Ref вулиці — обов’язковий, якщо спосіб доставки "Адреса"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  streetRef?: string;

  @ApiPropertyOptional({
    description: 'Номер будинку — обов’язковий, якщо спосіб доставки "Адреса"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  house?: string;

  @ApiPropertyOptional({ description: 'Номер квартири, не обов’язково' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apartment?: string;

  @ApiPropertyOptional({
    description:
      'Ref поштомату — обов’язковий, якщо спосіб доставки "Поштомат"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postomatRef?: string;
}
