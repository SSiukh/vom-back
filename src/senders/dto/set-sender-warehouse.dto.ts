import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetSenderWarehouseDto {
  @ApiProperty({
    description: 'Ref населеного пункту відправки з довідника Нової Пошти',
  })
  @IsString()
  @IsNotEmpty()
  cityRef: string;

  @ApiProperty({
    description: 'Ref відділення відправки з довідника Нової Пошти',
  })
  @IsString()
  @IsNotEmpty()
  warehouseRef: string;
}
