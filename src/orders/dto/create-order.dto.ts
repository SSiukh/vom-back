import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderItemDto } from './order-item.dto';
import { RecipientDto } from './recipient.dto';
import { DeliveryDetailsDto } from './delivery-details.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'Ref довідника order_types' })
  @IsMongoId()
  orderTypeId: string;

  @ApiProperty({ description: 'Ref довідника shipment_types' })
  @IsMongoId()
  shipmentTypeId: string;

  @ApiProperty({ description: 'Ref довідника payment_types' })
  @IsMongoId()
  paymentTypeId: string;

  @ApiPropertyOptional({
    description:
      'Сума післяплати — обов’язкова, якщо тип оплати "часткова оплата"',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partialAmount?: number;

  @ApiProperty({ type: [OrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Відправник, від імені якого створюється замовлення',
  })
  @IsMongoId()
  senderId: string;

  @ApiProperty({
    description: 'Ref обраної адреси відправки цього відправника',
  })
  @IsString()
  @IsNotEmpty()
  senderAddressRef: string;

  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty({ description: 'Ref довідника delivery_types' })
  @IsMongoId()
  deliveryTypeId: string;

  @ApiProperty({ type: DeliveryDetailsDto })
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  deliveryDetails: DeliveryDetailsDto;
}
