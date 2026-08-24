import { ApiProperty } from '@nestjs/swagger';

export class SetupTwoFaResponseDto {
  @ApiProperty({
    description: 'QR-код для Google Authenticator (data URL, image/png)',
  })
  qrCodeDataUrl: string;

  @ApiProperty({
    description: 'Секретний ключ для ручного додавання облікового запису',
  })
  secret: string;
}
