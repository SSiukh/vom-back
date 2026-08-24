import { ApiProperty } from '@nestjs/swagger';

export class AddressOptionDto {
  @ApiProperty()
  ref: string;

  @ApiProperty()
  description: string;
}
