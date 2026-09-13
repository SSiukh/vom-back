import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { Order } from './entities/order.entity';
import { Expense } from './entities/expense.entity';
import { ExpenseType } from './entities/expense-type.entity';
import { ShipmentStatus } from './entities/shipment-status.entity';

type PeriodOrder = Pick<
  Order,
  'createdAt' | 'totalAmount' | 'shipmentStatusId' | 'items'
>;
type PeriodExpense = Pick<Expense, 'typeId' | 'amount'>;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    dateFrom?: string,
    dateTo?: string,
    brand?: 'vom' | 'm',
  ): Promise<DashboardResponseDto> {
    const createdAtFilter =
      dateFrom || dateTo
        ? {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          }
        : undefined;
    const periodWhere = createdAtFilter ? { createdAt: createdAtFilter } : {};

    const typeIds = brand
      ? (
          await this.prisma.productType.findMany({
            where: { brand },
            select: { id: true },
          })
        ).map((type) => type.id)
      : undefined;

    const orderWhere = typeIds
      ? { ...periodWhere, items: { some: { productTypeId: { in: typeIds } } } }
      : periodWhere;
    const expenseWhere = brand ? { ...periodWhere, brand } : periodWhere;

    const [orders, expenses, expenseTypes, shipmentStatuses, sharedExpenses]: [
      PeriodOrder[],
      PeriodExpense[],
      ExpenseType[],
      ShipmentStatus[],
      number | null,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: orderWhere,
        select: {
          createdAt: true,
          totalAmount: true,
          shipmentStatusId: true,
          items: true,
        },
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { typeId: true, amount: true },
      }),
      this.prisma.expenseType.findMany(),
      this.prisma.shipmentStatus.findMany(),
      brand
        ? this.prisma.expense
            .aggregate({
              where: {
                ...periodWhere,
                OR: [{ brand: null }, { brand: { isSet: false } }],
              },
              _sum: { amount: true },
            })
            .then((result) => result._sum.amount ?? 0)
        : Promise.resolve(null),
    ]);

    const revenueOf = (order: PeriodOrder): number =>
      typeIds
        ? order.items
            .filter((item) => typeIds.includes(item.productTypeId))
            .reduce((sum, item) => sum + item.subtotal, 0)
        : order.totalAmount;

    const totalRevenue = orders.reduce(
      (sum, order) => sum + revenueOf(order),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const statusCodeById = new Map(
      shipmentStatuses.map((status) => [status.id, status.code]),
    );
    let realizedRevenue = 0;
    let pendingRevenue = 0;
    let lostRevenue = 0;
    for (const order of orders) {
      const code = order.shipmentStatusId
        ? statusCodeById.get(order.shipmentStatusId)
        : undefined;
      const revenue = revenueOf(order);
      if (code === 'received') {
        realizedRevenue += revenue;
      } else if (code === 'refused') {
        lostRevenue += revenue;
      } else {
        pendingRevenue += revenue;
      }
    }

    const revenueByDay = this.groupRevenueByDay(orders, revenueOf);
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
      profit: realizedRevenue - totalExpenses,
      realizedRevenue,
      pendingRevenue,
      lostRevenue,
      orderCount: orders.length,
      sharedExpenses,
      revenueByDay,
      expensesByCategory,
      shipmentStatusBreakdown,
    };
  }

  private groupRevenueByDay(
    orders: PeriodOrder[],
    revenueOf: (order: PeriodOrder) => number,
  ): { date: string; revenue: number }[] {
    const revenueByDayMap = new Map<string, number>();
    for (const order of orders) {
      // Bucketed by UTC calendar day, not the shop's local (Europe/Kyiv) day —
      // a deliberate simplicity trade-off: an order placed 00:00-03:00 Kyiv
      // time lands on the previous UTC day in this chart.
      const day = order.createdAt.toISOString().slice(0, 10);
      revenueByDayMap.set(
        day,
        (revenueByDayMap.get(day) ?? 0) + revenueOf(order),
      );
    }

    return [...revenueByDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }
}
