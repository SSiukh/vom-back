import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  typeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  photoUrl: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ nullable: true })
  promoPrice: number | null;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
