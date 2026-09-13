import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    order: { findMany: jest.Mock };
    expense: { findMany: jest.Mock; aggregate: jest.Mock };
    expenseType: { findMany: jest.Mock };
    shipmentStatus: { findMany: jest.Mock };
    productType: { findMany: jest.Mock };
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
      expense: {
        findMany: jest.fn().mockResolvedValue(expenses),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      expenseType: { findMany: jest.fn().mockResolvedValue(expenseTypes) },
      shipmentStatus: {
        findMany: jest.fn().mockResolvedValue(shipmentStatuses),
      },
      productType: { findMany: jest.fn().mockResolvedValue([]) },
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
    expect(result.profit).toBe(-60);
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

  it('returns sharedExpenses as null and never queries it when no brand filter is given', async () => {
    const result = await service.getSummary();

    expect(result.sharedExpenses).toBeNull();
    expect(prisma.expense.aggregate).not.toHaveBeenCalled();
  });

  describe('brand ("group") filter', () => {
    const productTypesVom = [{ id: 'type-vom-1' }, { id: 'type-vom-2' }];

    const ordersWithItems = [
      {
        createdAt: new Date('2026-01-01T10:00:00Z'),
        totalAmount: 100,
        shipmentStatusId: 'delivered-id',
        items: [
          { productTypeId: 'type-vom-1', subtotal: 60 },
          { productTypeId: 'type-m-1', subtotal: 40 },
        ],
      },
      {
        createdAt: new Date('2026-01-02T09:00:00Z'),
        totalAmount: 200,
        shipmentStatusId: null,
        items: [{ productTypeId: 'type-m-1', subtotal: 200 }],
      },
    ];

    beforeEach(() => {
      prisma.order.findMany.mockResolvedValue(ordersWithItems);
      prisma.productType.findMany.mockResolvedValue(productTypesVom);
    });

    it('resolves the brand’s product types and filters orders to those with at least one matching item', async () => {
      await service.getSummary(undefined, undefined, 'vom');

      expect(prisma.productType.findMany).toHaveBeenCalledWith({
        where: { brand: 'vom' },
        select: { id: true },
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            items: {
              some: { productTypeId: { in: ['type-vom-1', 'type-vom-2'] } },
            },
          },
        }),
      );
    });

    it('sums only the matching-brand items subtotal for totalRevenue and revenueByDay', async () => {
      const result = await service.getSummary(undefined, undefined, 'vom');

      expect(result.totalRevenue).toBe(60);
      expect(result.revenueByDay).toEqual([
        { date: '2026-01-01', revenue: 60 },
        { date: '2026-01-02', revenue: 0 },
      ]);
    });

    it('filters expenses to only the chosen brand, excluding shared ones', async () => {
      await service.getSummary(undefined, undefined, 'vom');

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { brand: 'vom' } }),
      );
    });

    it('computes sharedExpenses as the brand:null sum for the period', async () => {
      prisma.expense.aggregate.mockResolvedValueOnce({ _sum: { amount: 75 } });

      const result = await service.getSummary(
        '2026-01-01',
        '2026-01-31',
        'vom',
      );

      expect(prisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
          OR: [{ brand: null }, { brand: { isSet: false } }],
        },
        _sum: { amount: true },
      });
      expect(result.sharedExpenses).toBe(75);
    });

    it('defaults sharedExpenses to 0 when there are no shared expenses in the period', async () => {
      prisma.expense.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });

      const result = await service.getSummary(undefined, undefined, 'vom');

      expect(result.sharedExpenses).toBe(0);
    });

    it('scopes realizedRevenue/pendingRevenue/lostRevenue by matching-brand items too', async () => {
      const result = await service.getSummary(undefined, undefined, 'vom');

      expect(result.pendingRevenue).toBe(60);
      expect(result.realizedRevenue).toBe(0);
      expect(result.lostRevenue).toBe(0);
      expect(result.totalRevenue).toBe(
        result.realizedRevenue + result.pendingRevenue + result.lostRevenue,
      );
    });
  });

  describe('revenue split by delivery status (realized/pending/lost)', () => {
    const statusSplitOrders = [
      {
        createdAt: new Date('2026-01-01T10:00:00Z'),
        totalAmount: 100,
        shipmentStatusId: 'received-id',
      },
      {
        createdAt: new Date('2026-01-01T11:00:00Z'),
        totalAmount: 40,
        shipmentStatusId: 'refused-id',
      },
      {
        createdAt: new Date('2026-01-01T12:00:00Z'),
        totalAmount: 60,
        shipmentStatusId: 'shipped-id',
      },
      {
        createdAt: new Date('2026-01-01T13:00:00Z'),
        totalAmount: 20,
        shipmentStatusId: 'delivered-id',
      },
      {
        createdAt: new Date('2026-01-01T14:00:00Z'),
        totalAmount: 30,
        shipmentStatusId: null,
      },
      {
        createdAt: new Date('2026-01-01T15:00:00Z'),
        totalAmount: 15,
        shipmentStatusId: 'unknown-future-status-id',
      },
    ];

    beforeEach(() => {
      prisma.order.findMany.mockResolvedValue(statusSplitOrders);
    });

    it('buckets a "received" order into realizedRevenue', async () => {
      const result = await service.getSummary();

      expect(result.realizedRevenue).toBe(100);
    });

    it('buckets a "refused" order into lostRevenue', async () => {
      const result = await service.getSummary();

      expect(result.lostRevenue).toBe(40);
    });

    it('buckets shipped/delivered/no-status/unknown-status orders into pendingRevenue', async () => {
      const result = await service.getSummary();

      expect(result.pendingRevenue).toBe(60 + 20 + 30 + 15);
    });

    it('computes profit as realizedRevenue - totalExpenses, not totalRevenue - totalExpenses', async () => {
      const result = await service.getSummary();

      expect(result.profit).toBe(result.realizedRevenue - result.totalExpenses);
      expect(result.profit).toBe(100 - 60);
    });

    it('holds the invariant totalRevenue === realizedRevenue + pendingRevenue + lostRevenue', async () => {
      const result = await service.getSummary();

      expect(result.totalRevenue).toBe(
        result.realizedRevenue + result.pendingRevenue + result.lostRevenue,
      );
      expect(result.totalRevenue).toBe(265);
    });
  });
});
