import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    order: { findMany: jest.Mock };
    expense: { findMany: jest.Mock };
    expenseType: { findMany: jest.Mock };
    shipmentStatus: { findMany: jest.Mock };
  };

  const orders = [
    {
      createdAt: new Date('2026-01-01T10:00:00Z'),
      totalAmount: 100,
      shipmentStatusId: 'delivered-id',
    },
    {
      createdAt: new Date('2026-01-01T14:00:00Z'),
      totalAmount: 50,
      shipmentStatusId: 'shipped-id',
    },
    {
      createdAt: new Date('2026-01-02T09:00:00Z'),
      totalAmount: 200,
      shipmentStatusId: null,
    },
  ];

  const expenses = [
    { typeId: 'delivery-expense-type-id', amount: 30 },
    { typeId: 'other-expense-type-id', amount: 20 },
    { typeId: 'delivery-expense-type-id', amount: 10 },
  ];

  const expenseTypes = [
    { id: 'delivery-expense-type-id', code: 'delivery', label: 'Доставка' },
    { id: 'other-expense-type-id', code: 'other', label: 'Інше' },
    {
      id: 'unused-expense-type-id',
      code: 'raw_material',
      label: 'Сировина плакат',
    },
  ];

  const shipmentStatuses = [
    { id: 'delivered-id', code: 'delivered', label: 'Доставлено' },
    { id: 'shipped-id', code: 'shipped', label: 'Відправлено' },
    { id: 'refused-id', code: 'refused', label: 'Відмовлено' },
    { id: 'received-id', code: 'received', label: 'Отримано' },
  ];

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn().mockResolvedValue(orders) },
      expense: { findMany: jest.fn().mockResolvedValue(expenses) },
      expenseType: { findMany: jest.fn().mockResolvedValue(expenseTypes) },
      shipmentStatus: {
        findMany: jest.fn().mockResolvedValue(shipmentStatuses),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('computes totalRevenue, totalExpenses, profit and orderCount', async () => {
    const result = await service.getSummary();

    expect(result.totalRevenue).toBe(350);
    expect(result.totalExpenses).toBe(60);
    expect(result.profit).toBe(290);
    expect(result.orderCount).toBe(3);
  });

  it('groups revenue by day, sorted ascending', async () => {
    const result = await service.getSummary();

    expect(result.revenueByDay).toEqual([
      { date: '2026-01-01', revenue: 150 },
      { date: '2026-01-02', revenue: 200 },
    ]);
  });

  it('groups expenses by category, including zero for a type with no expenses', async () => {
    const result = await service.getSummary();

    expect(result.expensesByCategory).toEqual(
      expect.arrayContaining([
        {
          expenseTypeId: 'delivery-expense-type-id',
          label: 'Доставка',
          amount: 40,
        },
        { expenseTypeId: 'other-expense-type-id', label: 'Інше', amount: 20 },
        {
          expenseTypeId: 'unused-expense-type-id',
          label: 'Сировина плакат',
          amount: 0,
        },
      ]),
    );
  });

  it('breaks down orders by shipment status, excluding unsynced (null) orders from any bucket', async () => {
    const result = await service.getSummary();

    expect(result.shipmentStatusBreakdown).toEqual(
      expect.arrayContaining([
        { shipmentStatusId: 'delivered-id', label: 'Доставлено', count: 1 },
        { shipmentStatusId: 'shipped-id', label: 'Відправлено', count: 1 },
        { shipmentStatusId: 'refused-id', label: 'Відмовлено', count: 0 },
        { shipmentStatusId: 'received-id', label: 'Отримано', count: 0 },
      ]),
    );
    const totalBucketed = result.shipmentStatusBreakdown.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    );
    expect(totalBucketed).toBe(2);
    expect(result.orderCount).toBe(3);
  });

  it('applies the dateFrom/dateTo period filter to both orders and expenses', async () => {
    await service.getSummary('2026-01-01', '2026-01-31');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        },
      }),
    );
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        },
      }),
    );
  });

  it('queries everything when no period filter is given', async () => {
    await service.getSummary();

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
