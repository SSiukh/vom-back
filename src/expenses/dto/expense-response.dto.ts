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

  @ApiProperty({ nullable: true })
  brand: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
