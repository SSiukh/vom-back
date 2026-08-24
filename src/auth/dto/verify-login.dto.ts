import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyLoginDto {
  @ApiProperty({ description: 'pendingToken, отриманий від POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  pendingToken: string;

  @ApiProperty({
    description:
      '6-значний код із застосунку автентифікації або код відновлення',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
