import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { loadEsm } from 'load-esm';
import type * as Otplib from 'otplib';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';

const TEST_PASSWORD = 'e2e-test-password-123';

export function uniqueLogin(base: string): string {
  return `${base}-${randomUUID()}`;
}

interface LoginResponseBody {
  requiresTwoFa: boolean;
  accessToken?: string;
}

interface SetupTwoFaResponseBody {
  secret: string;
}

export interface AuthenticatedTestUser {
  userId: string;
  accessToken: string;
}

export async function createAuthenticatedUser(
  app: INestApplication<App>,
  prisma: PrismaService,
  login: string,
): Promise<AuthenticatedTestUser> {
  const uniqueLoginValue = uniqueLogin(login);
  const passwordHash = await argon2.hash(TEST_PASSWORD);
  const user = await prisma.user.create({
    data: {
      login: uniqueLoginValue,
      passwordHash,
      twoFaEnabled: false,
      twoFaSecret: null,
      twoFaRecoveryCodes: [],
      refreshTokenHash: null,
    },
  });

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ login: uniqueLoginValue, password: TEST_PASSWORD })
    .expect(201);
  const accessToken = (loginResponse.body as LoginResponseBody)
    .accessToken as string;

  const setupResponse = await request(app.getHttpServer())
    .post('/auth/2fa/setup')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(201);
  const { secret } = setupResponse.body as SetupTwoFaResponseBody;

  const { generate } = await loadEsm<typeof Otplib>('otplib');
  const code = await generate({ secret });
  await request(app.getHttpServer())
    .post('/auth/2fa/confirm')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ code })
    .expect(201);

  return { userId: user.id, accessToken };
}
