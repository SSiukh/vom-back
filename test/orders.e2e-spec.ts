import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NovaPoshtaService } from '../src/nova-poshta/nova-poshta.service';
import { EncryptionService } from '../src/shared/encryption/encryption.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface OrderResponseBody {
  id: string;
  orderTypeId: string;
  totalAmount: number;
  recipient: { lastName: string };
  npWaybillNumber: string | null;
  shipmentStatusId: string | null;
}

interface ListOrdersResponseBody {
  items: OrderResponseBody[];
  total: number;
}

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  let createWaybillMock: jest.Mock;
  let updateWaybillMock: jest.Mock;
  let deleteWaybillMock: jest.Mock;
  let getShipmentStatusMock: jest.Mock;
  let seededOrderId: string;
  let seededSenderId: string;
  let seededProductId: string;
  let orderTypeId: string;
  let shipmentTypeId: string;
  let paymentTypeId: string;
  let deliveryTypeId: string;
  let stickerProductTypeId: string;

  beforeAll(async () => {
    createWaybillMock = jest.fn().mockResolvedValue({
      waybillNumber: 'e2e-waybill-number',
      waybillRef: 'e2e-waybill-ref',
    });
    updateWaybillMock = jest.fn().mockResolvedValue(undefined);
    deleteWaybillMock = jest.fn().mockResolvedValue(undefined);
    getShipmentStatusMock = jest
      .fn()
      .mockResolvedValue({ statusCode: '7', status: 'В дорозі' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NovaPoshtaService)
      .useValue({
        createWaybill: createWaybillMock,
        updateWaybill: updateWaybillMock,
        deleteWaybill: deleteWaybillMock,
        getShipmentStatus: getShipmentStatusMock,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const encryption = moduleFixture.get(EncryptionService);

    const authUser = await createAuthenticatedUser(
      app,
      prisma,
      'e2e-orders-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    const [orderType, shipmentType, paymentType, deliveryType, productType] =
      await Promise.all([
        prisma.orderType.findUniqueOrThrow({ where: { code: 'custom' } }),
        prisma.shipmentType.findUniqueOrThrow({ where: { code: 'documents' } }),
        prisma.paymentType.findUniqueOrThrow({ where: { code: 'full' } }),
        prisma.deliveryType.findUniqueOrThrow({ where: { code: 'warehouse' } }),
        prisma.productType.findUniqueOrThrow({ where: { code: 'sticker' } }),
      ]);
    orderTypeId = orderType.id;
    shipmentTypeId = shipmentType.id;
    paymentTypeId = paymentType.id;
    deliveryTypeId = deliveryType.id;
    stickerProductTypeId = productType.id;

    const sender = await prisma.sender.create({
      data: {
        apiKey: encryption.encrypt('e2e-raw-api-key'),
        fullName: 'E2E Відправник',
        phone: '380000000000',
        npCounterpartyRef: 'e2e-orders-counterparty-ref',
        npContactPersonRef: 'e2e-orders-contact-person-ref',
        addresses: [
          {
            npAddressRef: 'e2e-address-ref',
            description: 'E2E',
            cityRef: 'e2e-sender-city-ref',
            isDeactivated: false,
          },
        ],
        isActive: false,
        isDeactivated: false,
      },
    });
    seededSenderId = sender.id;

    const product = await prisma.product.create({
      data: {
        typeId: stickerProductTypeId,
        name: 'E2E Наліпка',
        photoUrl: 'https://cloudinary.example/e2e-photo.jpg',
        price: 100,
        promoPrice: null,
        stockQuantity: 5,
      },
    });
    seededProductId = product.id;

    const order = await prisma.order.create({
      data: {
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        totalAmount: 200,
        items: [
          {
            productId: null,
            productTypeId: stickerProductTypeId,
            nameSnapshot: 'E2E Наліпка (custom)',
            photoUrlSnapshot: null,
            price: 100,
            isPromo: false,
            quantity: 2,
            subtotal: 200,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'E2E Тестовий',
          firstName: 'Отримувач',
          middleName: null,
        },
        deliveryTypeId,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
      },
    });
    seededOrderId = order.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: seededOrderId } });
    await prisma.product.deleteMany({ where: { id: seededProductId } });
    await prisma.sender.deleteMany({ where: { id: seededSenderId } });
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('lists the seeded order', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ListOrdersResponseBody;

    expect(body.items.some((item) => item.id === seededOrderId)).toBe(true);
  });

  it('filters the list by orderTypeId', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderTypeId })
      .expect(200);
    const body = response.body as ListOrdersResponseBody;

    expect(body.items.every((item) => item.orderTypeId === orderTypeId)).toBe(
      true,
    );
  });

  it('gets order detail with mapped embedded data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/orders/${seededOrderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(body).toMatchObject({
      id: seededOrderId,
      totalAmount: 200,
      recipient: { lastName: 'E2E Тестовий' },
    });
  });

  it('rejects a malformed order id with 400', () => {
    return request(app.getHttpServer())
      .get('/orders/not-a-valid-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('404s for a well-formed but nonexistent order id', () => {
    return request(app.getHttpServer())
      .get('/orders/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('creates an order, calls Nova Poshta and decrements product stock', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        items: [
          {
            productTypeId: stickerProductTypeId,
            productId: seededProductId,
            quantity: 2,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'Створений',
          firstName: 'Тест',
        },
        deliveryTypeId,
        deliveryDetails: { cityRef: 'city-ref', warehouseRef: 'warehouse-ref' },
      })
      .expect(201);
    const body = response.body as OrderResponseBody;

    expect(body.npWaybillNumber).toBe('e2e-waybill-number');
    expect(createWaybillMock).toHaveBeenCalledTimes(1);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: seededProductId },
    });
    expect(product.stockQuantity).toBe(3);

    await prisma.order.deleteMany({ where: { id: body.id } });
    await prisma.product.update({
      where: { id: seededProductId },
      data: { stockQuantity: 5 },
    });
  });

  it('rejects door-to-door ("address") delivery with 400', async () => {
    const addressDeliveryType = await prisma.deliveryType.findUniqueOrThrow({
      where: { code: 'address' },
    });

    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        items: [
          {
            productTypeId: stickerProductTypeId,
            productId: seededProductId,
            quantity: 1,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'Тест',
          firstName: 'Тест',
        },
        deliveryTypeId: addressDeliveryType.id,
        deliveryDetails: {
          cityRef: 'city-ref',
          streetRef: 'street-ref',
          house: '1',
        },
      })
      .expect(400);
  });

  it('updates order items, recalculates totals and calls Nova Poshta waybill update', async () => {
    const created = await prisma.order.create({
      data: {
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        totalAmount: 100,
        items: [
          {
            productId: seededProductId,
            productTypeId: stickerProductTypeId,
            nameSnapshot: 'E2E Наліпка',
            photoUrlSnapshot: 'https://cloudinary.example/e2e-photo.jpg',
            price: 100,
            isPromo: false,
            quantity: 1,
            subtotal: 100,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'До редагування',
          firstName: 'Тест',
          middleName: null,
        },
        deliveryTypeId,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-update-waybill-number',
        npWaybillRef: 'e2e-update-waybill-ref',
      },
    });
    await prisma.product.update({
      where: { id: seededProductId },
      data: { stockQuantity: 4 },
    });
    updateWaybillMock.mockClear();

    const response = await request(app.getHttpServer())
      .patch(`/orders/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          {
            productTypeId: stickerProductTypeId,
            productId: seededProductId,
            quantity: 2,
          },
        ],
      })
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(body.totalAmount).toBe(200);
    expect(updateWaybillMock).toHaveBeenCalledWith(
      'e2e-raw-api-key',
      expect.objectContaining({
        waybillRef: 'e2e-update-waybill-ref',
        cost: 200,
      }),
    );

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: seededProductId },
    });
    expect(product.stockQuantity).toBe(3);

    await prisma.order.deleteMany({ where: { id: created.id } });
    await prisma.product.update({
      where: { id: seededProductId },
      data: { stockQuantity: 5 },
    });
  });

  it('applies a metadata-only order update without calling Nova Poshta', async () => {
    const otherOrderType = await prisma.orderType.findUniqueOrThrow({
      where: { code: 'recurring' },
    });
    updateWaybillMock.mockClear();

    const response = await request(app.getHttpServer())
      .patch(`/orders/${seededOrderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ orderTypeId: otherOrderType.id })
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(body.orderTypeId).toBe(otherOrderType.id);
    expect(updateWaybillMock).not.toHaveBeenCalled();

    await prisma.order.update({
      where: { id: seededOrderId },
      data: { orderTypeId },
    });
  });

  it('rejects an attempt to edit the recipient, delivery details or sender via PATCH (DTO whitelist)', () => {
    return request(app.getHttpServer())
      .patch(`/orders/${seededOrderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        recipient: {
          phone: '+380501234567',
          lastName: 'Хтось Інший',
          firstName: 'Хтось',
        },
      })
      .expect(400);
  });

  it('syncs the shipment status from Nova Poshta', async () => {
    const deliveredStatus = await prisma.shipmentStatus.findUniqueOrThrow({
      where: { code: 'delivered' },
    });
    const created = await prisma.order.create({
      data: {
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        totalAmount: 100,
        items: [
          {
            productId: null,
            productTypeId: stickerProductTypeId,
            nameSnapshot: 'E2E Наліпка',
            photoUrlSnapshot: null,
            price: 100,
            isPromo: false,
            quantity: 1,
            subtotal: 100,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'Для статусу',
          firstName: 'Тест',
          middleName: null,
        },
        deliveryTypeId,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-status-waybill-number',
        npWaybillRef: 'e2e-status-waybill-ref',
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/orders/${created.id}/sync-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(getShipmentStatusMock).toHaveBeenCalledWith(
      'e2e-raw-api-key',
      'e2e-status-waybill-number',
    );
    expect(body.shipmentStatusId).toBe(deliveredStatus.id);

    await prisma.order.deleteMany({ where: { id: created.id } });
  });

  it('deletes an order, calls Nova Poshta waybill delete and restores stock', async () => {
    const created = await prisma.order.create({
      data: {
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        totalAmount: 100,
        items: [
          {
            productId: seededProductId,
            productTypeId: stickerProductTypeId,
            nameSnapshot: 'E2E Наліпка',
            photoUrlSnapshot: 'https://cloudinary.example/e2e-photo.jpg',
            price: 100,
            isPromo: false,
            quantity: 1,
            subtotal: 100,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'До видалення',
          firstName: 'Тест',
          middleName: null,
        },
        deliveryTypeId,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-delete-waybill-number',
        npWaybillRef: 'e2e-delete-waybill-ref',
      },
    });

    await prisma.product.update({
      where: { id: seededProductId },
      data: { stockQuantity: 4 },
    });

    await request(app.getHttpServer())
      .delete(`/orders/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    expect(deleteWaybillMock).toHaveBeenCalledWith(
      'e2e-raw-api-key',
      'e2e-delete-waybill-ref',
    );

    const remaining = await prisma.order.findUnique({
      where: { id: created.id },
    });
    expect(remaining).toBeNull();

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: seededProductId },
    });
    expect(product.stockQuantity).toBe(5);
  });

  it('still deletes the order, but returns 502, when the Nova Poshta waybill cleanup fails', async () => {
    const created = await prisma.order.create({
      data: {
        orderTypeId,
        shipmentTypeId,
        paymentTypeId,
        totalAmount: 100,
        items: [
          {
            productId: seededProductId,
            productTypeId: stickerProductTypeId,
            nameSnapshot: 'E2E Наліпка',
            photoUrlSnapshot: 'https://cloudinary.example/e2e-photo.jpg',
            price: 100,
            isPromo: false,
            quantity: 1,
            subtotal: 100,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-address-ref',
        recipient: {
          phone: '+380501234567',
          lastName: 'До видалення',
          firstName: 'Тест',
          middleName: null,
        },
        deliveryTypeId,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-delete-fail-waybill-number',
        npWaybillRef: 'e2e-delete-fail-waybill-ref',
      },
    });

    deleteWaybillMock.mockRejectedValueOnce(new Error('Nova Poshta is down'));

    await request(app.getHttpServer())
      .delete(`/orders/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(502);

    const remaining = await prisma.order.findUnique({
      where: { id: created.id },
    });
    expect(remaining).toBeNull();
  });
});
