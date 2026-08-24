import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description:
      'true, якщо потрібне підтвердження 2FA-кодом через /auth/2fa/verify-login',
  })
  requiresTwoFa: boolean;

  @ApiPropertyOptional({
    description:
      'Короткоживучий токен для /auth/2fa/verify-login — присутній лише якщо requiresTwoFa=true',
  })
  pendingToken?: string;

  @ApiPropertyOptional({
    description: 'Присутній лише якщо requiresTwoFa=false',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Присутній лише якщо requiresTwoFa=false',
  })
  refreshToken?: string;
}
