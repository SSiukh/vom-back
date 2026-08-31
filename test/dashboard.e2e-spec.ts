import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAuthenticatedUser } from './support/auth-helper';
import { safeDeleteByIds } from './support/cleanup-helper';

interface DashboardResponseBody {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  orderCount: number;
  revenueByDay: { date: string; revenue: number }[];
  expensesByCategory: {
    expenseTypeId: string;
    label: string;
    amount: number;
  }[];
  shipmentStatusBreakdown: {
    shipmentStatusId: string;
    label: string;
    count: number;
  }[];
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  let seededSenderId: string;
  let seededOrderId: string;
  let seededExpenseId: string;

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
      'e2e-dashboard-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    const [
      shipmentType,
      paymentType,
      deliveryType,
      stickerType,
      deliveryExpenseType,
    ] = await Promise.all([
      prisma.shipmentType.findUniqueOrThrow({ where: { code: 'documents' } }),
      prisma.paymentType.findUniqueOrThrow({ where: { code: 'full' } }),
      prisma.deliveryType.findUniqueOrThrow({ where: { code: 'warehouse' } }),
      prisma.productType.findUniqueOrThrow({ where: { code: 'sticker' } }),
      prisma.expenseType.findUniqueOrThrow({ where: { code: 'delivery' } }),
    ]);

    const sender = await prisma.sender.create({
      data: {
        apiKey: 'e2e-encrypted-key',
        fullName: 'E2E Dashboard Відправник',
        phone: '380000000000',
        npCounterpartyRef: 'e2e-dashboard-counterparty-ref',
        npContactPersonRef: 'e2e-dashboard-contact-person-ref',
        addresses: [],
        isActive: false,
        isDeactivated: false,
      },
    });
    seededSenderId = sender.id;

    const order = await prisma.order.create({
      data: {
        shipmentTypeId: shipmentType.id,
        paymentTypeId: paymentType.id,
        totalAmount: 500,
        items: [
          {
            productId: null,
            productTypeId: stickerType.id,
            nameSnapshot: 'E2E Dashboard Наліпка',
            photoUrlSnapshot: null,
            price: 500,
            isPromo: false,
            quantity: 1,
            subtotal: 500,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-dashboard-address-ref',
        recipient: {
          phone: '+380501111111',
          lastName: 'Тест',
          firstName: 'Дашборд',
          middleName: null,
        },
        deliveryTypeId: deliveryType.id,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber: 'e2e-dashboard-waybill',
      },
    });
    seededOrderId = order.id;

    const expense = await prisma.expense.create({
      data: { typeId: deliveryExpenseType.id, amount: 120 },
    });
    seededExpenseId = expense.id;
  });

  afterAll(async () => {
    await safeDeleteByIds(prisma.order, [seededOrderId]);
    await safeDeleteByIds(prisma.expense, [seededExpenseId]);
    await safeDeleteByIds(prisma.sender, [seededSenderId]);
    await safeDeleteByIds(prisma.user, [authUserId]);
    await app.close();
  });

  it('includes the seeded order and expense in the totals', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as DashboardResponseBody;

    expect(body.totalRevenue).toBeGreaterThanOrEqual(500);
    expect(body.totalExpenses).toBeGreaterThanOrEqual(120);
    expect(body.profit).toBe(body.totalRevenue - body.totalExpenses);
    expect(body.orderCount).toBeGreaterThanOrEqual(1);
  });

  it('includes all four shipment statuses in the breakdown, even with a zero count', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as DashboardResponseBody;

    const codes = body.shipmentStatusBreakdown.map((bucket) => bucket.label);
    expect(codes).toEqual(
      expect.arrayContaining([
        'Доставлено',
        'Відправлено',
        'Відмовлено',
        'Отримано',
      ]),
    );
  });

  it('scopes results to the given date range', async () => {
    const futureDate = '2099-01-01';

    const response = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ dateFrom: futureDate })
      .expect(200);
    const body = response.body as DashboardResponseBody;

    expect(body.orderCount).toBe(0);
    expect(body.totalRevenue).toBe(0);
    expect(body.totalExpenses).toBe(0);
    expect(body.profit).toBe(0);
  });

  it('rejects a malformed date filter', () => {
    return request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ dateFrom: 'not-a-date' })
      .expect(400);
  });
});
