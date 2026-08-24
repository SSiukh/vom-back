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

  const fetchedAddresses = [
    {
      ref: 'e2e-address-ref',
      description: 'E2E, вул. Тестова, 1',
      cityRef: 'e2e-city-ref',
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NovaPoshtaService)
      .useValue({
        verifySender: jest.fn().mockResolvedValue(verifiedResult),
        getSenderAddresses: jest.fn().mockResolvedValue(fetchedAddresses),
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
      .send({ apiKey: 'e2e-fake-key', fullName: 'Should Be Ignored' })
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

  it('creates a sender using Nova Poshta-verified data', async () => {
    const response = await request(app.getHttpServer())
      .post('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ apiKey: 'e2e-fake-key' })
      .expect(201);
    const body = response.body as SenderResponseBody;

    expect(body).toMatchObject({
      fullName: verifiedResult.fullName,
      phone: verifiedResult.phone,
      isActive: false,
    });
    expect(body.apiKey).toBeUndefined();

    createdIds.push(body.id);
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
