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
  realizedRevenue: number;
  pendingRevenue: number;
  lostRevenue: number;
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
  sharedExpenses: number | null;
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
    expect(body.profit).toBe(body.realizedRevenue - body.totalExpenses);
    expect(body.totalRevenue).toBe(
      body.realizedRevenue + body.pendingRevenue + body.lostRevenue,
    );
    expect(body.orderCount).toBeGreaterThanOrEqual(1);
    expect(body.sharedExpenses).toBeNull();
  });

  it('includes every seeded shipment status in the breakdown, even with a zero count', async () => {
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
        'Переадресовано',
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
    expect(body.realizedRevenue).toBe(0);
    expect(body.pendingRevenue).toBe(0);
    expect(body.lostRevenue).toBe(0);
  });

  it('rejects a malformed date filter', () => {
    return request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ dateFrom: 'not-a-date' })
      .expect(400);
  });

  it('rejects an invalid brand filter', () => {
    return request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ brand: 'other' })
      .expect(400);
  });

  describe('brand ("group") filter', () => {
    let periodStart: string;
    let mixedOrderId: string;
    let vomExpenseId: string;
    let mExpenseId: string;
    let sharedExpenseId: string;

    beforeAll(async () => {
      periodStart = new Date().toISOString();

      const [
        shipmentType,
        paymentType,
        deliveryType,
        stickerType,
        keychainType,
        deliveryExpenseType,
      ] = await Promise.all([
        prisma.shipmentType.findUniqueOrThrow({ where: { code: 'documents' } }),
        prisma.paymentType.findUniqueOrThrow({ where: { code: 'full' } }),
        prisma.deliveryType.findUniqueOrThrow({ where: { code: 'warehouse' } }),
        prisma.productType.findUniqueOrThrow({ where: { code: 'sticker' } }),
        prisma.productType.findUniqueOrThrow({ where: { code: 'keychain' } }),
        prisma.expenseType.findUniqueOrThrow({ where: { code: 'delivery' } }),
      ]);

      const order = await prisma.order.create({
        data: {
          shipmentTypeId: shipmentType.id,
          paymentTypeId: paymentType.id,
          totalAmount: 500,
          items: [
            {
              productId: null,
              productTypeId: keychainType.id,
              nameSnapshot: 'E2E Dashboard Брелок (vom)',
              photoUrlSnapshot: null,
              price: 300,
              isPromo: false,
              quantity: 1,
              subtotal: 300,
            },
            {
              productId: null,
              productTypeId: stickerType.id,
              nameSnapshot: 'E2E Dashboard Наліпка (m)',
              photoUrlSnapshot: null,
              price: 200,
              isPromo: false,
              quantity: 1,
              subtotal: 200,
            },
          ],
          senderId: seededSenderId,
          senderAddressRef: 'e2e-dashboard-address-ref',
          recipient: {
            phone: '+380502222222',
            lastName: 'Тест',
            firstName: 'Групи',
            middleName: null,
          },
          deliveryTypeId: deliveryType.id,
          deliveryDetails: {
            cityRef: 'e2e-city-ref',
            warehouseRef: 'e2e-warehouse-ref',
          },
          npWaybillNumber: 'e2e-dashboard-brand-waybill',
        },
      });
      mixedOrderId = order.id;

      const [vomExpense, mExpense, sharedExpense] = await Promise.all([
        prisma.expense.create({
          data: { typeId: deliveryExpenseType.id, amount: 50, brand: 'vom' },
        }),
        prisma.expense.create({
          data: { typeId: deliveryExpenseType.id, amount: 30, brand: 'm' },
        }),
        prisma.expense.create({
          data: { typeId: deliveryExpenseType.id, amount: 20 },
        }),
      ]);
      vomExpenseId = vomExpense.id;
      mExpenseId = mExpense.id;
      sharedExpenseId = sharedExpense.id;
    });

    afterAll(async () => {
      await safeDeleteByIds(prisma.order, [mixedOrderId]);
      await safeDeleteByIds(prisma.expense, [
        vomExpenseId,
        mExpenseId,
        sharedExpenseId,
      ]);
    });

    it('scopes revenue to only the vom-brand line items of a mixed order', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: periodStart, brand: 'vom' })
        .expect(200);
      const body = response.body as DashboardResponseBody;

      expect(body.orderCount).toBe(1);
      expect(body.totalRevenue).toBe(300);
      expect(body.totalExpenses).toBe(50);
      expect(body.sharedExpenses).toBe(20);
      expect(body.pendingRevenue).toBe(300);
      expect(body.realizedRevenue).toBe(0);
      expect(body.lostRevenue).toBe(0);
    });

    it('scopes revenue to only the m-brand line items of the same mixed order', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: periodStart, brand: 'm' })
        .expect(200);
      const body = response.body as DashboardResponseBody;

      expect(body.orderCount).toBe(1);
      expect(body.totalRevenue).toBe(200);
      expect(body.totalExpenses).toBe(30);
      expect(body.sharedExpenses).toBe(20);
      expect(body.pendingRevenue).toBe(200);
      expect(body.realizedRevenue).toBe(0);
      expect(body.lostRevenue).toBe(0);
    });

    it('keeps the full order total and all expenses (incl. shared) when no brand filter is given', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: periodStart })
        .expect(200);
      const body = response.body as DashboardResponseBody;

      expect(body.orderCount).toBe(1);
      expect(body.totalRevenue).toBe(500);
      expect(body.totalExpenses).toBe(100);
      expect(body.sharedExpenses).toBeNull();
      expect(body.pendingRevenue).toBe(500);
      expect(body.realizedRevenue).toBe(0);
      expect(body.lostRevenue).toBe(0);
    });
  });

  describe('revenue split by delivery status (realized/pending/lost)', () => {
    let periodStart: string;
    let receivedOrderId: string;
    let refusedOrderId: string;
    let pendingOrderId: string;

    beforeAll(async () => {
      periodStart = new Date().toISOString();

      const [shipmentType, paymentType, deliveryType, stickerType] =
        await Promise.all([
          prisma.shipmentType.findUniqueOrThrow({
            where: { code: 'documents' },
          }),
          prisma.paymentType.findUniqueOrThrow({ where: { code: 'full' } }),
          prisma.deliveryType.findUniqueOrThrow({
            where: { code: 'warehouse' },
          }),
          prisma.productType.findUniqueOrThrow({ where: { code: 'sticker' } }),
        ]);
      const [receivedStatus, refusedStatus] = await Promise.all([
        prisma.shipmentStatus.findUniqueOrThrow({
          where: { code: 'received' },
        }),
        prisma.shipmentStatus.findUniqueOrThrow({ where: { code: 'refused' } }),
      ]);

      const buildOrderData = (
        amount: number,
        recipientLastName: string,
        npWaybillNumber: string,
        shipmentStatusId: string | null,
      ) => ({
        shipmentTypeId: shipmentType.id,
        paymentTypeId: paymentType.id,
        totalAmount: amount,
        items: [
          {
            productId: null,
            productTypeId: stickerType.id,
            nameSnapshot: 'E2E Dashboard Наліпка (revenue split)',
            photoUrlSnapshot: null,
            price: amount,
            isPromo: false,
            quantity: 1,
            subtotal: amount,
          },
        ],
        senderId: seededSenderId,
        senderAddressRef: 'e2e-dashboard-address-ref',
        recipient: {
          phone: '+380503333333',
          lastName: recipientLastName,
          firstName: 'Розподіл',
          middleName: null,
        },
        deliveryTypeId: deliveryType.id,
        deliveryDetails: {
          cityRef: 'e2e-city-ref',
          warehouseRef: 'e2e-warehouse-ref',
        },
        npWaybillNumber,
        shipmentStatusId,
      });

      const [receivedOrder, refusedOrder, pendingOrder] = await Promise.all([
        prisma.order.create({
          data: buildOrderData(
            300,
            'Отримано',
            'e2e-dashboard-received-waybill',
            receivedStatus.id,
          ),
        }),
        prisma.order.create({
          data: buildOrderData(
            70,
            'Відмовлено',
            'e2e-dashboard-refused-waybill',
            refusedStatus.id,
          ),
        }),
        prisma.order.create({
          data: buildOrderData(
            40,
            'НеСинхронізовано',
            'e2e-dashboard-pending-waybill',
            null,
          ),
        }),
      ]);
      receivedOrderId = receivedOrder.id;
      refusedOrderId = refusedOrder.id;
      pendingOrderId = pendingOrder.id;
    });

    afterAll(async () => {
      await safeDeleteByIds(prisma.order, [
        receivedOrderId,
        refusedOrderId,
        pendingOrderId,
      ]);
    });

    it('buckets received/refused/unsynced orders into realized/lost/pending revenue', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: periodStart })
        .expect(200);
      const body = response.body as DashboardResponseBody;

      expect(body.orderCount).toBe(3);
      expect(body.realizedRevenue).toBe(300);
      expect(body.lostRevenue).toBe(70);
      expect(body.pendingRevenue).toBe(40);
      expect(body.totalRevenue).toBe(410);
      expect(body.totalRevenue).toBe(
        body.realizedRevenue + body.pendingRevenue + body.lostRevenue,
      );
      expect(body.profit).toBe(body.realizedRevenue - body.totalExpenses);
    });
  });
});
