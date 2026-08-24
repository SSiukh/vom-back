import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_API_KEY_LENGTH = 200;

export class VerifySenderDto {
  @ApiProperty({ description: 'API-ключ з кабінету Нової Пошти' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_API_KEY_LENGTH)
  apiKey: string;
}
