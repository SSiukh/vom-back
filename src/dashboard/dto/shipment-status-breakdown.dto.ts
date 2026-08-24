import { ApiProperty } from '@nestjs/swagger';

export class ShipmentStatusBreakdownDto {
  @ApiProperty({ description: 'Ref довідника shipment_statuses' })
  shipmentStatusId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ description: 'Кількість замовлень із цим статусом за період' })
  count: number;
}
