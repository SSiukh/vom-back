import { ApiProperty } from '@nestjs/swagger';
import { CrmRowResponseDto } from './crm-row-response.dto';

export class ListCrmResponseDto {
  @ApiProperty({ type: [CrmRowResponseDto] })
  items: CrmRowResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty({
    description:
      'Сума totalAmount по всіх відфільтрованих замовленнях (не лише на сторінці)',
  })
  totalAmountSum: number;
}
