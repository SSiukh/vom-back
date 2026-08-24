import { ApiProperty } from '@nestjs/swagger';

export class DeliveryDetailsResponseDto {
  @ApiProperty()
  cityRef: string;

  @ApiProperty({ nullable: true })
  warehouseRef: string | null;

  @ApiProperty({ nullable: true })
  streetRef: string | null;

  @ApiProperty({ nullable: true })
  house: string | null;

  @ApiProperty({ nullable: true })
  apartment: string | null;

  @ApiProperty({ nullable: true })
  postomatRef: string | null;
}
