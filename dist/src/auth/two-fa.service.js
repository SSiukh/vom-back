"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFaService = void 0;
const common_1 = require("@nestjs/common");
const QRCode = require("qrcode");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../shared/encryption/encryption.service");
const otp_service_1 = require("./otp.service");
const ISSUER = 'VOM Systems';
const RECOVERY_CODE_COUNT = 10;
const TOTP_EPOCH_TOLERANCE_SECONDS = 30;
let TwoFaService = class TwoFaService {
    prisma;
    encryption;
    otp;
    constructor(prisma, encryption, otp) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.otp = otp;
    }
    async setup(userId) {
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
    async confirm(userId, dto) {
        const user = await this.findUserOrThrow(userId);
        if (!user.twoFaSecret) {
            throw new common_1.BadRequestException('Start 2FA setup (POST /auth/2fa/setup) first');
        }
        const isValid = await this.verifyTotp(user.twoFaSecret, dto.code);
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid confirmation code');
        }
        const recoveryCodes = this.generateRecoveryCodes();
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFaEnabled: true,
                twoFaRecoveryCodes: recoveryCodes.map((code) => this.hashRecoveryCode(code)),
            },
        });
        return { recoveryCodes };
    }
    async getStatus(userId) {
        const user = await this.findUserOrThrow(userId);
        return { twoFaEnabled: user.twoFaEnabled };
    }
    async verifyCodeOrRecovery(user, code) {
        if (user.twoFaSecret && (await this.verifyTotp(user.twoFaSecret, code))) {
            return true;
        }
        const hashedCode = this.hashRecoveryCode(code);
        if (!user.twoFaRecoveryCodes.includes(hashedCode)) {
            return false;
        }
        const remainingCodes = user.twoFaRecoveryCodes.filter((storedHash) => storedHash !== hashedCode);
        const { count } = await this.prisma.user.updateMany({
            where: { id: user.id, twoFaRecoveryCodes: { has: hashedCode } },
            data: { twoFaRecoveryCodes: { set: remainingCodes } },
        });
        return count > 0;
    }
    async verifyTotp(encryptedSecret, code) {
        const secret = this.encryption.decrypt(encryptedSecret);
        try {
            const result = await this.otp.verify({
                secret,
                token: code,
                epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
            });
            return result.valid;
        }
        catch {
            return false;
        }
    }
    generateRecoveryCodes() {
        return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
            const raw = (0, crypto_1.randomBytes)(6).toString('hex').toUpperCase();
            return `${raw.slice(0, 6)}-${raw.slice(6, 12)}`;
        });
    }
    hashRecoveryCode(code) {
        return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
    }
    async findUserOrThrow(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
};
exports.TwoFaService = TwoFaService;
exports.TwoFaService = TwoFaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        otp_service_1.OtpService])
], TwoFaService);
//# sourceMappingURL=two-fa.service.js.map