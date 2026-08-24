import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchCitiesQueryDto {
  @ApiProperty({ description: 'Пошуковий рядок для назви населеного пункту' })
  @IsString()
  @IsNotEmpty()
  query: string;
}
