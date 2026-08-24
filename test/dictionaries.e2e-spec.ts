import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAuthenticatedUser } from './support/auth-helper';

interface DictionaryItemBody {
  id: string;
  code: string;
  label: string;
}

describe('Dictionaries (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;

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
      'e2e-dictionaries-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: authUserId } });
    await app.close();
  });

  it('returns the seeded product types', async () => {
    const response = await request(app.getHttpServer())
      .get('/dictionaries/product-types')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as DictionaryItemBody[];

    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body.some((item) => item.code === 'sticker')).toBe(true);
    expect(body.some((item) => item.code === 'custom_sticker')).toBe(true);
  });

  it('returns the seeded shipment statuses', async () => {
    const response = await request(app.getHttpServer())
      .get('/dictionaries/shipment-statuses')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as DictionaryItemBody[];

    expect(body.some((item) => item.code === 'delivered')).toBe(true);
  });
});
