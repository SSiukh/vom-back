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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const argon2 = require("argon2");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const two_fa_service_1 = require("./two-fa.service");
const login_attempt_tracker_service_1 = require("./login-attempt-tracker.service");
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const PENDING_TWO_FA_TOKEN_TTL = '5m';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$okLXFJzsJGXYwqbl/7E2ow$CK/a2uEt+dTXfn4lHe3slbP9sU9ZLFMqDxiASwALZDI';
let AuthService = class AuthService {
    prisma;
    jwtService;
    twoFaService;
    loginAttempts;
    constructor(prisma, jwtService, twoFaService, loginAttempts) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.twoFaService = twoFaService;
        this.loginAttempts = loginAttempts;
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { login: dto.login },
        });
        const lockKey = user?.id ?? `login:${dto.login}`;
        if (this.loginAttempts.isLocked(lockKey)) {
            throw new common_1.HttpException('Too many failed attempts — try again later', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const passwordValid = await argon2.verify(user?.passwordHash ?? DUMMY_PASSWORD_HASH, dto.password);
        if (!user || !passwordValid) {
            this.loginAttempts.recordFailure(lockKey);
            throw new common_1.UnauthorizedException('Invalid login or password');
        }
        this.loginAttempts.reset(lockKey);
        if (user.twoFaEnabled) {
            const pendingToken = await this.jwtService.signAsync({ sub: user.id, type: 'pending-2fa', jti: (0, crypto_1.randomUUID)() }, { expiresIn: PENDING_TWO_FA_TOKEN_TTL });
            return { requiresTwoFa: true, pendingToken };
        }
        const tokens = await this.issueTokenPair(user.id);
        return { requiresTwoFa: false, ...tokens };
    }
    async verifyLogin(dto) {
        const payload = await this.verifyToken(dto.pendingToken, 'pending-2fa');
        if (this.loginAttempts.isLocked(payload.sub)) {
            throw new common_1.HttpException('Too many failed attempts — try again later', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user || !user.twoFaEnabled) {
            throw new common_1.UnauthorizedException('Two-factor authentication is not enabled for this user');
        }
        const verified = await this.twoFaService.verifyCodeOrRecovery(user, dto.code);
        if (!verified) {
            this.loginAttempts.recordFailure(payload.sub);
            throw new common_1.UnauthorizedException('Invalid two-factor code');
        }
        this.loginAttempts.reset(payload.sub);
        return this.issueTokenPair(user.id);
    }
    async refresh(dto) {
        const payload = await this.verifyToken(dto.refreshToken, 'refresh');
        const { count } = await this.prisma.user.updateMany({
            where: {
                id: payload.sub,
                refreshTokenHash: this.hashToken(dto.refreshToken),
            },
            data: { refreshTokenHash: null },
        });
        if (count === 0) {
            await this.prisma.user.updateMany({
                where: { id: payload.sub },
                data: { refreshTokenHash: null },
            });
            throw new common_1.UnauthorizedException('Refresh token is invalid or has already been used');
        }
        return this.issueTokenPair(payload.sub);
    }
    async logout(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
    }
    async issueTokenPair(userId) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, type: 'access', jti: (0, crypto_1.randomUUID)() }, { expiresIn: ACCESS_TOKEN_TTL }),
            this.jwtService.signAsync({ sub: userId, type: 'refresh', jti: (0, crypto_1.randomUUID)() }, { expiresIn: REFRESH_TOKEN_TTL }),
        ]);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: this.hashToken(refreshToken) },
        });
        return { accessToken, refreshToken };
    }
    async verifyToken(token, expectedType) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        if (payload.type !== expectedType) {
            throw new common_1.UnauthorizedException('Invalid token type');
        }
        return payload;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        two_fa_service_1.TwoFaService,
        login_attempt_tracker_service_1.LoginAttemptTrackerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map