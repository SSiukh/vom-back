import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFaService } from './two-fa.service';
import { OtpService } from './otp.service';
import { LoginAttemptTrackerService } from './login-attempt-tracker.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EncryptionModule } from '../shared/encryption/encryption.module';

@Module({
  imports: [
    EncryptionModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be set');
        }

        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFaService,
    OtpService,
    LoginAttemptTrackerService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
