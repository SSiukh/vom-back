import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
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

  @ApiPropertyOptional({
    enum: ['vom', 'm'],
    nullable: true,
    description:
      'Група, до якої належить витрата; відсутнє значення або null — спільна витрата',
  })
  @IsOptional()
  @IsIn(['vom', 'm'])
  brand?: 'vom' | 'm' | null;
}
