import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DictionariesService } from './dictionaries.service';

describe('DictionariesService', () => {
  let service: DictionariesService;
  let prisma: {
    orderType: { findMany: jest.Mock };
    shipmentType: { findMany: jest.Mock };
    productType: { findMany: jest.Mock };
    paymentType: { findMany: jest.Mock };
    expenseType: { findMany: jest.Mock };
    deliveryType: { findMany: jest.Mock };
    shipmentStatus: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      orderType: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: '1', code: 'custom', label: 'Кастомний', extra: 'x' },
          ]),
      },
      shipmentType: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '2',
            code: 'documents',
            label: 'Документи',
            isDefault: true,
            extra: 'x',
          },
        ]),
      },
      productType: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '3',
            code: 'sticker',
            label: 'Наклейка',
            isCustom: false,
            extra: 'x',
          },
        ]),
      },
      paymentType: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: '4', code: 'full', label: 'повна оплата', extra: 'x' },
          ]),
      },
      expenseType: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '5',
            code: 'other',
            label: 'Інше',
            requiresName: true,
            extra: 'x',
          },
        ]),
      },
      deliveryType: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: '6', code: 'warehouse', label: 'Відділення', extra: 'x' },
          ]),
      },
      shipmentStatus: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '7',
            code: 'delivered',
            label: 'Доставлено',
            npStatusCodes: ['7', '8'],
            extra: 'x',
          },
        ]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        DictionariesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DictionariesService);
  });

  it('maps order types to only the DTO-declared fields', async () => {
    const result = await service.findOrderTypes();

    expect(result).toEqual([{ id: '1', code: 'custom', label: 'Кастомний' }]);
  });

  it('maps shipment types including isDefault', async () => {
    const result = await service.findShipmentTypes();

    expect(result).toEqual([
      { id: '2', code: 'documents', label: 'Документи', isDefault: true },
    ]);
  });

  it('maps product types including isCustom', async () => {
    const result = await service.findProductTypes();

    expect(result).toEqual([
      { id: '3', code: 'sticker', label: 'Наклейка', isCustom: false },
    ]);
  });

  it('maps payment types', async () => {
    const result = await service.findPaymentTypes();

    expect(result).toEqual([{ id: '4', code: 'full', label: 'повна оплата' }]);
  });

  it('maps expense types including requiresName', async () => {
    const result = await service.findExpenseTypes();

    expect(result).toEqual([
      { id: '5', code: 'other', label: 'Інше', requiresName: true },
    ]);
  });

  it('maps delivery types', async () => {
    const result = await service.findDeliveryTypes();

    expect(result).toEqual([
      { id: '6', code: 'warehouse', label: 'Відділення' },
    ]);
  });

  it('maps shipment statuses to only the DTO-declared fields', async () => {
    const result = await service.findShipmentStatuses();

    expect(result).toEqual([
      { id: '7', code: 'delivered', label: 'Доставлено' },
    ]);
  });
});
