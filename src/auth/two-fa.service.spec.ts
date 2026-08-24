import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { TwoFaService } from './two-fa.service';
import { OtpService } from './otp.service';
import { User } from './entities/user.entity';

jest.mock('qrcode');

describe('TwoFaService', () => {
  let service: TwoFaService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  };
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };
  let otp: {
    generateSecret: jest.Mock;
    generateUri: jest.Mock;
    verify: jest.Mock;
  };

  const storedUser: User = {
    id: 'user-id',
    login: 'admin',
    passwordHash: 'hash',
    twoFaSecret: 'encrypted-secret',
    twoFaEnabled: false,
    twoFaRecoveryCodes: [],
    refreshTokenHash: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(storedUser),
        update: jest.fn().mockResolvedValue(storedUser),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    encryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-secret'),
      decrypt: jest.fn().mockReturnValue('raw-secret'),
    };
    otp = {
      generateSecret: jest.fn().mockResolvedValue('raw-secret'),
      generateUri: jest.fn().mockResolvedValue('otpauth://totp/test'),
      verify: jest.fn().mockResolvedValue({ valid: true }),
    };
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,xxx',
    );

    const module = await Test.createTestingModule({
      providers: [
        TwoFaService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: OtpService, useValue: otp },
      ],
    }).compile();

    service = module.get(TwoFaService);
  });

  describe('setup', () => {
    it('generates and stores an encrypted secret, returns the QR + raw secret', async () => {
      const result = await service.setup('user-id');

      expect(encryption.encrypt).toHaveBeenCalledWith('raw-secret');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { twoFaSecret: 'encrypted-secret' },
      });
      expect(result).toEqual({
        qrCodeDataUrl: 'data:image/png;base64,xxx',
        secret: 'raw-secret',
      });
    });

    it('throws NotFoundException for a missing user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.setup('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirm', () => {
    it('rejects if setup was never started (no secret)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaSecret: null,
      });

      await expect(
        service.confirm('user-id', { code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid confirmation code', async () => {
      otp.verify.mockResolvedValueOnce({ valid: false });

      await expect(
        service.confirm('user-id', { code: '000000' }),
      ).rejects.toThrow('Invalid confirmation code');
    });

    it('enables 2FA and returns 10 hashed-and-stored recovery codes', async () => {
      const result = await service.confirm('user-id', { code: '123456' });

      expect(result.recoveryCodes).toHaveLength(10);
      const [[{ data }]] = prisma.user.update.mock.calls as [
        [
          {
            data: { twoFaEnabled: boolean; twoFaRecoveryCodes: string[] };
          },
        ],
      ];
      expect(data.twoFaEnabled).toBe(true);
      expect(data.twoFaRecoveryCodes).toHaveLength(10);
      expect(data.twoFaRecoveryCodes).not.toEqual(result.recoveryCodes);
    });
  });

  describe('getStatus', () => {
    it('returns the current twoFaEnabled flag', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...storedUser,
        twoFaEnabled: true,
      });

      const result = await service.getStatus('user-id');

      expect(result).toEqual({ twoFaEnabled: true });
    });
  });

  describe('verifyCodeOrRecovery', () => {
    it('accepts a valid TOTP code', async () => {
      const result = await service.verifyCodeOrRecovery(storedUser, '123456');

      expect(result).toBe(true);
    });

    it('falls back to and consumes a matching recovery code when TOTP fails', async () => {
      otp.verify.mockResolvedValueOnce({ valid: false });
      const recoveryCode = 'ABCDEF-123456';
      const hashedCode = createHash('sha256')
        .update(recoveryCode)
        .digest('hex');
      const userWithRecovery = {
        ...storedUser,
        twoFaRecoveryCodes: [hashedCode, 'other-hash'],
      };

      const result = await service.verifyCodeOrRecovery(
        userWithRecovery,
        recoveryCode,
      );

      expect(result).toBe(true);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-id', twoFaRecoveryCodes: { has: hashedCode } },
        data: { twoFaRecoveryCodes: { set: ['other-hash'] } },
      });
    });

    it('rejects a recovery code already consumed by a concurrent request', async () => {
      otp.verify.mockResolvedValueOnce({ valid: false });
      prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
      const recoveryCode = 'ABCDEF-123456';
      const hashedCode = createHash('sha256')
        .update(recoveryCode)
        .digest('hex');
      const userWithRecovery = {
        ...storedUser,
        twoFaRecoveryCodes: [hashedCode],
      };

      const result = await service.verifyCodeOrRecovery(
        userWithRecovery,
        recoveryCode,
      );

      expect(result).toBe(false);
    });

    it('rejects when neither TOTP nor any recovery code matches', async () => {
      otp.verify.mockResolvedValueOnce({ valid: false });

      const result = await service.verifyCodeOrRecovery(
        storedUser,
        'wrong-code',
      );

      expect(result).toBe(false);
    });
  });
});
