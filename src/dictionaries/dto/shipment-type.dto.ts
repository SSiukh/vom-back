import { ApiProperty } from '@nestjs/swagger';

export class ShipmentTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  isDefault: boolean;
}
