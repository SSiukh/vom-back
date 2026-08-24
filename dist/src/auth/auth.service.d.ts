import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TwoFaService } from './two-fa.service';
import { LoginAttemptTrackerService } from './login-attempt-tracker.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly twoFaService;
    private readonly loginAttempts;
    constructor(prisma: PrismaService, jwtService: JwtService, twoFaService: TwoFaService, loginAttempts: LoginAttemptTrackerService);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    verifyLogin(dto: VerifyLoginDto): Promise<TokenPairResponseDto>;
    refresh(dto: RefreshDto): Promise<TokenPairResponseDto>;
    logout(userId: string): Promise<void>;
    private issueTokenPair;
    private verifyToken;
    private hashToken;
}
