import { ApiProperty } from '@nestjs/swagger';

export class CrmRowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  npWaybillNumber: string | null;

  @ApiProperty()
  paymentTypeId: string;

  @ApiProperty({ description: 'ПІБ отримувача' })
  recipientFullName: string;

  @ApiProperty()
  recipientPhone: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ nullable: true })
  shipmentStatusId: string | null;

  @ApiProperty({
    type: [String],
    description: 'Унікальні ref-и product_types серед позицій замовлення',
  })
  productTypeIds: string[];
}
