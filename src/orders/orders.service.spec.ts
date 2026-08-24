import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    order: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    orderType: { findUnique: jest.Mock };
    shipmentType: { findUnique: jest.Mock };
    paymentType: { findUnique: jest.Mock };
    deliveryType: { findUnique: jest.Mock };
    sender: { findFirst: jest.Mock; findUnique: jest.Mock };
    productType: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock; update: jest.Mock };
    shipmentStatus: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let encryption: { decrypt: jest.Mock };
  let novaPoshta: {
    createWaybill: jest.Mock;
    updateWaybill: jest.Mock;
    deleteWaybill: jest.Mock;
    getShipmentStatus: jest.Mock;
  };

  const storedOrder = {
    id: 'order-id',
    orderTypeId: 'order-type-id',
    shipmentTypeId: 'shipment-type-id',
    paymentTypeId: 'payment-type-id',
    partialAmount: null,
    totalAmount: 200,
    items: [
      {
        productId: 'product-id',
        productTypeId: 'product-type-id',
        nameSnapshot: 'Наліпка',
        photoUrlSnapshot: 'https://cloudinary.example/photo.jpg',
        price: 100,
        isPromo: false,
        quantity: 2,
        subtotal: 200,
      },
    ],
    senderId: 'sender-id',
    senderAddressRef: 'address-ref',
    recipient: {
      phone: '+380501234567',
      lastName: 'Іваненко',
      firstName: 'Іван',
      middleName: null,
    },
    deliveryTypeId: 'delivery-type-id',
    deliveryDetails: {
      cityRef: 'city-ref',
      warehouseRef: 'warehouse-ref',
      streetRef: null,
      house: null,
      apartment: null,
      postomatRef: null,
    },
    npWaybillNumber: '20450000000000',
    npWaybillRef: 'waybill-ref',
    shipmentStatusId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const orderType = { id: 'order-type-id', code: 'regular' };
  const shipmentType = { id: 'shipment-type-id', code: 'parcel' };
  const paymentType = { id: 'payment-type-id', code: 'full' };
  const deliveryType = { id: 'delivery-type-id', code: 'warehouse' };
  const shipmentStatus = {
    id: 'shipment-status-id',
    code: 'delivered',
    npStatusCodes: ['7', '8'],
  };

  const sender = {
    id: 'sender-id',
    apiKey: 'encrypted-key',
    npCounterpartyRef: 'counterparty-ref',
    npContactPersonRef: 'contact-person-ref',
    phone: '380501111111',
    addresses: [
      {
        npAddressRef: 'address-ref',
        description: 'Луцьк, вул. Молоді, 8а',
        cityRef: 'sender-city-ref',
        isDeactivated: false,
      },
    ],
    isDeactivated: false,
  };

  const productType = { id: 'product-type-id', isCustom: false };

  const product = {
    id: 'product-id',
    typeId: 'product-type-id',
    name: 'Наліпка',
    photoUrl: 'https://cloudinary.example/photo.jpg',
    price: 100,
    promoPrice: null,
    stockQuantity: 10,
  };

  const createDto: CreateOrderDto = {
    orderTypeId: 'order-type-id',
    shipmentTypeId: 'shipment-type-id',
    paymentTypeId: 'payment-type-id',
    items: [
      {
        productTypeId: 'product-type-id',
        productId: 'product-id',
        quantity: 2,
      },
    ],
    senderId: 'sender-id',
    senderAddressRef: 'address-ref',
    recipient: {
      phone: '+380501234567',
      lastName: 'Іваненко',
      firstName: 'Іван',
    },
    deliveryTypeId: 'delivery-type-id',
    deliveryDetails: { cityRef: 'city-ref', warehouseRef: 'warehouse-ref' },
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([storedOrder]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(storedOrder),
        create: jest.fn().mockResolvedValue(storedOrder),
        update: jest.fn().mockResolvedValue(storedOrder),
        delete: jest.fn().mockResolvedValue(storedOrder),
      },
      orderType: { findUnique: jest.fn().mockResolvedValue(orderType) },
      shipmentType: { findUnique: jest.fn().mockResolvedValue(shipmentType) },
      paymentType: { findUnique: jest.fn().mockResolvedValue(paymentType) },
      deliveryType: { findUnique: jest.fn().mockResolvedValue(deliveryType) },
      sender: {
        findFirst: jest.fn().mockResolvedValue(sender),
        findUnique: jest.fn().mockResolvedValue(sender),
      },
      productType: { findUnique: jest.fn().mockResolvedValue(productType) },
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest.fn().mockResolvedValue(product),
      },
      shipmentStatus: {
        findFirst: jest.fn().mockResolvedValue(shipmentStatus),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    encryption = { decrypt: jest.fn().mockReturnValue('decrypted-api-key') };
    novaPoshta = {
      createWaybill: jest.fn().mockResolvedValue({
        waybillNumber: '20450000000000',
        waybillRef: 'waybill-ref',
      }),
      updateWaybill: jest.fn().mockResolvedValue(undefined),
      deleteWaybill: jest.fn().mockResolvedValue(undefined),
      getShipmentStatus: jest
        .fn()
        .mockResolvedValue({ statusCode: '7', status: 'В дорозі' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: NovaPoshtaService, useValue: novaPoshta },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('findAll', () => {
    it('filters by orderTypeId when provided', async () => {
      await service.findAll(1, 10, 'order-type-id');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderTypeId: 'order-type-id' } }),
      );
    });

    it('filters by a createdAt date range when provided', async () => {
      await service.findAll(1, 10, undefined, '2026-01-01', '2026-01-31');

      const [[args]] = prisma.order.findMany.mock.calls as [
        [{ where: { createdAt: { gte: Date; lte: Date } } }],
      ];
      expect(args.where.createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(args.where.createdAt.lte).toEqual(new Date('2026-01-31'));
    });

    it('queries everything when no filters are given', async () => {
      await service.findAll(1, 10);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('maps the embedded items/recipient/deliveryDetails onto the response', async () => {
      const result = await service.findAll(1, 10);

      expect(result.items[0]).toMatchObject({
        totalAmount: 200,
        recipient: { lastName: 'Іваненко', firstName: 'Іван' },
        deliveryDetails: { cityRef: 'city-ref', warehouseRef: 'warehouse-ref' },
      });
      expect(result.items[0].items[0]).toMatchObject({
        nameSnapshot: 'Наліпка',
        subtotal: 200,
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the mapped order when it exists', async () => {
      const result = await service.findOne('order-id');

      expect(result.id).toBe('order-id');
      expect(result.totalAmount).toBe(200);
    });
  });

  describe('create', () => {
    it('rejects an unknown order/shipment/payment/delivery type', async () => {
      prisma.orderType.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('requires partialAmount when the payment type is "partial"', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'payment-type-id',
        code: 'partial',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'partialAmount is required',
      );
    });

    it('rejects a partialAmount greater than the order total', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'payment-type-id',
        code: 'partial',
      });

      await expect(
        service.create({ ...createDto, partialAmount: 999 }),
      ).rejects.toThrow('partialAmount cannot exceed the order total');
    });

    it('rejects door-to-door ("address") delivery as not yet supported', async () => {
      prisma.deliveryType.findUnique.mockResolvedValueOnce({
        id: 'delivery-type-id',
        code: 'address',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'not supported yet',
      );
    });

    it('requires warehouseRef for "warehouse" delivery', async () => {
      await expect(
        service.create({
          ...createDto,
          deliveryDetails: { cityRef: 'city-ref' },
        }),
      ).rejects.toThrow('warehouseRef is required');
    });

    it('rejects a sender that does not exist or is deactivated', async () => {
      prisma.sender.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        'Sender not found or deactivated',
      );
    });

    it('rejects a senderAddressRef that is not among the sender addresses', async () => {
      await expect(
        service.create({ ...createDto, senderAddressRef: 'unknown-ref' }),
      ).rejects.toThrow('Sender address not found or deactivated');
    });

    it('rejects insufficient stock for a catalog product', async () => {
      prisma.product.findUnique.mockResolvedValueOnce({
        ...product,
        stockQuantity: 1,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'Not enough stock',
      );
    });

    it('rejects isPromo when the product has no promo price', async () => {
      await expect(
        service.create({
          ...createDto,
          items: [{ ...createDto.items[0], isPromo: true }],
        }),
      ).rejects.toThrow('has no promo price');
    });

    it('requires name and price for a custom product type item', async () => {
      prisma.productType.findUnique.mockResolvedValue({
        id: 'product-type-id',
        isCustom: true,
      });

      await expect(
        service.create({
          ...createDto,
          items: [{ productTypeId: 'product-type-id', quantity: 1 }],
        }),
      ).rejects.toThrow('price is required');
    });

    it('calls Nova Poshta with the correct CargoType/ServiceType and creates the order', async () => {
      const result = await service.create(createDto);

      expect(encryption.decrypt).toHaveBeenCalledWith(sender.apiKey);
      expect(novaPoshta.createWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({
          cargoType: 'Parcel',
          serviceType: 'DoorsWarehouse',
          senderCityRef: 'sender-city-ref',
          recipientAddressRef: 'warehouse-ref',
          cost: 200,
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id', stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      });
      expect(result.id).toBe('order-id');
    });

    it('sends no cash-on-delivery amount for a fully prepaid ("full") order', async () => {
      await service.create(createDto);

      expect(novaPoshta.createWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: null }),
      );
    });

    it('sends the full order total as the cash-on-delivery amount for a "cod" order', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'payment-type-id',
        code: 'cod',
      });

      await service.create(createDto);

      expect(novaPoshta.createWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: 200 }),
      );
    });

    it('sends only partialAmount as the cash-on-delivery amount for a "partial" order', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'payment-type-id',
        code: 'partial',
      });

      await service.create({ ...createDto, partialAmount: 75 });

      expect(novaPoshta.createWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: 75 }),
      );
    });

    it('rejects two line items for the same product whose combined quantity exceeds stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stockQuantity: 3,
      });

      await expect(
        service.create({
          ...createDto,
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 2,
            },
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 2,
            },
          ],
        }),
      ).rejects.toThrow('Not enough stock');
    });

    it('translates a concurrent stock-depletion failure (Prisma P2025) into a 400', async () => {
      const { Prisma } =
        jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'Not enough stock — a concurrent order already reserved it',
      );
      expect(novaPoshta.deleteWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        'waybill-ref',
      );
    });

    it('also translates a genuine write-conflict failure (Prisma P2034) into a 400', async () => {
      const { Prisma } =
        jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Write conflict', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'Not enough stock — a concurrent order already reserved it',
      );
    });

    it('surfaces a BadGatewayException instead of the original DB error when the orphaned-waybill cleanup itself fails', async () => {
      const { Prisma } =
        jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );
      novaPoshta.deleteWaybill.mockRejectedValueOnce(new Error('NP is down'));

      await expect(service.create(createDto)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('uses CargoType Documents for the "documents" shipment type', async () => {
      prisma.shipmentType.findUnique.mockResolvedValueOnce({
        id: 'shipment-type-id',
        code: 'documents',
      });

      await service.create(createDto);

      expect(novaPoshta.createWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cargoType: 'Documents' }),
      );
    });

    it('deletes the just-created waybill if persisting the order fails', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(createDto)).rejects.toThrow('db down');

      expect(novaPoshta.deleteWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        'waybill-ref',
      );
    });
  });

  describe('update', () => {
    const metadataOnlyDto: UpdateOrderDto = { orderTypeId: 'order-type-id' };

    it('rejects an unknown order/shipment/payment type', async () => {
      prisma.orderType.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('order-id', metadataOnlyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('requires partialAmount when switching to the "partial" payment type', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'new-payment-type-id',
        code: 'partial',
      });

      await expect(
        service.update('order-id', { paymentTypeId: 'new-payment-type-id' }),
      ).rejects.toThrow('partialAmount is required');
    });

    it('rejects a partialAmount greater than the order total', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'new-payment-type-id',
        code: 'partial',
      });

      await expect(
        service.update('order-id', {
          paymentTypeId: 'new-payment-type-id',
          partialAmount: 999,
        }),
      ).rejects.toThrow('partialAmount cannot exceed the order total');
    });

    it('updates the waybill cash-on-delivery amount when only partialAmount changes for an already-"partial" order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...storedOrder,
        partialAmount: 50,
      });
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'payment-type-id',
        code: 'partial',
      });

      await service.update('order-id', { partialAmount: 120 });

      expect(novaPoshta.updateWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: 120, waybillRef: 'waybill-ref' }),
      );
    });

    it('updates the waybill cash-on-delivery amount when the payment type changes, even with no item/shipment-type change', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'new-payment-type-id',
        code: 'cod',
      });

      await service.update('order-id', {
        paymentTypeId: 'new-payment-type-id',
      });

      expect(novaPoshta.updateWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: 200, waybillRef: 'waybill-ref' }),
      );
    });

    it('reverts the waybill cash-on-delivery amount if the DB update fails after a payment-type change', async () => {
      prisma.paymentType.findUnique.mockResolvedValueOnce({
        id: 'new-payment-type-id',
        code: 'cod',
      });
      prisma.$transaction.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        service.update('order-id', { paymentTypeId: 'new-payment-type-id' }),
      ).rejects.toThrow('DB down');

      expect(novaPoshta.updateWaybill).toHaveBeenLastCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ codAmount: null, waybillRef: 'waybill-ref' }),
      );
    });

    it('applies a metadata-only change without touching Nova Poshta or stock', async () => {
      await service.update('order-id', metadataOnlyDto);

      expect(novaPoshta.updateWaybill).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
      const [[{ where, data }]] = prisma.order.update.mock.calls as [
        [
          {
            where: { id: string; updatedAt: Date };
            data: { orderTypeId: string };
          },
        ],
      ];
      expect(where).toEqual({
        id: 'order-id',
        updatedAt: storedOrder.updatedAt,
      });
      expect(data.orderTypeId).toBe('order-type-id');
    });

    it('recalculates totals, updates the waybill and adjusts stock when items change', async () => {
      await service.update('order-id', {
        items: [
          {
            productTypeId: 'product-type-id',
            productId: 'product-id',
            quantity: 3,
          },
        ],
      });

      expect(novaPoshta.updateWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cost: 300, waybillRef: 'waybill-ref' }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { stockQuantity: { increment: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id', stockQuantity: { gte: 3 } },
        data: { stockQuantity: { decrement: 3 } },
      });
      const [[{ where, data }]] = prisma.order.update.mock.calls as [
        [
          {
            where: { id: string; updatedAt: Date };
            data: { totalAmount: number };
          },
        ],
      ];
      expect(where).toEqual({
        id: 'order-id',
        updatedAt: storedOrder.updatedAt,
      });
      expect(data.totalAmount).toBe(300);
    });

    it('allows a larger quantity of the same product by freeing its own previously-reserved stock first', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stockQuantity: 1,
      });

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 3,
            },
          ],
        }),
      ).resolves.toBeDefined();
    });

    it('updates only CargoType/Description on the waybill when the shipment type changes with no item changes', async () => {
      prisma.shipmentType.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            where.id === 'new-shipment-type-id'
              ? { id: 'new-shipment-type-id', code: 'documents' }
              : shipmentType,
          ),
      );

      await service.update('order-id', {
        shipmentTypeId: 'new-shipment-type-id',
      });

      expect(novaPoshta.updateWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cargoType: 'Documents', cost: 200 }),
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('skips the Nova Poshta call when the order has no waybill ref, but still adjusts stock', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...storedOrder,
        npWaybillRef: null,
      });

      await service.update('order-id', {
        items: [
          {
            productTypeId: 'product-type-id',
            productId: 'product-id',
            quantity: 1,
          },
        ],
      });

      expect(novaPoshta.updateWaybill).not.toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('does not call Nova Poshta when the resubmitted items resolve to the same cost/description', async () => {
      await service.update('order-id', {
        items: [
          {
            productTypeId: 'product-type-id',
            productId: 'product-id',
            quantity: 2,
          },
        ],
      });

      expect(novaPoshta.updateWaybill).not.toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { stockQuantity: { increment: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id', stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      });
    });

    it('supports swapping to a completely different product', async () => {
      const otherProduct = {
        id: 'other-product-id',
        typeId: 'product-type-id',
        name: 'Брелок',
        photoUrl: 'https://cloudinary.example/other.jpg',
        price: 150,
        promoPrice: null,
        stockQuantity: 5,
      };
      prisma.product.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            where.id === 'other-product-id' ? otherProduct : product,
          ),
      );

      await service.update('order-id', {
        items: [
          {
            productTypeId: 'product-type-id',
            productId: 'other-product-id',
            quantity: 2,
          },
        ],
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { stockQuantity: { increment: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'other-product-id', stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      });
      expect(novaPoshta.updateWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cost: 300 }),
      );
    });

    it('aggregates two duplicate lines for the same product against the freed stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stockQuantity: 2,
      });

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 2,
            },
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 1,
            },
          ],
        }),
      ).resolves.toBeDefined();
    });

    it('throws if the original shipment type no longer exists when a rollback value is needed', async () => {
      prisma.shipmentType.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            where.id === 'new-shipment-type-id'
              ? { id: 'new-shipment-type-id', code: 'documents' }
              : null,
          ),
      );

      await expect(
        service.update('order-id', { shipmentTypeId: 'new-shipment-type-id' }),
      ).rejects.toThrow('no longer exists');
      expect(novaPoshta.updateWaybill).not.toHaveBeenCalled();
    });

    it('translates a concurrent stock-depletion failure (Prisma P2025) into a 400 and reverts the waybill', async () => {
      const { Prisma } =
        jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(
        'This order was modified concurrently, or stock was depleted by another order — please retry',
      );

      expect(novaPoshta.updateWaybill).toHaveBeenCalledTimes(2);
      expect(novaPoshta.updateWaybill).toHaveBeenLastCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cost: 200 }),
      );
    });

    it('also translates a genuine write-conflict failure (Prisma P2034) into a 400', async () => {
      const { Prisma } =
        jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Write conflict', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(
        'This order was modified concurrently, or stock was depleted by another order — please retry',
      );
    });

    it('surfaces a BadGatewayException instead of the original DB error when reverting the waybill itself fails', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));
      novaPoshta.updateWaybill.mockResolvedValueOnce(undefined);
      novaPoshta.updateWaybill.mockRejectedValueOnce(new Error('NP is down'));

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('reverts the waybill to its previous state if the DB transaction fails for any other reason', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.update('order-id', {
          items: [
            {
              productTypeId: 'product-type-id',
              productId: 'product-id',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow('db down');

      expect(novaPoshta.updateWaybill).toHaveBeenLastCalledWith(
        'decrypted-api-key',
        expect.objectContaining({ cost: 200, description: 'Наліпка' }),
      );
    });
  });

  describe('syncStatus', () => {
    it('fetches the status from Nova Poshta and updates shipmentStatusId', async () => {
      await service.syncStatus('order-id');

      expect(encryption.decrypt).toHaveBeenCalledWith(sender.apiKey);
      expect(novaPoshta.getShipmentStatus).toHaveBeenCalledWith(
        'decrypted-api-key',
        '20450000000000',
      );
      expect(prisma.shipmentStatus.findFirst).toHaveBeenCalledWith({
        where: { npStatusCodes: { has: '7' } },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        data: { shipmentStatusId: 'shipment-status-id' },
      });
    });

    it('throws NotFoundException for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(service.syncStatus('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an order with no waybill number', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...storedOrder,
        npWaybillNumber: null,
      });

      await expect(service.syncStatus('order-id')).rejects.toThrow(
        'has no Nova Poshta waybill',
      );
    });

    it('rejects if the sender for this order no longer exists', async () => {
      prisma.sender.findUnique.mockResolvedValueOnce(null);

      await expect(service.syncStatus('order-id')).rejects.toThrow(
        'Sender for this order no longer exists',
      );
    });

    it('leaves shipmentStatusId unchanged when the NP status code is not mapped to any known status', async () => {
      prisma.shipmentStatus.findFirst.mockResolvedValueOnce(null);

      await service.syncStatus('order-id');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        data: { shipmentStatusId: storedOrder.shipmentStatusId },
      });
    });
  });

  describe('remove', () => {
    it('deletes the Nova Poshta waybill and restores stock', async () => {
      await service.remove('order-id');

      expect(encryption.decrypt).toHaveBeenCalledWith(sender.apiKey);
      expect(novaPoshta.deleteWaybill).toHaveBeenCalledWith(
        'decrypted-api-key',
        'waybill-ref',
      );
      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { stockQuantity: { increment: 2 } },
      });
    });

    it('throws NotFoundException for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('skips the Nova Poshta call when the order has no waybill ref', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...storedOrder,
        npWaybillRef: null,
      });

      await service.remove('order-id');

      expect(novaPoshta.deleteWaybill).not.toHaveBeenCalled();
    });

    it('still deletes the order and restores stock, but surfaces an error, when the Nova Poshta cleanup call fails', async () => {
      novaPoshta.deleteWaybill.mockRejectedValueOnce(new Error('NP is down'));

      await expect(service.remove('order-id')).rejects.toThrow(
        BadGatewayException,
      );

      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { stockQuantity: { increment: 2 } },
      });
    });

    it('still deletes the order, but surfaces an error, when the waybill sender no longer exists', async () => {
      prisma.sender.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('order-id')).rejects.toThrow(
        BadGatewayException,
      );

      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
      expect(novaPoshta.deleteWaybill).not.toHaveBeenCalled();
    });
  });
});
