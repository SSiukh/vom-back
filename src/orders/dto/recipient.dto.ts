import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class RecipientDto {
  @ApiProperty({ description: 'Номер телефону отримувача' })
  @IsPhoneNumber('UA')
  phone: string;

  @ApiProperty({ description: 'Прізвище' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: "Ім'я" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'По батькові' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  middleName?: string;
}
