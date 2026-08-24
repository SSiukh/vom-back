import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { OtpService } from './otp.service';
import { ConfirmTwoFaDto } from './dto/confirm-two-fa.dto';
import { ConfirmTwoFaResponseDto } from './dto/confirm-two-fa-response.dto';
import { SetupTwoFaResponseDto } from './dto/setup-two-fa-response.dto';
import { TwoFaStatusResponseDto } from './dto/two-fa-status-response.dto';
import { User } from './entities/user.entity';

const ISSUER = 'VOM Systems';
const RECOVERY_CODE_COUNT = 10;
const TOTP_EPOCH_TOLERANCE_SECONDS = 30;

@Injectable()
export class TwoFaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly otp: OtpService,
  ) {}

  async setup(userId: string): Promise<SetupTwoFaResponseDto> {
    const user = await this.findUserOrThrow(userId);

    const secret = await this.otp.generateSecret();
    const uri = await this.otp.generateUri({
      issuer: ISSUER,
      label: user.login,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: this.encryption.encrypt(secret) },
    });

    return { qrCodeDataUrl, secret };
  }

  async confirm(
    userId: string,
    dto: ConfirmTwoFaDto,
  ): Promise<ConfirmTwoFaResponseDto> {
    const user = await this.findUserOrThrow(userId);
    if (!user.twoFaSecret) {
      throw new BadRequestException(
        'Start 2FA setup (POST /auth/2fa/setup) first',
      );
    }

    const isValid = await this.verifyTotp(user.twoFaSecret, dto.code);
    if (!isValid) {
      throw new BadRequestException('Invalid confirmation code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFaEnabled: true,
        twoFaRecoveryCodes: recoveryCodes.map((code) =>
          this.hashRecoveryCode(code),
        ),
      },
    });

    return { recoveryCodes };
  }

  async getStatus(userId: string): Promise<TwoFaStatusResponseDto> {
    const user = await this.findUserOrThrow(userId);

    return { twoFaEnabled: user.twoFaEnabled };
  }

  async verifyCodeOrRecovery(user: User, code: string): Promise<boolean> {
    if (user.twoFaSecret && (await this.verifyTotp(user.twoFaSecret, code))) {
      return true;
    }

    const hashedCode = this.hashRecoveryCode(code);
    if (!user.twoFaRecoveryCodes.includes(hashedCode)) {
      return false;
    }

    const remainingCodes = user.twoFaRecoveryCodes.filter(
      (storedHash) => storedHash !== hashedCode,
    );
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, twoFaRecoveryCodes: { has: hashedCode } },
      data: { twoFaRecoveryCodes: { set: remainingCodes } },
    });

    return count > 0;
  }

  private async verifyTotp(
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    const secret = this.encryption.decrypt(encryptedSecret);
    try {
      const result = await this.otp.verify({
        secret,
        token: code,
        epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
      });
      return result.valid;
    } catch {
      return false;
    }
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const raw = randomBytes(6).toString('hex').toUpperCase();
      return `${raw.slice(0, 6)}-${raw.slice(6, 12)}`;
    });
  }

  private hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
