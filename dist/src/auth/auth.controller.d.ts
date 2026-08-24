import { AuthService } from './auth.service';
import { TwoFaService } from './two-fa.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SetupTwoFaResponseDto } from './dto/setup-two-fa-response.dto';
import { ConfirmTwoFaDto } from './dto/confirm-two-fa.dto';
import { ConfirmTwoFaResponseDto } from './dto/confirm-two-fa-response.dto';
import { TwoFaStatusResponseDto } from './dto/two-fa-status-response.dto';
import { RequestUser } from './guards/jwt-auth.guard';
export declare class AuthController {
    private readonly authService;
    private readonly twoFaService;
    constructor(authService: AuthService, twoFaService: TwoFaService);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    verifyLogin(dto: VerifyLoginDto): Promise<TokenPairResponseDto>;
    refresh(dto: RefreshDto): Promise<TokenPairResponseDto>;
    logout(user: RequestUser): Promise<void>;
    setupTwoFa(user: RequestUser): Promise<SetupTwoFaResponseDto>;
    confirmTwoFa(user: RequestUser, dto: ConfirmTwoFaDto): Promise<ConfirmTwoFaResponseDto>;
    getTwoFaStatus(user: RequestUser): Promise<TwoFaStatusResponseDto>;
}
