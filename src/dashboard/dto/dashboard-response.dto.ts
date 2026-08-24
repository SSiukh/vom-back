import { ApiProperty } from '@nestjs/swagger';
import { RevenueByDayDto } from './revenue-by-day.dto';
import { ExpenseCategoryBreakdownDto } from './expense-category-breakdown.dto';
import { ShipmentStatusBreakdownDto } from './shipment-status-breakdown.dto';

export class DashboardResponseDto {
  @ApiProperty({ description: 'Сумарна вартість всіх замовлень за період' })
  totalRevenue: number;

  @ApiProperty({ description: 'Сумарна вартість всіх витрат за період' })
  totalExpenses: number;

  @ApiProperty({ description: 'totalRevenue - totalExpenses' })
  profit: number;

  @ApiProperty({ description: 'Кількість замовлень за період' })
  orderCount: number;

  @ApiProperty({ type: [RevenueByDayDto] })
  revenueByDay: RevenueByDayDto[];

  @ApiProperty({ type: [ExpenseCategoryBreakdownDto] })
  expensesByCategory: ExpenseCategoryBreakdownDto[];

  @ApiProperty({ type: [ShipmentStatusBreakdownDto] })
  shipmentStatusBreakdown: ShipmentStatusBreakdownDto[];
}
