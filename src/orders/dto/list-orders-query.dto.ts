import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_PAGE_SIZE = 100;

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Дата створення від (ISO)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Дата створення до (ISO)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Фільтр за типом товару — замовлення, що містять хоча б одну позицію цього типу',
  })
  @IsOptional()
  @IsMongoId()
  productTypeId?: string;

  @ApiPropertyOptional({
    description: 'Фільтр за відправником (id з GET /senders)',
  })
  @IsOptional()
  @IsMongoId()
  senderId?: string;

  @ApiPropertyOptional({
    description:
      'Фільтр за статусом відправлення — id з GET /dictionaries/shipment-statuses, або "none" для замовлень без статусу',
  })
  @IsOptional()
  @Matches(/^(none|[0-9a-fA-F]{24})$/, {
    message: 'shipmentStatusId має бути валідним id або значенням "none"',
  })
  shipmentStatusId?: string;

  @ApiPropertyOptional({
    description:
      'Пошук за номером накладної або ПІБ отримувача (без урахування регістру; кілька слів — усі мають знайтись)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  search?: string;
}
