import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NovaPoshtaService } from '../src/nova-poshta/nova-poshta.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface SenderResponseBody {
  id: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  apiKey?: string;
}

interface ListSendersResponseBody {
  items: SenderResponseBody[];
  total: number;
}

interface SenderVerificationResponseBody {
  fullName: string;
  phone: string;
}

describe('Senders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  const createdIds: string[] = [];

  const verifiedResult = {
    counterpartyRef: 'e2e-counterparty-ref',
    contactPersonRef: 'e2e-contact-person-ref',
    fullName: 'E2E Тестовий Відправник',
    phone: '380000000000',
  };

  const fetchedWarehouses = [
    { ref: 'e2e-warehouse-ref', description: 'E2E Відділення №1' },
    { ref: 'e2e-warehouse-ref-2', description: 'E2E Відділення №2' },
  ];

  const createBody = {
    apiKey: 'e2e-fake-key',
    cityRef: 'e2e-city-ref',
    warehouseRef: 'e2e-warehouse-ref',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NovaPoshtaService)
      .useValue({
        verifySender: jest.fn().mockResolvedValue(verifiedResult),
        getWarehouses: jest.fn().mockResolvedValue(fetchedWarehouses),
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

    const authUser = await createAuthenticatedUser(
      app,
      prisma,
      'e2e-senders-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.sender.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('rejects client-supplied identity fields on create (DTO whitelist)', () => {
    return request(app.getHttpServer())
      .post('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...createBody, fullName: 'Should Be Ignored' })
      .expect(400);
  });

  it('rejects a warehouseRef that Nova Poshta does not return for the given city', () => {
    return request(app.getHttpServer())
      .post('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...createBody, warehouseRef: 'unknown-warehouse-ref' })
      .expect(400);
  });

  it('verifies an API key without persisting anything', async () => {
    const response = await request(app.getHttpServer())
      .post('/senders/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ apiKey: 'e2e-fake-key' })
      .expect(201);
    const body = response.body as SenderVerificationResponseBody;

    expect(body).toEqual({
      fullName: verifiedResult.fullName,
      phone: verifiedResult.phone,
    });
  });

  it('creates a sender using Nova Poshta-verified data and the chosen warehouse', async () => {
    const response = await request(app.getHttpServer())
      .post('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createBody)
      .expect(201);
    const body = response.body as SenderResponseBody;

    expect(body).toMatchObject({
      fullName: verifiedResult.fullName,
      phone: verifiedResult.phone,
      isActive: false,
    });
    expect(body.apiKey).toBeUndefined();

    createdIds.push(body.id);

    const addressesResponse = await request(app.getHttpServer())
      .get(`/senders/${body.id}/addresses`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(addressesResponse.body).toEqual([
      { npAddressRef: 'e2e-warehouse-ref', description: 'E2E Відділення №1' },
    ]);
  });

  it('lists the created sender', async () => {
    const response = await request(app.getHttpServer())
      .get('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ListSendersResponseBody;

    expect(body.items.some((item) => createdIds.includes(item.id))).toBe(true);
  });

  it('activates the sender', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .patch(`/senders/${id}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as SenderResponseBody;

    expect(body.isActive).toBe(true);
  });

  it('refreshes the sender data from Nova Poshta', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .patch(`/senders/${id}/refresh`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as SenderResponseBody;

    expect(body).toMatchObject({
      fullName: verifiedResult.fullName,
      phone: verifiedResult.phone,
    });
  });

  it('changes the pickup warehouse', async () => {
    const [id] = createdIds;

    await request(app.getHttpServer())
      .patch(`/senders/${id}/warehouse`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cityRef: 'e2e-city-ref', warehouseRef: 'e2e-warehouse-ref-2' })
      .expect(200);

    const addressesResponse = await request(app.getHttpServer())
      .get(`/senders/${id}/addresses`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(addressesResponse.body).toEqual([
      {
        npAddressRef: 'e2e-warehouse-ref-2',
        description: 'E2E Відділення №2',
      },
    ]);
  });

  it('rejects a malformed id with a 400, not a raw Prisma error', () => {
    return request(app.getHttpServer())
      .patch('/senders/not-a-valid-object-id/activate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('deactivates the sender and it disappears from the list', async () => {
    const [id] = createdIds;

    await request(app.getHttpServer())
      .delete(`/senders/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const response = await request(app.getHttpServer())
      .get('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ListSendersResponseBody;

    expect(body.items.some((item) => item.id === id)).toBe(false);
  });
});
