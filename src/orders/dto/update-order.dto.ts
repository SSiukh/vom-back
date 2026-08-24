import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderItemDto } from './order-item.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Ref довідника order_types' })
  @IsOptional()
  @IsMongoId()
  orderTypeId?: string;

  @ApiPropertyOptional({ description: 'Ref довідника shipment_types' })
  @IsOptional()
  @IsMongoId()
  shipmentTypeId?: string;

  @ApiPropertyOptional({ description: 'Ref довідника payment_types' })
  @IsOptional()
  @IsMongoId()
  paymentTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Сума післяплати — обов’язкова, якщо тип оплати "часткова оплата"',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partialAmount?: number;

  @ApiPropertyOptional({
    type: [OrderItemDto],
    description: 'Повний новий перелік товарних позицій — замінює попередній',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items?: OrderItemDto[];
}
