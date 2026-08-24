import { ApiProperty } from '@nestjs/swagger';

export class DeliveryTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;
}
