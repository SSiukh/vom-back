import { ApiProperty } from '@nestjs/swagger';
import { SenderResponseDto } from './sender-response.dto';

export class ListSendersResponseDto {
  @ApiProperty({ type: [SenderResponseDto] })
  items: SenderResponseDto[];

  @ApiProperty()
  total: number;
}
