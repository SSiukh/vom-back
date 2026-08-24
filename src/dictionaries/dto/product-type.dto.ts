import { ApiProperty } from '@nestjs/swagger';

export class ProductTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  isCustom: boolean;
}
