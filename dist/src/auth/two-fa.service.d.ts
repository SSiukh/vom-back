import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { OtpService } from './otp.service';
import { ConfirmTwoFaDto } from './dto/confirm-two-fa.dto';
import { ConfirmTwoFaResponseDto } from './dto/confirm-two-fa-response.dto';
import { SetupTwoFaResponseDto } from './dto/setup-two-fa-response.dto';
import { TwoFaStatusResponseDto } from './dto/two-fa-status-response.dto';
import { User } from './entities/user.entity';
export declare class TwoFaService {
    private readonly prisma;
    private readonly encryption;
    private readonly otp;
    constructor(prisma: PrismaService, encryption: EncryptionService, otp: OtpService);
    setup(userId: string): Promise<SetupTwoFaResponseDto>;
    confirm(userId: string, dto: ConfirmTwoFaDto): Promise<ConfirmTwoFaResponseDto>;
    getStatus(userId: string): Promise<TwoFaStatusResponseDto>;
    verifyCodeOrRecovery(user: User, code: string): Promise<boolean>;
    private verifyTotp;
    private generateRecoveryCodes;
    private hashRecoveryCode;
    private findUserOrThrow;
}
