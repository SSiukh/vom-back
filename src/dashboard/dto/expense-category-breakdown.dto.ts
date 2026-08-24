import { ApiProperty } from '@nestjs/swagger';

export class ExpenseCategoryBreakdownDto {
  @ApiProperty({ description: 'Ref довідника expense_types' })
  expenseTypeId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ description: 'Сумарна вартість витрат цього типу за період' })
  amount: number;
}
