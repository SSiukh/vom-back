import { ApiProperty } from '@nestjs/swagger';

export class RecipientResponseDto {
  @ApiProperty()
  phone: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ nullable: true })
  middleName: string | null;
}
