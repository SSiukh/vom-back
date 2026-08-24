import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
import { Public } from './decorators/public.decorator';
import { SkipTwoFaGate } from './decorators/skip-two-fa-gate.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from './guards/jwt-auth.guard';

const AUTH_THROTTLE_TTL_MS = 60_000;
const AUTH_THROTTLE_LIMIT = 10;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFaService: TwoFaService,
  ) {}

  @Public()
  @Throttle({
    default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
  })
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({
    default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
  })
  @Post('2fa/verify-login')
  verifyLogin(@Body() dto: VerifyLoginDto): Promise<TokenPairResponseDto> {
    return this.authService.verifyLogin(dto);
  }

  @Public()
  @Throttle({
    default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
  })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<TokenPairResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.logout(user.id);
  }

  @SkipTwoFaGate()
  @Post('2fa/setup')
  setupTwoFa(@CurrentUser() user: RequestUser): Promise<SetupTwoFaResponseDto> {
    return this.twoFaService.setup(user.id);
  }

  @SkipTwoFaGate()
  @Post('2fa/confirm')
  confirmTwoFa(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmTwoFaDto,
  ): Promise<ConfirmTwoFaResponseDto> {
    return this.twoFaService.confirm(user.id, dto);
  }

  @SkipTwoFaGate()
  @Get('2fa/status')
  getTwoFaStatus(
    @CurrentUser() user: RequestUser,
  ): Promise<TwoFaStatusResponseDto> {
    return this.twoFaService.getStatus(user.id);
  }
}
