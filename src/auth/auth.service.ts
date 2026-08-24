import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TwoFaService } from './two-fa.service';
import { LoginAttemptTrackerService } from './login-attempt-tracker.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const PENDING_TWO_FA_TOKEN_TTL = '5m';
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$okLXFJzsJGXYwqbl/7E2ow$CK/a2uEt+dTXfn4lHe3slbP9sU9ZLFMqDxiASwALZDI';

interface TokenPayload {
  sub: string;
  type: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly twoFaService: TwoFaService,
    private readonly loginAttempts: LoginAttemptTrackerService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    const lockKey = user?.id ?? `login:${dto.login}`;
    if (this.loginAttempts.isLocked(lockKey)) {
      throw new HttpException(
        'Too many failed attempts — try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordValid = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      dto.password,
    );
    if (!user || !passwordValid) {
      this.loginAttempts.recordFailure(lockKey);
      throw new UnauthorizedException('Invalid login or password');
    }
    this.loginAttempts.reset(lockKey);

    if (user.twoFaEnabled) {
      const pendingToken = await this.jwtService.signAsync(
        { sub: user.id, type: 'pending-2fa', jti: randomUUID() },
        { expiresIn: PENDING_TWO_FA_TOKEN_TTL },
      );
      return { requiresTwoFa: true, pendingToken };
    }

    const tokens = await this.issueTokenPair(user.id);
    return { requiresTwoFa: false, ...tokens };
  }

  async verifyLogin(dto: VerifyLoginDto): Promise<TokenPairResponseDto> {
    const payload = await this.verifyToken(dto.pendingToken, 'pending-2fa');
    if (this.loginAttempts.isLocked(payload.sub)) {
      throw new HttpException(
        'Too many failed attempts — try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.twoFaEnabled) {
      throw new UnauthorizedException(
        'Two-factor authentication is not enabled for this user',
      );
    }

    const verified = await this.twoFaService.verifyCodeOrRecovery(
      user,
      dto.code,
    );
    if (!verified) {
      this.loginAttempts.recordFailure(payload.sub);
      throw new UnauthorizedException('Invalid two-factor code');
    }
    this.loginAttempts.reset(payload.sub);

    return this.issueTokenPair(user.id);
  }

  async refresh(dto: RefreshDto): Promise<TokenPairResponseDto> {
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
      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used',
      );
    }

    return this.issueTokenPair(payload.sub);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private async issueTokenPair(userId: string): Promise<TokenPairResponseDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, type: 'access', jti: randomUUID() },
        { expiresIn: ACCESS_TOKEN_TTL },
      ),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh', jti: randomUUID() },
        { expiresIn: REFRESH_TOKEN_TTL },
      ),
    ]);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: this.hashToken(refreshToken) },
    });

    return { accessToken, refreshToken };
  }

  private async verifyToken(
    token: string,
    expectedType: string,
  ): Promise<TokenPayload> {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== expectedType) {
      throw new UnauthorizedException('Invalid token type');
    }

    return payload;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
