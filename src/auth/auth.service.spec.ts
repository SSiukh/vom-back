import { HttpException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TwoFaService } from './two-fa.service';
import { LoginAttemptTrackerService } from './login-attempt-tracker.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let twoFaService: { verifyCodeOrRecovery: jest.Mock };
  let loginAttempts: {
    isLocked: jest.Mock;
    recordFailure: jest.Mock;
    reset: jest.Mock;
  };

  const storedUser = {
    id: 'user-id',
    login: 'admin',
    passwordHash: 'hashed-password',
    twoFaEnabled: false,
    twoFaSecret: null,
    twoFaRecoveryCodes: [] as string[],
    refreshTokenHash: null as string | null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(storedUser),
        update: jest.fn().mockResolvedValue(storedUser),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ sub: 'user-id', type: 'refresh' }),
    };
    twoFaService = {
      verifyCodeOrRecovery: jest.fn().mockResolvedValue(true),
    };
    loginAttempts = {
      isLocked: jest.fn().mockReturnValue(false),
      recordFailure: jest.fn(),
      reset: jest.fn(),
    };
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: TwoFaService, useValue: twoFaService },
        { provide: LoginAttemptTrackerService, useValue: loginAttempts },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('rejects an unknown login while still verifying a dummy hash (timing-safe)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ login: 'ghost', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(argon2.verify).toHaveBeenCalled();
    });

    it('rejects an invalid password', async () => {
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ login: 'admin', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(loginAttempts.recordFailure).toHaveBeenCalledWith('user-id');
    });

    it('throws 429 when the account is locked out', async () => {
      loginAttempts.isLocked.mockReturnValueOnce(true);

      await expect(
        service.login({ login: 'admin', password: 'x' }),
      ).rejects.toThrow(HttpException);
    });

    it('returns full tokens directly when 2FA is not enabled', async () => {
      const result = await service.login({
        login: 'admin',
        password: 'correct',
      });

      expect(result.requiresTwoFa).toBe(false);
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.pendingToken).toBeUndefined();
      expect(loginAttempts.reset).toHaveBeenCalledWith('user-id');
    });

    it('issues access and refresh tokens with distinct jti claims', async () => {
      await service.login({ login: 'admin', password: 'correct' });

      const jtis = jwtService.signAsync.mock.calls.map(
        ([payload]: [{ jti: string }]) => payload.jti,
      );
      expect(jtis).toHaveLength(2);
      expect(jtis[0]).toBeDefined();
      expect(jtis[1]).toBeDefined();
      expect(jtis[0]).not.toBe(jtis[1]);
    });

    it('returns only a pendingToken when 2FA is enabled', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaEnabled: true,
      });

      const result = await service.login({
        login: 'admin',
        password: 'correct',
      });

      expect(result.requiresTwoFa).toBe(true);
      expect(result.pendingToken).toBe('signed-token');
      expect(result.accessToken).toBeUndefined();
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-id', type: 'pending-2fa' }),
        { expiresIn: '5m' },
      );
    });
  });

  describe('verifyLogin', () => {
    it('rejects an invalid/expired pendingToken', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));

      await expect(
        service.verifyLogin({ pendingToken: 'bad', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that is not of type pending-2fa', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'access',
      });

      await expect(
        service.verifyLogin({ pendingToken: 'x', code: '123456' }),
      ).rejects.toThrow('Invalid token type');
    });

    it('throws 429 when the account is locked out', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'pending-2fa',
      });
      loginAttempts.isLocked.mockReturnValueOnce(true);

      await expect(
        service.verifyLogin({ pendingToken: 'x', code: '123456' }),
      ).rejects.toThrow(HttpException);
    });

    it('rejects if the user no longer has 2FA enabled', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'pending-2fa',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaEnabled: false,
      });

      await expect(
        service.verifyLogin({ pendingToken: 'x', code: '123456' }),
      ).rejects.toThrow('not enabled');
    });

    it('rejects an invalid code', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'pending-2fa',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaEnabled: true,
      });
      twoFaService.verifyCodeOrRecovery.mockResolvedValueOnce(false);

      await expect(
        service.verifyLogin({ pendingToken: 'x', code: '000000' }),
      ).rejects.toThrow('Invalid two-factor code');
      expect(loginAttempts.recordFailure).toHaveBeenCalledWith('user-id');
    });

    it('issues full tokens on a valid code', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'pending-2fa',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaEnabled: true,
      });

      const result = await service.verifyLogin({
        pendingToken: 'x',
        code: '123456',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(loginAttempts.reset).toHaveBeenCalledWith('user-id');
    });
  });

  describe('refresh', () => {
    it('rejects an invalid/expired refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));

      await expect(service.refresh({ refreshToken: 'bad' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token that is not of type refresh', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-id',
        type: 'access',
      });

      await expect(service.refresh({ refreshToken: 'x' })).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('rotates the token pair atomically when the hash matches', async () => {
      const validRefreshToken = 'valid-refresh-token';
      const expectedHash = createHash('sha256')
        .update(validRefreshToken)
        .digest('hex');

      const result = await service.refresh({
        refreshToken: validRefreshToken,
      });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-id', refreshTokenHash: expectedHash },
        data: { refreshTokenHash: null },
      });
      expect(result.accessToken).toBe('signed-token');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('revokes the session and rejects on refresh-token reuse (hash mismatch)', async () => {
      prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.refresh({ refreshToken: 'reused-token' }),
      ).rejects.toThrow('already been used');
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token hash', async () => {
      await service.logout('user-id');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { refreshTokenHash: null },
      });
    });
  });
});
