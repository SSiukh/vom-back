import { ApiProperty } from '@nestjs/swagger';

export class TwoFaStatusResponseDto {
  @ApiProperty()
  twoFaEnabled: boolean;
}
