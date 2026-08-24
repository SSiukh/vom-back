import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ nullable: true })
  productId: string | null;

  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  nameSnapshot: string;

  @ApiProperty({ nullable: true })
  photoUrlSnapshot: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  isPromo: boolean;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  subtotal: number;
}
