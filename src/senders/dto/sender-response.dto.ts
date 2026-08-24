import { ApiProperty } from '@nestjs/swagger';

export class SenderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'ПІБ відправника' })
  fullName: string;

  @ApiProperty({ description: 'Номер телефону відправника' })
  phone: string;

  @ApiProperty({ description: 'Ознака активного відправника' })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
