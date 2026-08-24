import { ApiProperty } from '@nestjs/swagger';

export class ExpenseTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  requiresName: boolean;
}
