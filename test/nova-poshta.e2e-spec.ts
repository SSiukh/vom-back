import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NovaPoshtaService } from '../src/nova-poshta/nova-poshta.service';
import { EncryptionService } from '../src/shared/encryption/encryption.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface AddressOptionBody {
  ref: string;
  description: string;
}

describe('Nova Poshta address lookups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let activeSenderId: string | undefined;
  let accessToken: string;
  let authUserId: string;

  const cityResult = [{ ref: 'city-ref', description: 'Київ' }];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NovaPoshtaService)
      .useValue({
        searchCities: jest.fn().mockResolvedValue(cityResult),
        getWarehouses: jest.fn().mockResolvedValue([]),
        getStreets: jest.fn().mockResolvedValue([]),
        getPostomats: jest.fn().mockResolvedValue([]),
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
      'e2e-nova-poshta-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    await prisma.sender.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const sender = await prisma.sender.create({
      data: {
        apiKey: encryption.encrypt('e2e-raw-api-key'),
        fullName: 'E2E Активний Відправник',
        phone: '380000000001',
        npCounterpartyRef: 'e2e-np-counterparty-ref',
        npContactPersonRef: 'e2e-np-contact-person-ref',
        addresses: [],
        isActive: true,
        isDeactivated: false,
      },
    });
    activeSenderId = sender.id;
  });

  afterAll(async () => {
    if (activeSenderId) {
      await prisma.sender.deleteMany({ where: { id: activeSenderId } });
    }
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('searches cities using the active sender api key', async () => {
    const response = await request(app.getHttpServer())
      .get('/nova-poshta/cities')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ query: 'Київ' })
      .expect(200);
    const body = response.body as AddressOptionBody[];

    expect(body).toEqual(cityResult);
  });

  it('rejects a request missing the required query param', () => {
    return request(app.getHttpServer())
      .get('/nova-poshta/cities')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('rejects with 400 when no active sender is configured', async () => {
    await prisma.sender.update({
      where: { id: activeSenderId },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .get('/nova-poshta/cities')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ query: 'Київ' })
      .expect(400);

    await prisma.sender.update({
      where: { id: activeSenderId },
      data: { isActive: true },
    });
  });
});
