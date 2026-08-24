import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { Order } from './entities/order.entity';
import { Expense } from './entities/expense.entity';
import { ExpenseType } from './entities/expense-type.entity';
import { ShipmentStatus } from './entities/shipment-status.entity';

type PeriodOrder = Pick<
  Order,
  'createdAt' | 'totalAmount' | 'shipmentStatusId'
>;
type PeriodExpense = Pick<Expense, 'typeId' | 'amount'>;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<DashboardResponseDto> {
    const createdAtFilter =
      dateFrom || dateTo
        ? {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          }
        : undefined;
    const periodWhere = createdAtFilter ? { createdAt: createdAtFilter } : {};

    const [orders, expenses, expenseTypes, shipmentStatuses]: [
      PeriodOrder[],
      PeriodExpense[],
      ExpenseType[],
      ShipmentStatus[],
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: periodWhere,
        select: { createdAt: true, totalAmount: true, shipmentStatusId: true },
      }),
      this.prisma.expense.findMany({
        where: periodWhere,
        select: { typeId: true, amount: true },
      }),
      this.prisma.expenseType.findMany(),
      this.prisma.shipmentStatus.findMany(),
    ]);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const revenueByDay = this.groupRevenueByDay(orders);
    const expensesByCategory = expenseTypes.map((type) => ({
      expenseTypeId: type.id,
      label: type.label,
      amount: expenses
        .filter((expense) => expense.typeId === type.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));

    const shipmentStatusBreakdown = shipmentStatuses.map((status) => ({
      shipmentStatusId: status.id,
      label: status.label,
      count: orders.filter((order) => order.shipmentStatusId === status.id)
        .length,
    }));

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      orderCount: orders.length,
      revenueByDay,
      expensesByCategory,
      shipmentStatusBreakdown,
    };
  }

  private groupRevenueByDay(
    orders: PeriodOrder[],
  ): { date: string; revenue: number }[] {
    const revenueByDayMap = new Map<string, number>();
    for (const order of orders) {
      // Bucketed by UTC calendar day, not the shop's local (Europe/Kyiv) day —
      // a deliberate simplicity trade-off: an order placed 00:00-03:00 Kyiv
      // time lands on the previous UTC day in this chart.
      const day = order.createdAt.toISOString().slice(0, 10);
      revenueByDayMap.set(
        day,
        (revenueByDayMap.get(day) ?? 0) + order.totalAmount,
      );
    }

    return [...revenueByDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }
}
