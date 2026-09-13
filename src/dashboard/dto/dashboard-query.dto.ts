import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Початок періоду (ISO)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Кінець періоду (ISO)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: ['vom', 'm'],
    description: 'Фільтр за групою товарів/витрат',
  })
  @IsOptional()
  @IsIn(['vom', 'm'])
  brand?: 'vom' | 'm';
}
