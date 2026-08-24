import { ApiProperty } from '@nestjs/swagger';

export class ConfirmTwoFaResponseDto {
  @ApiProperty({
    type: [String],
    description:
      'Коди відновлення у відкритому вигляді — показуються лише цей єдиний раз',
  })
  recoveryCodes: string[];
}
