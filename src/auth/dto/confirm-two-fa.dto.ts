import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmTwoFaDto {
  @ApiProperty({ description: '6-значний код із застосунку автентифікації' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
