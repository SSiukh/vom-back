import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface CrmRowBody {
  id: string;
  totalAmount: number;
  productTypeIds: string[];
  shipmentStatusId: string | null;
}

interface ListCrmResponseBody {
  items: CrmRowBody[];
  total: number;
  totalAmountSum: number;
}

describe('CRM table (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  let seededSenderId: string;
  let stickerOrderId: string;
  let stickerOrder2Id: string;
  let keychainOrderId: string;
  let stickerTypeId: string;
  let keychainTypeId: string;
  let deliveredStatusId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    const authUser = await createAuthenticatedUser(
      app,
      prisma,
      'e2e-crm-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    const [
      shipmentType,
      paymentType,
      deliveryType,
      stickerType,
      keychainType,
      deliveredStatus,
    ] = await Promise.all([
      prisma.shipmentType.findUniqueOrThrow({ where: { code: 'documents' } }),
      prisma.paymentType.findUniqueOrThrow({ where: { code: 'full' } }),
      prisma.deliveryType.findUniqueOrThrow({ where: { code: 'warehouse' } }),
      prisma.productType.findUniqueOrThrow({ where: { code: 'sticker' } }),
      prisma.productType.findUniqueOrThrow({ where: { code: 'keychain' } }),
      prisma.shipmentStatus.findUniqueOrThrow({ where: { code: 'delivered' } }),
    ]);
    stickerTypeId = stickerType.id;
    keychainTypeId = keychainType.id;
    deliveredStatusId = deliveredStatus.id;

    const sender = await prisma.sender.create({
      data: {
        apiKey: 'e2e-encrypted-key',
        fullName: 'E2E CRM Відправник',
        phone: '380000000000',
        npCounterpartyRef: 'e2e-crm-counterparty-ref',
        npContactPersonRef: 'e2e-crm-contact-person-ref',
        addresses: [],
        isActive: false,
        isDeactivated: false,
      },
    });
    seededSenderId = sender.id;

    const stickerOrder = await prisma.order.create({
      data: {
        shipmentTypeId: shipmentType.id,
        paymentTypeId: paymentType.id,
        totalAmount: 100,
        items: [
          {
            productId: null,
            productTypeId: stickerTypeId,
            nameSnapshot: 'E2E CRM Наліпка',
            photoUrlSnapshot: null,
            price: 100,
            isPromo: false,
            quantity: 1,
            subtotal: 100,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-crm-address-ref',
        recipient: {
          phone: '+380501111111',
          lastName: 'Наліпочний',
          firstName: 'Клієнт',
          middleName: null,
        },
        deliveryTypeId: deliveryType.id,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-crm-waybill-sticker',
        shipmentStatusId: deliveredStatusId,
      },
    });
    stickerOrderId = stickerOrder.id;

    const stickerOrder2 = await prisma.order.create({
      data: {
        shipmentTypeId: shipmentType.id,
        paymentTypeId: paymentType.id,
        totalAmount: 50,
        items: [
          {
            productId: null,
            productTypeId: stickerTypeId,
            nameSnapshot: 'E2E CRM Наліпка 2',
            photoUrlSnapshot: null,
            price: 50,
            isPromo: false,
            quantity: 1,
            subtotal: 50,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-crm-address-ref',
        recipient: {
          phone: '+380501111112',
          lastName: 'Наліпочний2',
          firstName: 'Клієнт',
          middleName: null,
        },
        deliveryTypeId: deliveryType.id,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-crm-waybill-sticker-2',
      },
    });
    stickerOrder2Id = stickerOrder2.id;

    const keychainOrder = await prisma.order.create({
      data: {
        shipmentTypeId: shipmentType.id,
        paymentTypeId: paymentType.id,
        totalAmount: 250,
        items: [
          {
            productId: null,
            productTypeId: keychainTypeId,
            nameSnapshot: 'E2E CRM Брелок',
            photoUrlSnapshot: null,
            price: 250,
            isPromo: false,
            quantity: 1,
            subtotal: 250,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-crm-address-ref',
        recipient: {
          phone: '+380502222222',
          lastName: 'Брелоковий',
          firstName: 'Клієнт',
          middleName: null,
        },
        deliveryTypeId: deliveryType.id,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-crm-waybill-keychain',
      },
    });
    keychainOrderId = keychainOrder.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({
      where: { id: { in: [stickerOrderId, stickerOrder2Id, keychainOrderId] } },
    });
    await prisma.sender.deleteMany({ where: { id: seededSenderId } });
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('lists all seeded orders in the table', async () => {
    const response = await request(app.getHttpServer())
      .get('/crm/table')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ListCrmResponseBody;

    const ids = body.items.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        stickerOrderId,
        stickerOrder2Id,
        keychainOrderId,
      ]),
    );
  });

  it('filters by productTypeId to only the matching orders', async () => {
    const response = await request(app.getHttpServer())
      .get('/crm/table')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ productTypeId: keychainTypeId })
      .expect(200);
    const body = response.body as ListCrmResponseBody;

    expect(body.items.some((item) => item.id === stickerOrderId)).toBe(false);
    expect(body.items.some((item) => item.id === stickerOrder2Id)).toBe(false);
    expect(body.items.some((item) => item.id === keychainOrderId)).toBe(true);
  });

  it('filters by shipmentStatusId to only the matching order', async () => {
    const response = await request(app.getHttpServer())
      .get('/crm/table')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ shipmentStatusId: deliveredStatusId })
      .expect(200);
    const body = response.body as ListCrmResponseBody;

    expect(body.items.some((item) => item.id === stickerOrderId)).toBe(true);
    expect(body.items.some((item) => item.id === keychainOrderId)).toBe(false);
  });

  it('sums totalAmount across the full filtered set, not just the current page', async () => {
    const response = await request(app.getHttpServer())
      .get('/crm/table')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ productTypeId: stickerTypeId, pageSize: 1 })
      .expect(200);
    const body = response.body as ListCrmResponseBody;

    expect(body.total).toBe(2);
    expect(body.items.length).toBe(1);
    expect(body.totalAmountSum).toBe(150);
  });

  it('rejects an invalid sortOrder value', () => {
    return request(app.getHttpServer())
      .get('/crm/table')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ sortOrder: 'sideways' })
      .expect(400);
  });
});
