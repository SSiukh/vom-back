import { ApiProperty } from '@nestjs/swagger';

export class PaymentTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;
}
