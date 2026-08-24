import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Ref довідника expense_types' })
  @IsMongoId()
  typeId: string;

  @ApiPropertyOptional({
    description:
      'Назва витрати — обов’язкова лише для типу "Інше" (requires_name)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ description: 'Сума витрати' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}
