import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SetOrderStatusFlagsDto {
  @ApiPropertyOptional({ description: 'Позначка "Спаковано"' })
  @IsOptional()
  @IsBoolean()
  isPacked?: boolean;

  @ApiPropertyOptional({ description: 'Позначка "Відсутній товар"' })
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;
}
