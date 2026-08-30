import { ApiProperty } from '@nestjs/swagger';

export class BulkSyncStatusResponseDto {
  @ApiProperty({
    description: 'Кількість замовлень із накладною, залучених у синхронізацію',
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Кількість замовлень, чий статус фактично змінився',
  })
  updatedCount: number;

  @ApiProperty({
    description:
      'Кількість замовлень, статус яких не вдалося визначити (невідомий код Нової Пошти, відсутній відправник тощо)',
  })
  unmappedCount: number;
}
