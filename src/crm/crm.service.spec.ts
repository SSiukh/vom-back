import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CrmService } from './crm.service';

describe('CrmService', () => {
  let service: CrmService;
  let prisma: {
    order: { findMany: jest.Mock; aggregate: jest.Mock };
  };

  const storedOrder = {
    id: 'order-id',
    createdAt: new Date('2026-01-01'),
    npWaybillNumber: '20450000000000',
    paymentTypeId: 'payment-type-id',
    recipient: {
      phone: '+380501234567',
      lastName: 'Іваненко',
      firstName: 'Іван',
      middleName: null,
    },
    totalAmount: 300,
    shipmentStatusId: 'shipment-status-id',
    items: [
      { productTypeId: 'sticker-type-id' },
      { productTypeId: 'keychain-type-id' },
      { productTypeId: 'sticker-type-id' },
    ],
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([storedOrder]),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalAmount: 300 },
          _count: { _all: 1 },
        }),
      },
    };

    const module = await Test.createTestingModule({
      providers: [CrmService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CrmService);
  });

  it('maps an order onto a flat CRM row, deduplicating product type refs', async () => {
    const result = await service.findTable(1, 10, {});

    expect(result.items[0]).toEqual({
      id: 'order-id',
      createdAt: storedOrder.createdAt,
      npWaybillNumber: '20450000000000',
      paymentTypeId: 'payment-type-id',
      recipientFullName: 'Іваненко Іван',
      recipientPhone: '+380501234567',
      totalAmount: 300,
      shipmentStatusId: 'shipment-status-id',
      productTypeIds: ['sticker-type-id', 'keychain-type-id'],
    });
  });

  it('returns total and totalAmountSum from a single aggregate query over the full filtered set', async () => {
    const result = await service.findTable(1, 10, {});

    expect(result.total).toBe(1);
    expect(result.totalAmountSum).toBe(300);
    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    );
  });

  it('defaults totalAmountSum to 0 when there are no matching orders', async () => {
    prisma.order.aggregate.mockResolvedValueOnce({
      _sum: { totalAmount: null },
      _count: { _all: 0 },
    });

    const result = await service.findTable(1, 10, {});

    expect(result.totalAmountSum).toBe(0);
  });

  it('applies the createdAt date-range filter', async () => {
    await service.findTable(1, 10, {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });

    const [[args]] = prisma.order.findMany.mock.calls as [
      [{ where: { createdAt: { gte: Date; lte: Date } } }],
    ];
    expect(args.where.createdAt.gte).toEqual(new Date('2026-01-01'));
    expect(args.where.createdAt.lte).toEqual(new Date('2026-01-31'));
  });

  it('filters by productTypeId using an array "some" match', async () => {
    await service.findTable(1, 10, { productTypeId: 'sticker-type-id' });

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { items: { some: { productTypeId: 'sticker-type-id' } } },
      }),
    );
  });

  it('filters by shipmentStatusId', async () => {
    await service.findTable(1, 10, { shipmentStatusId: 'status-id' });

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shipmentStatusId: 'status-id' } }),
    );
  });

  it('sorts by createdAt descending by default', async () => {
    await service.findTable(1, 10, {});

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('sorts by createdAt ascending when requested', async () => {
    await service.findTable(1, 10, { sortOrder: 'asc' });

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );
  });

  it('paginates using page/pageSize', async () => {
    await service.findTable(3, 20, {});

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });
});
