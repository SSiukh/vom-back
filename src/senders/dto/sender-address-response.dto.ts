import { ApiProperty } from '@nestjs/swagger';

export class SenderAddressResponseDto {
  @ApiProperty({ description: 'Ref адреси в системі Нової Пошти' })
  npAddressRef: string;

  @ApiProperty({ description: 'Опис адреси для відображення в селекті' })
  description: string;
}
