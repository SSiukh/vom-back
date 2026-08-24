import { ApiProperty } from '@nestjs/swagger';

export class SenderVerificationResultDto {
  @ApiProperty({ description: 'ПІБ відправника, підтягнуте з Нової Пошти' })
  fullName: string;

  @ApiProperty({
    description: 'Номер телефону відправника, підтягнутий з Нової Пошти',
  })
  phone: string;
}
