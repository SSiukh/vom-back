import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { loadEsm } from 'load-esm';
import type * as Otplib from 'otplib';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { uniqueLogin } from './support/auth-helper';
import { safeDeleteByIds } from './support/cleanup-helper';

async function generateTotpCode(secret: string): Promise<string> {
  const { generate } = await loadEsm<typeof Otplib>('otplib');
  return generate({ secret });
}

interface LoginResponseBody {
  requiresTwoFa: boolean;
  pendingToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface TokenPairResponseBody {
  accessToken: string;
  refreshToken: string;
}

interface SetupTwoFaResponseBody {
  qrCodeDataUrl: string;
  secret: string;
}

interface ConfirmTwoFaResponseBody {
  recoveryCodes: string[];
}

describe('Auth + 2FA (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  const login = uniqueLogin('e2e-auth-user');
  const password = 'correct-horse-battery-staple';

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

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        login,
        passwordHash,
        twoFaEnabled: false,
        twoFaSecret: null,
        twoFaRecoveryCodes: [],
        refreshTokenHash: null,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await safeDeleteByIds(prisma.user, [userId]);
    await app.close();
  });

  it('rejects an unauthenticated request to a protected route', () => {
    return request(app.getHttpServer()).get('/senders').expect(401);
  });

  it('rejects an unknown login', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'ghost', password: 'whatever' })
      .expect(401);
  });

  it('rejects a wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in without 2FA and blocks other routes until 2FA is configured', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const loginBody = loginResponse.body as LoginResponseBody;

    expect(loginBody.requiresTwoFa).toBe(false);
    expect(loginBody.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .get('/senders')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  let accessToken: string;
  let recoveryCodes: string[];
  let totpSecret: string;

  it('sets up, confirms 2FA, and then allows access to other routes', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    accessToken = (loginResponse.body as LoginResponseBody)
      .accessToken as string;

    const setupResponse = await request(app.getHttpServer())
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    const setupBody = setupResponse.body as SetupTwoFaResponseBody;
    expect(setupBody.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    totpSecret = setupBody.secret;

    await request(app.getHttpServer())
      .post('/auth/2fa/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' })
      .expect(400);

    const validCode = await generateTotpCode(totpSecret);
    const confirmResponse = await request(app.getHttpServer())
      .post('/auth/2fa/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: validCode })
      .expect(201);
    const confirmBody = confirmResponse.body as ConfirmTwoFaResponseBody;
    expect(confirmBody.recoveryCodes).toHaveLength(10);
    recoveryCodes = confirmBody.recoveryCodes;

    await request(app.getHttpServer())
      .get('/senders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const statusResponse = await request(app.getHttpServer())
      .get('/auth/2fa/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(statusResponse.body).toEqual({ twoFaEnabled: true });
  });

  it('requires two-step login (pendingToken + code) once 2FA is enabled', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const loginBody = loginResponse.body as LoginResponseBody;
    expect(loginBody.requiresTwoFa).toBe(true);
    expect(loginBody.pendingToken).toBeDefined();
    expect(loginBody.accessToken).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken: loginBody.pendingToken, code: '000000' })
      .expect(401);

    const validCode = await generateTotpCode(totpSecret);
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken: loginBody.pendingToken, code: validCode })
      .expect(201);
    const tokens = verifyResponse.body as TokenPairResponseBody;
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('logs in via a recovery code instead of a TOTP code, consuming it', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const pendingToken = (loginResponse.body as LoginResponseBody).pendingToken;

    const [recoveryCode] = recoveryCodes;
    await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken, code: recoveryCode })
      .expect(201);

    const secondLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const secondPendingToken = (secondLoginResponse.body as LoginResponseBody)
      .pendingToken;

    await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken: secondPendingToken, code: recoveryCode })
      .expect(401);
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const pendingToken = (loginResponse.body as LoginResponseBody).pendingToken;
    const validCode = await generateTotpCode(totpSecret);
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken, code: validCode })
      .expect(201);
    const originalRefreshToken = (verifyResponse.body as TokenPairResponseBody)
      .refreshToken;

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(201);
    const rotated = refreshResponse.body as TokenPairResponseBody;
    expect(rotated.refreshToken).not.toBe(originalRefreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotated.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(401);
  });

  it('clears the session on logout', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login, password })
      .expect(201);
    const pendingToken = (loginResponse.body as LoginResponseBody).pendingToken;
    const validCode = await generateTotpCode(totpSecret);
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/2fa/verify-login')
      .send({ pendingToken, code: validCode })
      .expect(201);
    const tokens = verifyResponse.body as TokenPairResponseBody;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });
});
