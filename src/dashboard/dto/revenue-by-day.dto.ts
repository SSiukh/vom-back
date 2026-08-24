import { ApiProperty } from '@nestjs/swagger';

export class RevenueByDayDto {
  @ApiProperty({ description: 'Дата у форматі YYYY-MM-DD' })
  date: string;

  @ApiProperty()
  revenue: number;
}
