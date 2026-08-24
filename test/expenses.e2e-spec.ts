import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface ExpenseResponseBody {
  id: string;
  typeId: string;
  name: string | null;
  amount: number;
}

interface ListExpensesResponseBody {
  items: ExpenseResponseBody[];
  total: number;
}

describe('Expenses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  const createdIds: string[] = [];
  let deliveryTypeId: string;
  let otherTypeId: string;

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
      'e2e-expenses-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    const deliveryType = await prisma.expenseType.findUniqueOrThrow({
      where: { code: 'delivery' },
    });
    deliveryTypeId = deliveryType.id;

    const otherType = await prisma.expenseType.findUniqueOrThrow({
      where: { code: 'other' },
    });
    otherTypeId = otherType.id;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.expense.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('rejects creating an "Інше" expense without a name', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ typeId: otherTypeId, amount: 100 })
      .expect(400);
  });

  it('creates an expense that does not require a name', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ typeId: deliveryTypeId, amount: 250 })
      .expect(201);
    const body = response.body as ExpenseResponseBody;

    expect(body).toMatchObject({ typeId: deliveryTypeId, amount: 250 });
    expect(body.name).toBeNull();

    createdIds.push(body.id);
  });

  it('creates an "Інше" expense with a name', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ typeId: otherTypeId, name: 'E2E Оренда', amount: 500 })
      .expect(201);
    const body = response.body as ExpenseResponseBody;

    expect(body).toMatchObject({
      typeId: otherTypeId,
      name: 'E2E Оренда',
      amount: 500,
    });

    createdIds.push(body.id);
  });

  it('lists the created expenses with pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 1, pageSize: 10 })
      .expect(200);
    const body = response.body as ListExpensesResponseBody;

    expect(body.items.some((item) => createdIds.includes(item.id))).toBe(true);
  });

  it('gets expense detail by id', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .get(`/expenses/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ExpenseResponseBody;

    expect(body.id).toBe(id);
  });

  it('rejects a malformed expense id with 400', () => {
    return request(app.getHttpServer())
      .get('/expenses/not-a-valid-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('404s for a well-formed but nonexistent expense id', () => {
    return request(app.getHttpServer())
      .get('/expenses/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('updates an expense amount', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .patch(`/expenses/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 300 })
      .expect(200);
    const body = response.body as ExpenseResponseBody;

    expect(body.amount).toBe(300);
  });

  it('nulls out the name when switching an expense away from "Інше"', async () => {
    const [, otherExpenseId] = createdIds;

    const response = await request(app.getHttpServer())
      .patch(`/expenses/${otherExpenseId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ typeId: deliveryTypeId })
      .expect(200);
    const body = response.body as ExpenseResponseBody;

    expect(body).toMatchObject({ typeId: deliveryTypeId, name: null });
  });

  it('deletes an expense', async () => {
    const id = createdIds.pop();

    await request(app.getHttpServer())
      .delete(`/expenses/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/expenses/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
