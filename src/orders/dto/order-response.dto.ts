import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';
import { RecipientResponseDto } from './recipient-response.dto';
import { DeliveryDetailsResponseDto } from './delivery-details-response.dto';

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shipmentTypeId: string;

  @ApiProperty()
  paymentTypeId: string;

  @ApiProperty({ nullable: true })
  partialAmount: number | null;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  senderAddressRef: string;

  @ApiProperty({ type: RecipientResponseDto })
  recipient: RecipientResponseDto;

  @ApiProperty()
  deliveryTypeId: string;

  @ApiProperty({ type: DeliveryDetailsResponseDto })
  deliveryDetails: DeliveryDetailsResponseDto;

  @ApiProperty({ nullable: true })
  npWaybillNumber: string | null;

  @ApiProperty({ nullable: true })
  npWaybillRef: string | null;

  @ApiProperty({ nullable: true })
  shipmentStatusId: string | null;

  @ApiProperty({ description: 'Позначка "Спаковано"' })
  isPacked: boolean;

  @ApiProperty({ description: 'Позначка "Відсутній товар"' })
  isOutOfStock: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
