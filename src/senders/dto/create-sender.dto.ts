import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { VerifySenderDto } from './verify-sender.dto';

export class CreateSenderDto extends VerifySenderDto {
  @ApiPropertyOptional({
    description:
      'Ref населеного пункту відправки з довідника Нової Пошти. ' +
      'Опціонально при створенні — можна додати пізніше через ' +
      'PATCH /senders/:id/warehouse, але тоді warehouseRef теж має ' +
      'бути відсутнім',
  })
  @ValidateIf((dto: CreateSenderDto) => dto.warehouseRef !== undefined)
  @IsString()
  @IsNotEmpty()
  cityRef?: string;

  @ApiPropertyOptional({
    description:
      'Ref відділення відправки з довідника Нової Пошти. Опціонально ' +
      'при створенні — можна додати пізніше через ' +
      'PATCH /senders/:id/warehouse, але тоді cityRef теж має бути ' +
      'відсутнім',
  })
  @ValidateIf((dto: CreateSenderDto) => dto.cityRef !== undefined)
  @IsString()
  @IsNotEmpty()
  warehouseRef?: string;
}
