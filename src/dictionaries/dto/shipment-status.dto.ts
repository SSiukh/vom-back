import { ApiProperty } from '@nestjs/swagger';

export class ShipmentStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;
}
