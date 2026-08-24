import { ApiProperty } from '@nestjs/swagger';

export class ExpenseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  typeId: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
