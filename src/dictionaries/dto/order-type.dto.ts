import { ApiProperty } from '@nestjs/swagger';

export class OrderTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;
}
