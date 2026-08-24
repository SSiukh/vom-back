import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CityRefQueryDto {
  @ApiProperty({ description: 'Ref населеного пункту з довідника Нової Пошти' })
  @IsString()
  @IsNotEmpty()
  cityRef: string;
}
