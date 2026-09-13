import { ApiProperty } from '@nestjs/swagger';
import { RevenueByDayDto } from './revenue-by-day.dto';
import { ExpenseCategoryBreakdownDto } from './expense-category-breakdown.dto';
import { ShipmentStatusBreakdownDto } from './shipment-status-breakdown.dto';

export class DashboardResponseDto {
  @ApiProperty({ description: 'Сумарна вартість всіх замовлень за період' })
  totalRevenue: number;

  @ApiProperty({ description: 'Сумарна вартість всіх витрат за період' })
  totalExpenses: number;

  @ApiProperty({ description: 'realizedRevenue - totalExpenses' })
  profit: number;

  @ApiProperty({
    description:
      'Сума totalAmount замовлень зі статусом "Отримано" — реально отримані гроші',
  })
  realizedRevenue: number;

  @ApiProperty({
    description:
      'Сума замовлень без статусу, або зі статусом "Відправлено"/"Доставлено"/"Переадресовано" — угода ще жива',
  })
  pendingRevenue: number;

  @ApiProperty({
    description: 'Сума замовлень зі статусом "Відмовлено" — угода не відбулась',
  })
  lostRevenue: number;

  @ApiProperty({
    nullable: true,
    description:
      'Сума спільних витрат (brand: null) за період; null, якщо фільтр brand не застосовано',
  })
  sharedExpenses: number | null;

  @ApiProperty({ description: 'Кількість замовлень за період' })
  orderCount: number;

  @ApiProperty({ type: [RevenueByDayDto] })
  revenueByDay: RevenueByDayDto[];

  @ApiProperty({ type: [ExpenseCategoryBreakdownDto] })
  expensesByCategory: ExpenseCategoryBreakdownDto[];

  @ApiProperty({ type: [ShipmentStatusBreakdownDto] })
  shipmentStatusBreakdown: ShipmentStatusBreakdownDto[];
}
